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
import type { AvailableSlotsResponse, ErrorResponse, TimeSlot } from '@/features/calendar/types'
import { parse, addMinutes } from 'date-fns'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken, refreshAccessToken, getEvents } from '@agency/calendar'
import type { CalendarEvent } from '@agency/calendar'

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseKey) {
  console.error('❌ Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TIMEZONE = 'Europe/Warsaw'

// CALENDAR SETTINGS DEFAULTS (fallback when no DB row)
const DEFAULT_WORK_START_HOUR = 9
const DEFAULT_WORK_END_HOUR = 17
const DEFAULT_SLOT_DURATION_MINUTES = 60
const DEFAULT_BUFFER_MINUTES = 15

// Simple in-memory cache: userId → { settings, cachedAt }
const calendarSettingsCache = new Map<string, {
  settings: { work_start_hour: number; work_end_hour: number; slot_duration_minutes: number; buffer_minutes: number }
  cachedAt: number
}>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getCalendarSettingsForUser(userId: string) {
  const cached = calendarSettingsCache.get(userId)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.settings
  }

  const { data } = await supabase
    .from('calendar_settings')
    .select('work_start_hour, work_end_hour, slot_duration_minutes, buffer_minutes')
    .eq('user_id', userId)
    .single()

  const settings = data ?? {
    work_start_hour: DEFAULT_WORK_START_HOUR,
    work_end_hour: DEFAULT_WORK_END_HOUR,
    slot_duration_minutes: DEFAULT_SLOT_DURATION_MINUTES,
    buffer_minutes: DEFAULT_BUFFER_MINUTES,
  }

  calendarSettingsCache.set(userId, { settings, cachedAt: Date.now() })
  return settings
}

/**
 * Get current UTC offset for Warsaw timezone
 * Poland is UTC+1 (CET) in winter, UTC+2 (CEST) in summer
 */
function getWarsawUTCOffset(date: Date): number {
  // Create a date string in Warsaw timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const timeObj: any = {}
  parts.forEach(({ type, value }) => {
    timeObj[type] = value
  })

  // Create date in UTC
  const utcDate = new Date(
    Date.UTC(
      parseInt(timeObj.year),
      parseInt(timeObj.month) - 1,
      parseInt(timeObj.day),
      parseInt(timeObj.hour),
      parseInt(timeObj.minute),
      parseInt(timeObj.second)
    )
  )

  // Calculate offset by comparing Warsaw time to UTC
  return (date.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
}

/**
 * Format date as ISO string with timezone offset
 */
function formatISOWithTimezone(date: Date, tzOffset: number): string {
  const sign = tzOffset >= 0 ? '+' : '-'
  const absOffset = Math.abs(tzOffset)
  const hours = Math.floor(absOffset).toString().padStart(2, '0')
  const minutes = ((absOffset % 1) * 60).toString().padStart(2, '0')

  return date.toISOString().slice(0, -1) + sign + hours + ':' + minutes
}

/**
 * Validate and parse ISO date string (YYYY-MM-DD)
 */
function parseDateString(dateStr: string): Date {
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date())

  if (isNaN(parsed.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  return parsed
}

/**
 * Check if a time slot overlaps with busy periods (including buffer)
 */
function isSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  busyEvents: Array<{
    start: { dateTime: string }
    end: { dateTime: string }
  }>,
  bufferMinutes: number
): boolean {
  // Add buffer time after and before the slot
  const slotStartWithBuffer = addMinutes(slotStart, -bufferMinutes)
  const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes)

  for (const event of busyEvents) {
    const eventStart = new Date(event.start.dateTime)
    const eventEnd = new Date(event.end.dateTime)

    // Check for overlap (including buffer)
    // Overlap occurs if: event starts before slot ends AND event ends after slot starts
    if (eventStart < slotEndWithBuffer && eventEnd > slotStartWithBuffer) {
      return false
    }
  }

  return true
}

/**
 * Calculate available slots for a day
 *
 * Algorithm:
 * 1. Parse requested date
 * 2. Create work start/end times in Warsaw timezone
 * 3. Get busy events from calendar
 * 4. Loop through slots (60 min each)
 * 5. Check availability (15 min buffer)
 * 6. Return available slots with timezone offset
 */
function calculateAvailableSlots(
  date: Date,
  busyEvents: Array<{
    start: { dateTime: string }
    end: { dateTime: string }
  }>,
  workStartHour: number,
  workEndHour: number,
  slotDurationMinutes: number,
  bufferMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Get UTC offset for this date
  const tzOffset = getWarsawUTCOffset(date)

  // Create work start/end times in Warsaw timezone
  // We use UTC dates and then adjust by timezone offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const dateObj: any = {}
  parts.forEach(({ type, value }) => {
    dateObj[type] = value
  })

  // Create UTC date for the start of the work day (Warsaw time)
  const workStartUTC = new Date(
    Date.UTC(
      parseInt(dateObj.year),
      parseInt(dateObj.month) - 1,
      parseInt(dateObj.day),
      workStartHour - tzOffset,
      0,
      0
    )
  )

  // Create UTC date for the end of the work day (Warsaw time)
  const workEndUTC = new Date(
    Date.UTC(
      parseInt(dateObj.year),
      parseInt(dateObj.month) - 1,
      parseInt(dateObj.day),
      workEndHour - tzOffset,
      0,
      0
    )
  )

  // Loop through the working day in slot-duration increments
  let currentTime = new Date(workStartUTC)

  while (currentTime < workEndUTC) {
    const slotStart = currentTime
    const slotEnd = addMinutes(slotStart, slotDurationMinutes)

    // Check if slot would extend past work end time
    if (slotEnd > workEndUTC) {
      break
    }

    // Check availability (with buffer)
    if (isSlotAvailable(slotStart, slotEnd, busyEvents, bufferMinutes)) {
      // Format times as UTC ISO strings (Zod requires Z format)
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      })
    }

    // Move to next slot (appointment duration + buffer)
    currentTime = addMinutes(currentTime, slotDurationMinutes + bufferMinutes)
  }

  return slots
}


