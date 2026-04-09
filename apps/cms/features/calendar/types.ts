/**
 * Calendar Connection Management Types
 *
 * Re-exports provider types from @agency/calendar.
 * Defines CMS-specific form types for connection management and settings.
 */

// Re-export domain types from shared package
export type {
  CalendarConnection,
  ProviderType,
  CalendarInfo,
  GoogleCredentials,
  CalDAVCredentials,
} from '@agency/calendar'
export { PROVIDER_TYPES } from '@agency/calendar'

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
