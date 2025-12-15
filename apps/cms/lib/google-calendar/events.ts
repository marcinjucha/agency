import { google, calendar_v3 } from 'googleapis'

// ⚠️ MOCK MODE - Set to false after Google API is properly configured
const USE_MOCK_CALENDAR = true

export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  description?: string | null
}

export interface TimeSlot {
  start: string
  end: string
  available: boolean
}

/**
 * Get initialized Google Calendar API client
 * Requires valid access token from oauth.ts
 */
function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  if (USE_MOCK_CALENDAR) {
    // Return mock - the actual methods won't be called
    return {} as calendar_v3.Calendar
  }

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  return google.calendar({ version: 'v3', auth }) as calendar_v3.Calendar
}

/**
 * Fetch calendar events for a date range
 * Returns all busy slots from the lawyer's calendar
 */
export async function getEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  if (USE_MOCK_CALENDAR) {
    // Mock: Return empty array (no busy slots)
    return []
  }

  try {
    const calendar = getCalendarClient(accessToken)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    return (response.data.items || []).map(event => ({
      id: event.id || '',
      summary: event.summary || '',
      start: { dateTime: event.start?.dateTime || '' },
      end: { dateTime: event.end?.dateTime || '' },
      description: event.description,
    }))
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    throw new Error(
      `Failed to fetch calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Create an event in the lawyer's Google Calendar
 * Called after client books an appointment
 */
export async function createEvent(
  accessToken: string,
  eventData: {
    summary: string
    description: string
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
    attendees?: Array<{ email: string }>
  }
): Promise<string> {
  if (USE_MOCK_CALENDAR) {
    // Mock: Return a mock event ID
    return `mock_event_${Date.now()}`
  }

  try {
    const calendar = getCalendarClient(accessToken)

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData,
    })

    return response.data.id || ''
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    throw new Error(
      `Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  accessToken: string,
  eventId: string,
  updateData: Partial<CalendarEvent>
): Promise<void> {
  if (USE_MOCK_CALENDAR) {
    // Mock: Just return
    return
  }

  try {
    const calendar = getCalendarClient(accessToken)

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: updateData as calendar_v3.Schema$Event,
    })
  } catch (error) {
    console.error('Failed to update calendar event:', error)
    throw new Error(
      `Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Delete/cancel a calendar event
 */
export async function deleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  if (USE_MOCK_CALENDAR) {
    // Mock: Just return
    return
  }

  try {
    const calendar = getCalendarClient(accessToken)

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })
  } catch (error) {
    console.error('Failed to delete calendar event:', error)
    throw new Error(
      `Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
