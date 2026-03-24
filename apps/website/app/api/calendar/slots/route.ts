/**
 * GET /api/calendar/slots
 *
 * Calculate available appointment slots for a lawyer on a given date.
 *
 * Query Parameters:
 * - surveyId: UUID of survey (required)
 * - date: ISO date string YYYY-MM-DD (required)
 *
 * Response: AvailableSlotsResponse
 * - slots: Array of { start, end } in ISO format with timezone
 * - date: The requested date
 * - timezone: 'Europe/Warsaw'
 *
 * Errors:
 * - 400: Missing or invalid parameters
 * - 404: Survey not found
 * - 500: Database or calendar API error
 *
 * Note: If calendar is not connected, returns all slots as available (9 AM - 5 PM)
 * This allows testing without requiring calendar setup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken, refreshAccessToken, getEvents } from '@agency/calendar'
import type { CalendarEvent } from '@agency/calendar'
import type { AvailableSlotsResponse, ErrorResponse } from '@/features/calendar/types'
import { parseDateString, calculateAvailableSlots, getDayBoundsUTC } from '@/features/calendar/slot-calculator'
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

export async function GET(request: NextRequest): Promise<
  NextResponse<AvailableSlotsResponse | ErrorResponse>
> {
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

    // Step 2: Get survey link and lawyer info
    const { data: surveyLink, error: surveyError } = await supabase
      .from('survey_links')
      .select('surveys(id, created_by, tenant_id)')
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

    // Step 3: Get valid access token with auto-refresh
    const tokenResult = await getValidAccessToken(userId, supabase, refreshAccessToken)

    if (tokenResult.error) {
      console.error('[SLOTS API] Failed to get access token:', tokenResult.error)
      return NextResponse.json(
        { success: false, error: 'Calendar not available' },
        { status: 500 }
      )
    }

    const accessToken = tokenResult.accessToken!

    // Step 4: Fetch busy events from calendar
    let busyEvents: CalendarEvent[] = []

    try {
      const { dayStartUTC, dayEndUTC } = getDayBoundsUTC(requestedDate)
      busyEvents = await getEvents(accessToken, dayStartUTC, dayEndUTC)
    } catch (error) {
      console.error('[SLOTS API] Error fetching calendar events:', error)
      busyEvents = []
    }

    // Step 5: Load per-user calendar settings (cached)
    const calSettings = await getCalendarSettingsForUser(userId)

    // Step 6: Calculate available slots
    const availableSlots = calculateAvailableSlots(
      requestedDate,
      busyEvents,
      calSettings.work_start_hour,
      calSettings.work_end_hour,
      calSettings.slot_duration_minutes,
      calSettings.buffer_minutes
    )

    // Step 7: Return response
    const response: AvailableSlotsResponse = {
      slots: availableSlots,
      date: dateStr,
      timezone: 'Europe/Warsaw',
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