export async function GET(request: NextRequest): Promise<
  NextResponse<AvailableSlotsResponse | ErrorResponse>
> {
  try {
    // Step 1: Validate and parse query parameters
    const searchParams = request.nextUrl.searchParams
    const surveyId = searchParams.get('surveyId')
    const dateStr = searchParams.get('date')

    if (!surveyId || !dateStr) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: surveyId and date' },
        { status: 400 }
      )
    }

    // Parse and validate date
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

    const surveyData = {
      id: survey.id,
      user_id: survey.created_by,  // Map created_by to user_id for consistency
      tenant_id: survey.tenant_id
    }

    // Step 3: Get valid access token with auto-refresh
    const tokenResult = await getValidAccessToken(
      surveyData.user_id,
      supabase,
      refreshAccessToken
    )

    if (tokenResult.error) {
      console.error('[SLOTS API] Failed to get access token:', tokenResult.error)
      return NextResponse.json(
        { success: false, error: 'Calendar not available' },
        { status: 500 }
      )
    }

    // TypeScript: accessToken is guaranteed to be string here (no error case)
    const accessToken = tokenResult.accessToken!

    // Step 4: Get busy events from calendar
    let busyEvents: CalendarEvent[] = []

    try {
      // Get start and end of day
      const tzOffset = getWarsawUTCOffset(requestedDate)
      const dayStartUTC = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate(), -tzOffset, 0, 0)
      const dayEndUTC = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate(), 24 - tzOffset, 0, 0)

      busyEvents = await getEvents(accessToken, dayStartUTC, dayEndUTC)
    } catch (error) {
      console.error('[SLOTS API] Error fetching calendar events:', error)
      // Don't fail - just return all slots available if calendar fetch fails
      busyEvents = []
    }

    // Step 5: Load per-user calendar settings (with in-memory cache)
    const calSettings = await getCalendarSettingsForUser(surveyData.user_id)

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
      timezone: TIMEZONE,
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
