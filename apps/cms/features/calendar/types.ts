/**
 * Calendar Connection Management Types
 *
 * Re-exports provider types from @agency/calendar.
 * Defines CMS-specific form types for connection management and settings.
 */

// Re-export type-only imports from shared package (safe for client bundles)
export type {
  CalendarConnection,
  ProviderType,
  CalendarInfo,
  GoogleCredentials,
  CalDAVCredentials,
} from '@agency/calendar'

// Local copy of PROVIDER_TYPES — re-exporting runtime value from @agency/calendar
// pulls googleapis (Node.js) into client bundle, causing "Can't resolve child_process".
// Turbopack barrel re-export bug: runtime re-exports from server-only packages are unsafe.
export const PROVIDER_TYPES = {
  google: 'google',
  caldav: 'caldav',
} as const

// ---------------------------------------------------------------------------
// CalDAV Connection Form
// ---------------------------------------------------------------------------

export interface CalDAVConnectionFormValues {
  serverUrl: string
  username: string
  password: string
  displayName: string
}

// ---------------------------------------------------------------------------
// Calendar Settings (work hours, slot duration, buffer)
// ---------------------------------------------------------------------------

export interface CalendarSettings {
  id: string
  user_id: string
  work_start_hour: number
  work_end_hour: number
  slot_duration_minutes: number
  buffer_minutes: number
  created_at: string
  updated_at: string
}

export interface CalendarSettingsFormValues {
  work_start_hour: number
  work_end_hour: number
  slot_duration_minutes: number
  buffer_minutes: number
}

export const CALENDAR_SETTINGS_DEFAULTS: CalendarSettingsFormValues = {
  work_start_hour: 9,
  work_end_hour: 17,
  slot_duration_minutes: 60,
  buffer_minutes: 15,
}
