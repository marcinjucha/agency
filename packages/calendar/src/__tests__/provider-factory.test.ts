/**
 * CalendarProviderFactory tests
 *
 * Verifies that createCalendarProvider routes to correct implementation.
 */

import { describe, it, expect, vi } from 'vitest'

// Mock both providers to verify factory routing
vi.mock('../providers/google', () => ({
  createGoogleProvider: vi.fn().mockReturnValue({ type: 'google-mock' }),
}))

vi.mock('../providers/caldav', () => ({
  createCalDAVProvider: vi.fn().mockReturnValue({ type: 'caldav-mock' }),
}))

import { createCalendarProvider } from '../providers'
import { createGoogleProvider } from '../providers/google'
import { createCalDAVProvider } from '../providers/caldav'
import type { CalendarConnection, GoogleCredentials, CalDAVCredentials } from '../types'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const baseConnection: Omit<CalendarConnection, 'provider' | 'credentials'> = {
  id: 'conn-1',
  tenantId: 'tenant-1',
  userId: null,
  displayName: 'Test',
  calendarUrl: null,
  accountIdentifier: null,
  isDefault: true,
  isActive: true,
}

const googleCreds: GoogleCredentials = {
  access_token: 'tok',
  refresh_token: 'ref',
  expiry_date: Date.now() + 3_600_000,
  scope: 'calendar',
  email: 'test@example.com',
}

const caldavCreds: CalDAVCredentials = {
  serverUrl: 'https://cal.example.com',
  username: 'user',
  password: 'pass',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createCalendarProvider', () => {
  it('creates Google provider for google connection', () => {
    const connection: CalendarConnection = {
      ...baseConnection,
      provider: 'google',
      credentials: googleCreds,
    }

    const onTokenRefresh = vi.fn()
    createCalendarProvider(connection, { onTokenRefresh })

    expect(createGoogleProvider).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      credentials: googleCreds,
      onTokenRefresh,
    })
  })

  it('creates CalDAV provider for caldav connection', () => {
    const connection: CalendarConnection = {
      ...baseConnection,
      provider: 'caldav',
      credentials: caldavCreds,
    }

    createCalendarProvider(connection)

    expect(createCalDAVProvider).toHaveBeenCalledWith(caldavCreds)
  })

  it('throws on unknown provider type', () => {
    const connection = {
      ...baseConnection,
      provider: 'unknown' as any,
      credentials: {},
    }

    expect(() => createCalendarProvider(connection)).toThrow('Unknown calendar provider')
  })
})
