/**
 * GET /api/calendar/slots
 *
 * Calculate available appointment slots for a given date using the
 * multi-provider calendar system.
 *
 * Query Parameters:
 * - surveyId: UUID of survey_link (required)
 * - date: ISO date string YYYY-MM-DD (required)
 *
 * Response: AvailableSlotsResponse
 * - slots: Array of { start, end } in ISO format with timezone
 * - date: The requested date
 * - timezone: 'Europe/Warsaw'
 * - calendarConnected: whether a calendar connection is active
 *
 * Flow:
 * 1. Fetch survey_link → get calendar_connection_id + user_id (via surveys)
 * 2. If no calendar_connection_id → return slots with calendarConnected: false
 * 3. If connection exists → createCalendarProvider → provider.getEvents()
 * 4. Calculate available slots from work hours minus busy events
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getConnectionById,
  createCalendarProvider,
  type GoogleCredentials,
} from '@agency/calendar'
import type { AvailableSlotsResponse, ErrorResponse } from '@/features/calendar/types'
import {
  parseDateString,
  calculateAvailableSlots,
  getDayBoundsUTC,
  type BusyEvent,
} from '@/features/calendar/slot-calculator'
import { getCalendarSettingsForUser } from '@/features/calendar/settings-cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseKey) {
  console.error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(
  request: NextRequest
): Promise<NextResponse<AvailableSlotsResponse | ErrorResponse>> {
  try {
    // Step 1: Validate query parameters
    const searchParams = request.nextUrl.searchParams
    const surveyId = searchParams.get('surveyId')
    const dateStr = searchParams.get('date')

    if (!surveyId || !dateStr) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: surveyId and date' },
        { status: 400 }
      )
    }

    let requestedDate: Date
    try {
      requestedDate = parseDateString(dateStr)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid date: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 400 }
      )
    }

    // Step 2: Get survey link with calendar_connection_id + user_id
    const { data: surveyLink, error: surveyError } = await supabase
      .from('survey_links')
      .select('calendar_connection_id, surveys(id, created_by, tenant_id)')
      .eq('id', surveyId)
      .single()

    if (surveyError || !surveyLink) {
      return NextResponse.json(
        { success: false, error: 'Survey not found' },
        { status: 404 }
      )
    }

    const survey = surveyLink.surveys as unknown as {
      id: string
      created_by: string
      tenant_id: string
    }
    const userId = survey.created_by
    const calendarConnectionId = (surveyLink as unknown as { calendar_connection_id: string | null })
      .calendar_connection_id

    // Step 3: Resolve calendar connection
    let calendarConnected = false
    let busyEvents: BusyEvent[] = []

    if (calendarConnectionId) {
      const connectionResult = await getConnectionById(calendarConnectionId, supabase)

      if (connectionResult.isOk()) {
        const connection = connectionResult.value

        if (connection.isActive) {
          calendarConnected = true

          // Build onTokenRefresh callback for Google token rotation
          const onTokenRefresh = async (
            connectionId: string,
            newCredentials: GoogleCredentials
          ) => {
            await supabase.rpc('update_calendar_credentials', {
              p_connection_id: connectionId,
              p_credentials_json: JSON.stringify(newCredentials),
            })
          }

          const provider = createCalendarProvider(connection, { onTokenRefresh })

          try {
            const { dayStartUTC, dayEndUTC } = getDayBoundsUTC(requestedDate)
            const eventsResult = await provider.getEvents(
              dayStartUTC.toISOString(),
              dayEndUTC.toISOString()
            )

            if (eventsResult.isOk()) {
              // Map provider CalendarEvent (flat start/end) → BusyEvent (nested dateTime)
              busyEvents = eventsResult.value.map((event) => ({
                start: { dateTime: event.start },
                end: { dateTime: event.end },
              }))
            } else {
              console.warn('[SLOTS API] Error fetching calendar events:', eventsResult.error)
            }
          } catch (error) {
            console.warn('[SLOTS API] Error fetching calendar events, returning all slots:', error)
          }
        }
      } else {
        console.warn('[SLOTS API] Calendar connection not found:', connectionResult.error)
      }
    } else {
      // No calendar connection configured — all work-hour slots available
      console.warn('[SLOTS API] No calendar connection on survey link, returning all slots')
    }

    // Step 4: Load per-user calendar settings (cached)
    const calSettings = await getCalendarSettingsForUser(userId)

    // Step 5: Calculate available slots
    const availableSlots = calculateAvailableSlots(
      requestedDate,
      busyEvents,
      calSettings.work_start_hour,
      calSettings.work_end_hour,
      calSettings.slot_duration_minutes,
      calSettings.buffer_minutes
    )

    // Step 6: Return response
    const response: AvailableSlotsResponse = {
      slots: availableSlots,
      date: dateStr,
      timezone: 'Europe/Warsaw',
      calendarConnected,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in slots API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
