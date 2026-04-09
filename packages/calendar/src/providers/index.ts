/**
 * CalendarProviderFactory
 *
 * Creates the correct CalendarProvider based on connection.provider type.
 * Strategy pattern — each provider is a self-contained implementation,
 * the factory selects among them.
 */

import type { CalendarProvider, CalendarConnection, GoogleCredentials } from '../types'
import { createGoogleProvider } from './google'
import { createCalDAVProvider } from './caldav'

export interface ProviderFactoryOptions {
  /** Called when Google token is refreshed — caller persists new credentials to DB */
  onTokenRefresh?: (connectionId: string, newCredentials: GoogleCredentials) => Promise<void>
}

/**
 * Create a CalendarProvider for the given connection.
 *
 * The provider handles all API communication for the specific calendar service.
 * It does NOT perform DB operations — credentials are passed in, token refresh
 * is reported via onTokenRefresh callback.
 */
export function createCalendarProvider(
  connection: CalendarConnection,
  options?: ProviderFactoryOptions
): CalendarProvider {
  switch (connection.provider) {
    case 'google':
      return createGoogleProvider({
        connectionId: connection.id,
        credentials: connection.credentials as GoogleCredentials,
        onTokenRefresh: options?.onTokenRefresh,
      })

    case 'caldav':
      return createCalDAVProvider(connection.credentials as import('../types').CalDAVCredentials)

    default: {
      const _exhaustive: never = connection.provider
      throw new Error(`Unknown calendar provider: ${_exhaustive}`)
    }
  }
}
