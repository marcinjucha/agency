/**
 * Calendar Server Functions
 *
 * createServerFn exports replacing the Next.js API routes:
 *   GET /api/calendar/slots  → getAvailableSlotsFn
 *   POST /api/calendar/book  → bookAppointmentFn
 *
 * CRITICAL: createServiceClient() is called INSIDE each handler, never at
 * module level. This matches the TanStack Start isomorphic execution model —
 * process.env vars and import.meta.env are not available at module init time
 * on the client side.
 *
 * @module apps/website/features/calendar/server
 */

import { createServerFn } from '@tanstack/react-start'
import {
  getConnectionById,
  createCalendarProvider,
  type GoogleCredentials,
} from '@agency/calendar'
import { createServiceClient } from '@/lib/supabase/service'
import { bookAppointment } from './booking'
import { bookingRequestSchema } from './validation'
import { getCalendarSettingsForUser } from './settings-cache'
import {
  parseDateString,
  calculateAvailableSlots,
  getDayBoundsUTC,
  type BusyEvent,
} from './slot-calculator'
import type { AvailableSlotsResponse, BookingResult, BookingError } from './types'

// ---------------------------------------------------------------------------
// getAvailableSlotsFn — replaces GET /api/calendar/slots
// ---------------------------------------------------------------------------

export const getAvailableSlotsFn = createServerFn()
  .inputValidator(
    (input: { surveyLinkId: string; date: string }) => input
  )
  .handler(async ({ data }): Promise<AvailableSlotsResponse> => {
    const { surveyLinkId, date: dateStr } = data

    // Parse date — throw on invalid format (TanStack Start surfaces as error)
    const requestedDate = parseDateString(dateStr)

    const supabase = createServiceClient()

    // Fetch survey_link → get calendar_connection_id + user_id via surveys relation
    const { data: surveyLink, error: surveyError } = await supabase
      .from('survey_links')
      .select('calendar_connection_id, surveys(id, created_by, tenant_id)')
      .eq('id', surveyLinkId)
      .single()

    if (surveyError || !surveyLink) {
      throw new Error('Survey not found')
    }

    const survey = surveyLink.surveys as unknown as {
      id: string
      created_by: string
      tenant_id: string
    }
    const userId = survey.created_by
    const calendarConnectionId = (
      surveyLink as unknown as { calendar_connection_id: string | null }
    ).calendar_connection_id

    // Resolve calendar connection and fetch busy events
    let calendarConnected = false
    let busyEvents: BusyEvent[] = []

    if (calendarConnectionId) {
      const connectionResult = await getConnectionById(calendarConnectionId, supabase)

      if (connectionResult.isOk()) {
        const connection = connectionResult.value

        if (connection.isActive) {
          calendarConnected = true

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
              console.warn('[SLOTS] Error fetching calendar events:', eventsResult.error)
            }
          } catch (err) {
            console.warn('[SLOTS] Calendar events fetch failed, returning all slots:', err)
          }
        }
      } else {
        console.warn('[SLOTS] Calendar connection not found:', connectionResult.error)
      }
    }

    // Load per-user calendar settings (in-memory cached with 5-min TTL)
    const calSettings = await getCalendarSettingsForUser(userId)

    // Calculate available slots from work hours minus busy events
    const availableSlots = calculateAvailableSlots(
      requestedDate,
      busyEvents,
      calSettings.work_start_hour,
      calSettings.work_end_hour,
      calSettings.slot_duration_minutes,
      calSettings.buffer_minutes
    )

    return {
      slots: availableSlots,
      date: dateStr,
      timezone: 'Europe/Warsaw',
      calendarConnected,
    }
  })

// ---------------------------------------------------------------------------
// bookAppointmentFn — replaces POST /api/calendar/book
// ---------------------------------------------------------------------------

export const bookAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => bookingRequestSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; data: BookingResult } | { success: false; error: BookingError }
    > => {
      const supabase = createServiceClient()
      return bookAppointment(supabase, data)
    }
  )
