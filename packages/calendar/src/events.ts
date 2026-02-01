import { google, calendar_v3 } from 'googleapis'

/**
 * Calendar event structure for creating events
 */
export interface CalendarEventInput {
  summary: string
  description: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: Array<{ email: string }>
}

/**
 * Check if using mock mode for Google Calendar API
 */
function useMockMode(): boolean {
  return process.env.USE_MOCK_CALENDAR === 'true' || process.env.GOOGLE_MOCK_MODE === 'true'
}

/**
 * Get initialized Google Calendar API client
 * Requires valid access token
 */
function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  if (useMockMode()) {
    // Return mock - the actual methods won't be called
    return {} as calendar_v3.Calendar
  }

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  return google.calendar({ version: 'v3', auth }) as calendar_v3.Calendar
}

/**
 * Create an event in Google Calendar
 *
 * This function is exported from the calendar package so both apps can use it.
 * Creates an event in the lawyer's primary calendar.
 *
 * @param accessToken - Valid Google Calendar access token
 * @param eventData - Event details (summary, description, start, end, attendees)
 * @returns Google Calendar event ID
 * @throws Error if event creation fails
 *
 * @example
 * const eventId = await createEvent(accessToken, {
 *   summary: 'Client Meeting',
 *   description: 'Initial consultation',
 *   start: { dateTime: '2024-01-20T10:00:00Z', timeZone: 'Europe/Warsaw' },
 *   end: { dateTime: '2024-01-20T11:00:00Z', timeZone: 'Europe/Warsaw' },
 *   attendees: [{ email: 'client@example.com' }]
 * })
 */
export async function createEvent(
  accessToken: string,
  eventData: CalendarEventInput
): Promise<string> {
  if (useMockMode()) {
    return `mock_event_${Date.now()}`
  }

  try {
    const calendar = getCalendarClient(accessToken)

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData,
    })

    if (!response.data.id) {
      console.error('[CREATE EVENT] No event ID returned from Google Calendar')
      throw new Error('No event ID returned from Google Calendar')
    }

    return response.data.id
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[CREATE EVENT] Failed to create calendar event:', errorMsg)
    throw new Error(
      `Failed to create calendar event: ${errorMsg}`
    )
  }
}
