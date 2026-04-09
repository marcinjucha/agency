// ---------------------------------------------------------------------------
// Multi-provider abstraction (Iteration 2)
// ---------------------------------------------------------------------------

export type {
  ProviderType,
  CalendarProvider,
  CalendarAttendee,
  CalendarInfo,
  GoogleCredentials,
  CalDAVCredentials,
  CalendarConnection,
} from './types'

// New provider-agnostic event types — distinct names to avoid conflict with legacy exports
export type {
  CalendarEvent as ProviderCalendarEvent,
  CalendarEventInput as ProviderCalendarEventInput,
} from './types'

export { PROVIDER_TYPES } from './types'

export { createCalendarProvider } from './providers'
export type { ProviderFactoryOptions } from './providers'

export {
  getConnectionForSurveyLink,
  getConnectionsForTenant,
  getDefaultConnection,
  getConnectionById,
} from './connection-manager'

// Legacy exports removed in Iteration 4 (multi-provider migration complete).
// token-manager.ts, events.ts, oauth.ts are still used internally by providers
// but are no longer part of the public API.
