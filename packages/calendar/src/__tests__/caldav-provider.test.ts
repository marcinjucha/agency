/**
 * CalDAVCalendarProvider tests
 *
 * Mocks tsdav DAVClient to test CalDAV operations and iCalendar parsing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock tsdav
// ---------------------------------------------------------------------------

const mockLogin = vi.fn()
const mockFetchCalendars = vi.fn()
const mockFetchCalendarObjects = vi.fn()
const mockCreateCalendarObject = vi.fn()
const mockDeleteCalendarObject = vi.fn()

vi.mock('tsdav', () => ({
  DAVClient: vi.fn().mockImplementation(() => ({
    login: mockLogin,
    fetchCalendars: mockFetchCalendars,
    fetchCalendarObjects: mockFetchCalendarObjects,
    createCalendarObject: mockCreateCalendarObject,
    deleteCalendarObject: mockDeleteCalendarObject,
  })),
}))

import { createCalDAVProvider } from '../providers/caldav'
import type { CalDAVCredentials } from '../types'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const credentials: CalDAVCredentials = {
  serverUrl: 'https://cal.example.com/dav.php',
  username: 'user',
  password: 'pass',
  calendarUrl: 'https://cal.example.com/dav.php/calendars/user/default/',
}

const sampleVEvent = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:test-uid-123@example.com',
  'DTSTART:20260410T100000Z',
  'DTEND:20260410T110000Z',
  'SUMMARY:Team Meeting',
  'DESCRIPTION:Weekly sync',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CalDAVCalendarProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
  })

  describe('getEvents', () => {
    it('parses VEVENT data into CalendarEvent', async () => {
      mockFetchCalendarObjects.mockResolvedValue([
        { data: sampleVEvent, url: '/events/1.ics', etag: '"abc"' },
      ])

      const provider = createCalDAVProvider(credentials)
      const result = await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')

      expect(result.isOk()).toBe(true)
      const events = result._unsafeUnwrap()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        id: 'test-uid-123@example.com',
        summary: 'Team Meeting',
        description: 'Weekly sync',
        start: '2026-04-10T10:00:00Z',
        end: '2026-04-10T11:00:00Z',
      })
    })

    it('skips entries without VEVENT', async () => {
      mockFetchCalendarObjects.mockResolvedValue([
        { data: 'BEGIN:VCALENDAR\nEND:VCALENDAR', url: '/e.ics' },
      ])

      const provider = createCalDAVProvider(credentials)
      const result = await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')

      expect(result._unsafeUnwrap()).toEqual([])
    })

    it('returns error when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('Authentication failed'))

      const provider = createCalDAVProvider(credentials)
      const result = await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('Authentication failed')
    })
  })

  describe('createEvent', () => {
    it('creates event and returns UID', async () => {
      mockCreateCalendarObject.mockResolvedValue(undefined)

      const provider = createCalDAVProvider(credentials)
      const result = await provider.createEvent({
        summary: 'New Meeting',
        start: '2026-04-10T10:00:00Z',
        end: '2026-04-10T11:00:00Z',
      })

      expect(result.isOk()).toBe(true)
      const { eventId } = result._unsafeUnwrap()
      expect(eventId).toContain('@haloefekt.pl')

      expect(mockCreateCalendarObject).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar: { url: credentials.calendarUrl },
          filename: expect.stringContaining('.ics'),
          iCalString: expect.stringContaining('SUMMARY:New Meeting'),
        })
      )
    })

    it('includes attendees in VEVENT', async () => {
      mockCreateCalendarObject.mockResolvedValue(undefined)

      const provider = createCalDAVProvider(credentials)
      await provider.createEvent({
        summary: 'Meeting',
        start: '2026-04-10T10:00:00Z',
        end: '2026-04-10T11:00:00Z',
        attendees: [{ email: 'alice@example.com', name: 'Alice' }],
      })

      const calledWith = mockCreateCalendarObject.mock.calls[0][0]
      expect(calledWith.iCalString).toContain('ATTENDEE;CN=Alice:mailto:alice@example.com')
    })
  })

  describe('deleteEvent', () => {
    it('finds and deletes event by UID', async () => {
      mockFetchCalendarObjects.mockResolvedValue([
        { data: sampleVEvent, url: '/events/1.ics', etag: '"abc"' },
      ])
      mockDeleteCalendarObject.mockResolvedValue(undefined)

      const provider = createCalDAVProvider(credentials)
      const result = await provider.deleteEvent('test-uid-123@example.com')

      expect(result.isOk()).toBe(true)
      expect(mockDeleteCalendarObject).toHaveBeenCalledWith({
        calendarObject: { url: '/events/1.ics', etag: '"abc"' },
      })
    })

    it('returns error when event not found', async () => {
      mockFetchCalendarObjects.mockResolvedValue([])

      const provider = createCalDAVProvider(credentials)
      const result = await provider.deleteEvent('nonexistent-uid')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('not found')
    })
  })

  describe('testConnection', () => {
    it('succeeds when calendars are found', async () => {
      mockFetchCalendars.mockResolvedValue([
        { url: '/calendars/default/', displayName: 'Default' },
      ])

      const provider = createCalDAVProvider(credentials)
      const result = await provider.testConnection()

      expect(result.isOk()).toBe(true)
    })

    it('fails when no calendars found', async () => {
      mockFetchCalendars.mockResolvedValue([])

      const provider = createCalDAVProvider(credentials)
      const result = await provider.testConnection()

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('No calendars found')
    })
  })

  describe('discoverCalendars', () => {
    it('returns discovered calendars with display names', async () => {
      mockFetchCalendars.mockResolvedValue([
        {
          url: '/dav/calendars/user/work/',
          displayName: 'Work',
          calendarColor: '#ff0000',
        },
        {
          url: '/dav/calendars/user/personal/',
          displayName: 'Personal',
          calendarColor: undefined,
        },
      ])

      const provider = createCalDAVProvider(credentials)
      const result = await provider.discoverCalendars()

      expect(result.isOk()).toBe(true)
      const calendars = result._unsafeUnwrap()
      expect(calendars).toEqual([
        { url: '/dav/calendars/user/work/', displayName: 'Work', color: '#ff0000' },
        { url: '/dav/calendars/user/personal/', displayName: 'Personal', color: undefined },
      ])
    })
  })

  describe('no calendarUrl configured', () => {
    it('returns error when calendarUrl is missing', async () => {
      const noUrlCreds: CalDAVCredentials = {
        serverUrl: 'https://cal.example.com/dav.php',
        username: 'user',
        password: 'pass',
        // no calendarUrl
      }

      const provider = createCalDAVProvider(noUrlCreds)
      const result = await provider.getEvents('2026-04-10T00:00:00Z', '2026-04-10T23:59:59Z')

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('No calendar URL configured')
    })
  })
})
