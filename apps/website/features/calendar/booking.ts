/**
 * Calendar Booking Logic
 *
 * Handles the full booking flow: survey lookup, response validation,
 * double-booking conflict detection, appointment creation, and
 * calendar event creation via multi-provider system with graceful degradation.
 *
 * Uses service role client — this runs in a public API route with no auth context.
 *
 * @module apps/website/features/calendar/booking
 */

import { createClient } from '@supabase/supabase-js'
import {
  getConnectionForSurveyLink,
  createCalendarProvider,
  type GoogleCredentials,
  type ProviderCalendarEventInput,
} from '@agency/calendar'
import type { BookingRequest, BookingResult, BookingError } from './types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

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

// ---------------------------------------------------------------------------
// Token refresh callback — persists new Google credentials via RPC
// ---------------------------------------------------------------------------

async function persistTokenRefresh(
  connectionId: string,
  newCredentials: GoogleCredentials
): Promise<void> {
  const { error } = await supabase.rpc('update_calendar_credentials', {
    p_connection_id: connectionId,
    p_credentials_json: JSON.stringify(newCredentials),
  })

  if (error) {
    console.error('[BOOKING] Failed to persist refreshed credentials:', error)
  }
}

// ---------------------------------------------------------------------------
// Calendar event creation (graceful degradation)
// ---------------------------------------------------------------------------

interface CalendarEventResult {
  eventId: string | null
  provider: string | null
  connectionId: string | null
}

