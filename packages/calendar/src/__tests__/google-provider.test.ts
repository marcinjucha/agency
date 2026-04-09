/**
 * GoogleCalendarProvider tests
 *
 * Mocks googleapis to test provider logic without real API calls.
 * Focuses on: event mapping, token refresh callback, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GoogleCredentials } from '../types'

// ---------------------------------------------------------------------------
// Mock googleapis
// ---------------------------------------------------------------------------

const mockEventsList = vi.fn()
const mockEventsInsert = vi.fn()
const mockEventsDelete = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(() => ({
      events: {
        list: mockEventsList,
        insert: mockEventsInsert,
        delete: mockEventsDelete,
      },
    })),
  },
}))

// Mock oauth.ts refreshAccessToken
vi.mock('../oauth', () => ({
  refreshAccessToken: vi.fn().mockResolvedValue('new-access-token'),
}))

import { createGoogleProvider } from '../providers/google'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function freshCredentials(): GoogleCredentials {
  return {
    access_token: 'valid-token',
    refresh_token: 'refresh-token',
    expiry_date: Date.now() + 3_600_000, // 1 hour from now
    scope: 'https://www.googleapis.com/auth/calendar',
    email: 'test@example.com',
  }
}

function expiredCredentials(): GoogleCredentials {
  return {
    ...freshCredentials(),
    expiry_date: Date.now() - 1000, // expired
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GoogleCalendarProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEvents', () => {
    it('returns mapped events on success', async () => {
      mockEventsList.mockResolvedValue({
        data: {
          items: [
            {
              id: 'evt-1',
              summary: 'Meeting',
              description: 'Team sync',
              start: { dateTime: '2026-04-10T10:00:00+02:00' },
              end: { dateTime: '2026-04-10T11:00:00+02:00' },
              attendees: [{ email: 'a@b.com', displayName: 'Alice' }],
            },
          ],
        },
      })

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.getEvents(
        '2026-04-10T00:00:00Z',
        '2026-04-10T23:59:59Z'
      )

      expect(result.isOk()).toBe(true)
      const events = result._unsafeUnwrap()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        id: 'evt-1',
        summary: 'Meeting',
        description: 'Team sync',
        start: '2026-04-10T10:00:00+02:00',
        end: '2026-04-10T11:00:00+02:00',
        attendees: [{ email: 'a@b.com', name: 'Alice' }],
      })
    })

    it('returns empty array when no events', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } })

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')
      expect(result._unsafeUnwrap()).toEqual([])
    })

    it('returns error on API failure', async () => {
      mockEventsList.mockRejectedValue(new Error('API rate limit exceeded'))

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('API rate limit exceeded')
    })
  })

  describe('createEvent', () => {
    it('returns event ID on success', async () => {
      mockEventsInsert.mockResolvedValue({ data: { id: 'created-evt-1' } })

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.createEvent({
        summary: 'New Meeting',
        start: '2026-04-10T10:00:00Z',
        end: '2026-04-10T11:00:00Z',
      })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({ eventId: 'created-evt-1' })
    })

    it('returns error when no event ID returned', async () => {
      mockEventsInsert.mockResolvedValue({ data: {} })

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.createEvent({
        summary: 'New Meeting',
        start: '2026-04-10T10:00:00Z',
        end: '2026-04-10T11:00:00Z',
      })

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('No event ID')
    })
  })

  describe('deleteEvent', () => {
    it('succeeds on valid event ID', async () => {
      mockEventsDelete.mockResolvedValue({})

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.deleteEvent('evt-1')
      expect(result.isOk()).toBe(true)
    })
  })

  describe('token refresh', () => {
    it('refreshes expired token and calls onTokenRefresh callback', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } })
      const onTokenRefresh = vi.fn()

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: expiredCredentials(),
        onTokenRefresh,
      })

      await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')

      expect(onTokenRefresh).toHaveBeenCalledTimes(1)
      expect(onTokenRefresh).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          access_token: 'new-access-token',
          refresh_token: 'refresh-token',
        })
      )
    })

    it('does not refresh when token is still valid', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } })
      const onTokenRefresh = vi.fn()

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
        onTokenRefresh,
      })

      await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')

      expect(onTokenRefresh).not.toHaveBeenCalled()
    })
  })

  describe('testConnection', () => {
    it('returns success when API responds', async () => {
      mockEventsList.mockResolvedValue({ data: { items: [] } })

      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: freshCredentials(),
      })

      const result = await provider.testConnection()
      expect(result.isOk()).toBe(true)
    })
  })

  describe('discoverCalendars', () => {
    it('returns primary calendar entry with email', async () => {
      const creds = freshCredentials()
      const provider = createGoogleProvider({
        connectionId: 'conn-1',
        credentials: creds,
      })

      const result = await provider.discoverCalendars()
      expect(result.isOk()).toBe(true)
      const calendars = result._unsafeUnwrap()
      expect(calendars).toHaveLength(1)
      expect(calendars[0]).toEqual({
        url: 'primary',
        displayName: 'test@example.com',
        color: '#4285f4',
      })
    })
  })
})
