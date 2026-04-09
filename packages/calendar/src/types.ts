/**
 * Multi-provider Calendar Types
 *
 * Defines the CalendarProvider interface and credential shapes
 * for Google and CalDAV providers. Provider implementations
 * return Result types (neverthrow) — callers decide error handling.
 */

import type { ResultAsync } from 'neverthrow'

// ---------------------------------------------------------------------------
// Provider type (as const → derived union)
// ---------------------------------------------------------------------------

export const PROVIDER_TYPES = {
  google: 'google',
  caldav: 'caldav',
} as const

export type ProviderType = (typeof PROVIDER_TYPES)[keyof typeof PROVIDER_TYPES]

// ---------------------------------------------------------------------------
// Calendar event types (provider-agnostic)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  /** Google event ID or CalDAV VEVENT UID */
  id: string
  summary: string
  description?: string
  /** ISO 8601 datetime */
  start: string
  /** ISO 8601 datetime */
  end: string
  attendees?: CalendarAttendee[]
}

export interface CalendarAttendee {
  email: string
  name?: string
}

export interface CalendarEventInput {
  summary: string
  description?: string
  /** ISO 8601 datetime */
  start: string
  /** ISO 8601 datetime */
  end: string
  timeZone?: string
  attendees?: CalendarAttendee[]
}

export interface CalendarInfo {
  /** CalDAV calendar URL or Google 'primary' */
  url: string
  displayName: string
  color?: string
}

// ---------------------------------------------------------------------------
// CalendarProvider interface
// ---------------------------------------------------------------------------

export interface CalendarProvider {
  getEvents(start: string, end: string): ResultAsync<CalendarEvent[], string>
  createEvent(event: CalendarEventInput): ResultAsync<{ eventId: string }, string>
  deleteEvent(eventId: string): ResultAsync<void, string>
  testConnection(): ResultAsync<{ success: true }, string>
  discoverCalendars(): ResultAsync<CalendarInfo[], string>
}

// ---------------------------------------------------------------------------
// Credential shapes (stored encrypted in calendar_connections.credentials_encrypted)
// ---------------------------------------------------------------------------

export interface GoogleCredentials {
  access_token: string
  refresh_token: string
  /** Unix timestamp in milliseconds (from Google OAuth) */
  expiry_date: number
  scope: string
  email: string
}

export interface CalDAVCredentials {
  /** CalDAV server URL, e.g. https://cal.example.com/dav.php */
  serverUrl: string
  username: string
  password: string
  /** Specific calendar URL discovered via PROPFIND */
  calendarUrl?: string
}

// ---------------------------------------------------------------------------
// CalendarConnection (row from calendar_connections_decrypted view)
// ---------------------------------------------------------------------------

export interface CalendarConnection {
  id: string
  tenantId: string
  userId: string | null
  provider: ProviderType
  displayName: string
  credentials: GoogleCredentials | CalDAVCredentials
  calendarUrl: string | null
  accountIdentifier: string | null
  isDefault: boolean
  isActive: boolean
}
