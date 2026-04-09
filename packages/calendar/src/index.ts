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

// ---------------------------------------------------------------------------
// Legacy exports (backward compat during migration — remove in Iteration 4)
// ---------------------------------------------------------------------------

export { getValidAccessToken } from './token-manager'
export type { TokenResult } from './token-manager'
export { refreshAccessToken } from './oauth'
export { createEvent, getEvents } from './events'
export type { CalendarEventInput, CalendarEvent } from './events'
