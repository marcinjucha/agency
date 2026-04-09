/**
 * GoogleCalendarProvider
 *
 * Wraps existing events.ts / oauth.ts logic behind the CalendarProvider interface.
 * Handles token refresh internally — calls onTokenRefresh callback so the caller
 * can persist new credentials to DB. The provider itself does NO DB operations.
 */

import { google, calendar_v3 } from 'googleapis'
import { ok, ResultAsync, okAsync } from 'neverthrow'
import type {
  CalendarProvider,
  CalendarEvent,
  CalendarEventInput,
  CalendarInfo,
  GoogleCredentials,
} from '../types'
import { refreshAccessToken } from '../oauth'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** 5-minute buffer before token expiry (milliseconds) */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface GoogleProviderOptions {
  connectionId: string
  credentials: GoogleCredentials
  onTokenRefresh?: (connectionId: string, newCredentials: GoogleCredentials) => Promise<void>
}

export function createGoogleProvider(options: GoogleProviderOptions): CalendarProvider {
  let credentials = { ...options.credentials }

  // --- Internal helpers ---

  async function getValidToken(): Promise<string> {
    const now = Date.now()
    const isExpired = credentials.expiry_date - now < TOKEN_EXPIRY_BUFFER_MS

    if (!isExpired) {
      return credentials.access_token
    }

    const newAccessToken = await refreshAccessToken(credentials.refresh_token)
    const newExpiryDate = Date.now() + 3_600_000 // Google tokens expire in 1 hour

    credentials = {
      ...credentials,
      access_token: newAccessToken,
      expiry_date: newExpiryDate,
    }

    if (options.onTokenRefresh) {
      await options.onTokenRefresh(options.connectionId, credentials)
    }

    return newAccessToken
  }

  function getCalendarClient(accessToken: string): calendar_v3.Calendar {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    return google.calendar({ version: 'v3', auth }) as calendar_v3.Calendar
  }

  function mapError(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Google Calendar error'
  }

  // --- CalendarProvider implementation ---

  const provider: CalendarProvider = {
    getEvents(start: string, end: string) {
      return ResultAsync.fromPromise(
        (async () => {
          const token = await getValidToken()
          const calendar = getCalendarClient(token)

          const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: start,
            timeMax: end,
            singleEvents: true,
            orderBy: 'startTime',
          })

          return (response.data.items || []).map(
            (event): CalendarEvent => ({
              id: event.id || '',
              summary: event.summary || '',
              start: event.start?.dateTime || event.start?.date || '',
              end: event.end?.dateTime || event.end?.date || '',
              description: event.description || undefined,
              attendees: (event.attendees || []).map((a) => ({
                email: a.email || '',
                name: a.displayName || undefined,
              })),
            })
          )
        })(),
        mapError
      )
    },

    createEvent(event: CalendarEventInput) {
      return ResultAsync.fromPromise(
        (async () => {
          const token = await getValidToken()
          const calendar = getCalendarClient(token)

          const timeZone = event.timeZone || 'Europe/Warsaw'

          const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
              summary: event.summary,
              description: event.description,
              start: { dateTime: event.start, timeZone },
              end: { dateTime: event.end, timeZone },
              attendees: event.attendees?.map((a) => ({
                email: a.email,
                displayName: a.name,
              })),
            },
          })

          if (!response.data.id) {
            throw new Error('No event ID returned from Google Calendar')
          }

          return { eventId: response.data.id }
        })(),
        mapError
      )
    },

    deleteEvent(eventId: string) {
      return ResultAsync.fromPromise(
        (async () => {
          const token = await getValidToken()
          const calendar = getCalendarClient(token)

          await calendar.events.delete({
            calendarId: 'primary',
            eventId,
          })
        })(),
        mapError
      )
    },

    testConnection() {
      return ResultAsync.fromPromise(
        (async () => {
          const token = await getValidToken()
          const calendar = getCalendarClient(token)

          const now = new Date()
          const oneHourLater = new Date(now.getTime() + 3_600_000)

          await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: oneHourLater.toISOString(),
            maxResults: 1,
          })

          return { success: true as const }
        })(),
        mapError
      )
    },

    discoverCalendars() {
      // Google Calendar API uses 'primary' — no discovery needed.
      // Return single entry representing the user's primary calendar.
      return okAsync<CalendarInfo[], string>([
        {
          url: 'primary',
          displayName: credentials.email || 'Primary Calendar',
          color: '#4285f4',
        },
      ])
    },
  }

  return provider
}