async function createCalendarEvent(
  surveyLinkId: string,
  data: BookingRequest
): Promise<CalendarEventResult> {
  const noEvent: CalendarEventResult = {
    eventId: null,
    provider: null,
    connectionId: null,
  }

  const connectionResult = await getConnectionForSurveyLink(surveyLinkId, supabase)

  if (connectionResult.isErr()) {
    console.warn('[BOOKING] No calendar connection for survey link:', connectionResult.error)
    return noEvent
  }

  const connection = connectionResult.value

  if (!connection.isActive) {
    console.warn('[BOOKING] Calendar connection is inactive:', connection.id)
    return noEvent
  }

  const provider = createCalendarProvider(connection, {
    onTokenRefresh: persistTokenRefresh,
  })

  const eventInput: ProviderCalendarEventInput = {
    summary: `Appointment: ${data.clientName}`,
    description: `Client: ${data.clientName}\nEmail: ${data.clientEmail}\nNotes: ${data.notes || 'N/A'}`,
    start: data.startTime,
    end: data.endTime,
    timeZone: 'Europe/Warsaw',
    attendees: [{ email: data.clientEmail }],
  }

  const eventResult = await provider.createEvent(eventInput)

  if (eventResult.isErr()) {
    console.error('[BOOKING] Failed to create calendar event:', eventResult.error)
    return noEvent
  }

  return {
    eventId: eventResult.value.eventId,
    provider: connection.provider,
    connectionId: connection.id,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Book an appointment for a client.
 *
 * Steps:
 * 1. Validate survey exists and get lawyer info
 * 2. Validate response exists and belongs to survey
 * 3. Check for double-booking conflicts
 * 4. Create appointment in database
 * 5. Create calendar event via multi-provider system (graceful degradation)
 * 6. Return booking result
 */
export async function bookAppointment(
  data: BookingRequest
): Promise<{ success: true; data: BookingResult } | { success: false; error: BookingError }> {
  // Step 1: Validate survey exists and get lawyer info
  const { data: surveyLink, error: surveyError } = await supabase
    .from('survey_links')
    .select('surveys(id, created_by, tenant_id)')
    .eq('id', data.surveyId)
    .single()

  if (surveyError || !surveyLink) {
    return {
      success: false,
      error: { error: messages.calendar.surveyNotFound, code: 'SURVEY_NOT_FOUND', status: 404 },
    }
  }

  const survey = surveyLink.surveys as unknown as {
    id: string
    created_by: string
    tenant_id: string
  }
  const userId = survey.created_by
  const tenantId = survey.tenant_id

  // Step 2: Validate response exists and belongs to this survey
  const { data: response, error: responseError } = await supabase
    .from('responses')
    .select('id, survey_link_id')
    .eq('id', data.responseId)
    .eq('survey_link_id', data.surveyId)
    .single()

  if (responseError || !response) {
    return {
      success: false,
      error: {
        error: messages.calendar.responseNotFound,
        code: 'RESPONSE_NOT_FOUND',
        status: 404,
      },
    }
  }

  // Step 3: Check for double-booking conflicts
  const { data: existingAppointments, error: conflictError } = await supabase
    .from('appointments')
    .select('id, start_time, end_time')
    .eq('user_id', userId)
    .eq('status', 'scheduled')

  if (conflictError) {
    console.error('Error checking conflicts:', conflictError)
    return {
      success: false,
      error: {
        error: messages.calendar.availabilityCheckFailed,
        code: 'AVAILABILITY_CHECK_FAILED',
        status: 500,
      },
    }
  }

  const bookingStart = new Date(data.startTime).getTime()
  const bookingEnd = new Date(data.endTime).getTime()

  const hasConflict = existingAppointments?.some((apt) => {
    const aptStart = new Date(apt.start_time).getTime()
    const aptEnd = new Date(apt.end_time).getTime()
    return bookingStart < aptEnd && bookingEnd > aptStart
  })

  if (hasConflict) {
    return {
      success: false,
      error: {
        error: messages.calendar.slotUnavailable,
        code: 'SLOT_UNAVAILABLE',
        status: 409,
      },
    }
  }

  // Step 4: Create appointment in database
  const { data: newAppointment, error: createError } = await supabase
    .from('appointments')
    .insert({
      response_id: data.responseId,
      user_id: userId,
      tenant_id: tenantId,
      start_time: data.startTime,
      end_time: data.endTime,
      client_name: data.clientName,
      client_email: data.clientEmail,
      notes: data.notes || null,
      status: 'scheduled',
    })
    .select()
    .single()

  if (createError || !newAppointment) {
    console.error('Error creating appointment:', createError)
    return {
      success: false,
      error: {
        error: messages.calendar.appointmentCreationFailed,
        code: 'APPOINTMENT_CREATION_FAILED',
        status: 500,
      },
    }
  }

  // Trigger CMS workflow engine (fire-and-forget)
  if (process.env.HOST_URL && process.env.WORKFLOW_TRIGGER_SECRET) {
    fetch(`${process.env.HOST_URL}/api/workflows/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKFLOW_TRIGGER_SECRET}`,
      },
      body: JSON.stringify({
        trigger_type: 'booking_created',
        tenant_id: tenantId,
        payload: {
          appointmentId: newAppointment.id,
          responseId: data.responseId,
          surveyLinkId: data.surveyId,
          clientEmail: data.clientEmail,
          appointmentAt: data.startTime,
        },
      }),
    }).catch((err) => console.error('[Workflow] booking_created trigger failed:', err))
  }

  // Step 5: Create calendar event via multi-provider system (graceful degradation)
  try {
    const calendarResult = await createCalendarEvent(data.surveyId, data)

    if (calendarResult.eventId) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          calendar_event_id: calendarResult.eventId,
          calendar_provider: calendarResult.provider,
          calendar_connection_id: calendarResult.connectionId,
        })
        .eq('id', newAppointment.id)

      if (updateError) {
        console.error('Error updating appointment with calendar event:', updateError)
      }
    }
  } catch (error) {
    console.error('Error in calendar integration:', error)
  }

  // Step 6: Return success result
  return {
    success: true,
    data: {
      appointment: {
        id: newAppointment.id,
        startTime: newAppointment.start_time,
        endTime: newAppointment.end_time,
        clientName: newAppointment.client_name,
        clientEmail: newAppointment.client_email,
        status: newAppointment.status,
        createdAt: newAppointment.created_at,
      },
      confirmationUrl: `${routes.surveySuccess(data.surveyId)}?appointmentId=${newAppointment.id}`,
    },
  }
}
