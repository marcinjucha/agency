/**
 * Calendar Booking Logic
 *
 * Handles the full booking flow: survey lookup, response validation,
 * double-booking conflict detection, appointment creation, and
 * calendar event creation via multi-provider system with graceful degradation.
 *
 * All functions accept a supabase client as the first parameter so they can
 * be called from createServerFn handlers without module-level client initialization.
 *
 * @module apps/website/features/calendar/booking
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getConnectionForSurveyLink,
  createCalendarProvider,
  type GoogleCredentials,
  type ProviderCalendarEventInput,
} from '@agency/calendar'
import { findAnswerByRole, type BookingCreatedPayload } from '@agency/validators'
import type { BookingRequest, BookingResult, BookingError } from './types'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

// ---------------------------------------------------------------------------
// Token refresh callback factory — persists new Google credentials via RPC
// ---------------------------------------------------------------------------

function makePersistTokenRefresh(supabase: SupabaseClient) {
  return async (connectionId: string, newCredentials: GoogleCredentials): Promise<void> => {
    const { error } = await supabase.rpc('update_calendar_credentials', {
      p_connection_id: connectionId,
      p_credentials_json: JSON.stringify(newCredentials),
    })

    if (error) {
      console.error('[BOOKING] Failed to persist refreshed credentials:', error)
    }
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

interface ClientIdentity {
  name: string
  email: string
}

async function createCalendarEvent(
  supabase: SupabaseClient,
  surveyLinkId: string,
  data: BookingRequest,
  client: ClientIdentity
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
    onTokenRefresh: makePersistTokenRefresh(supabase),
  })

  const eventInput: ProviderCalendarEventInput = {
    summary: `Appointment: ${client.name}`,
    description: `Client: ${client.name}\nEmail: ${client.email}`,
    start: data.startTime,
    end: data.endTime,
    timeZone: 'Europe/Warsaw',
    attendees: [{ email: client.email }],
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
 * Accepts a supabase client injected from the createServerFn handler —
 * no module-level client initialization.
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
  supabase: SupabaseClient,
  data: BookingRequest
): Promise<{ success: true; data: BookingResult } | { success: false; error: BookingError }> {
  // Step 1: Validate survey exists and get lawyer info + survey questions.
  // AAA-T-63: booking_workflow_id added in Commit 1 — main repo's types.ts catches up on merge.
  // `surveys.questions` (JSONB) is needed to resolve semantic_role -> answer mapping
  // when extracting client identity from `responses.answers` below.
  const { data: surveyLink, error: surveyError } = await supabase
    .from('survey_links')
    .select('booking_workflow_id, surveys(id, created_by, tenant_id, questions)')
    .eq('id', data.surveyId)
    .single()

  if (surveyError || !surveyLink) {
    return {
      success: false,
      error: { error: messages.calendar.surveyNotFound, code: 'SURVEY_NOT_FOUND', status: 404 },
    }
  }

  // AAA-T-63: booking_workflow_id is a top-level survey_links column (nullable).
  // `surveys.questions` is JSONB typed as `unknown[]` — extractClientInfo casts internally.
  const surveyLinkRow = surveyLink as unknown as {
    booking_workflow_id: string | null
    surveys: {
      id: string
      created_by: string
      tenant_id: string
      questions: unknown[] | null
    }
  }
  const survey = surveyLinkRow.surveys
  const userId = survey.created_by
  const tenantId = survey.tenant_id
  const surveyQuestions = survey.questions ?? []

  // Step 2: Validate response exists and belongs to this survey.
  // Client identity is derived from `responses.answers` JSONB (the booking
  // widget no longer asks the client to re-type name/email). The survey
  // questions tagged with `semantic_role: 'client_name' / 'client_email'`
  // are the canonical source.
  const { data: response, error: responseError } = await supabase
    .from('responses')
    .select('id, survey_link_id, answers')
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

  const responseRow = response as {
    id: string
    survey_link_id: string
    answers: Record<string, unknown> | null
  }

  // Strict extraction — booking flow MUST have a real name AND email.
  // Use findAnswerByRole (returns null when the role is unmapped or the answer
  // is blank) instead of extractClientInfo which would substitute "first answer"
  // or "Odpowiedź #N" — those fallbacks are fine for CMS UI labels but would
  // put garbage like "yes, I agree" on calendar invites and trigger payloads.
  const answers = responseRow.answers ?? {}
  const clientName = findAnswerByRole(answers, surveyQuestions, 'client_name')
  const clientEmail = findAnswerByRole(answers, surveyQuestions, 'client_email')

  if (!clientName || !clientEmail) {
    // Defensive: surveys feeding the booking widget must tag a question with
    // `semantic_role: 'client_name'` and another with `'client_email'`, and
    // the respondent must have answered both. If we ever land here in
    // production, the upstream survey wiring is broken.
    return {
      success: false,
      error: {
        error: messages.calendar.surveyMissingClientFields,
        code: 'RESPONSE_MISSING_CLIENT_DATA',
        status: 422,
      },
    }
  }

  const client: ClientIdentity = {
    name: clientName,
    email: clientEmail,
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

  // Step 4: Create appointment row. Client identity lives on the linked
  // response (extractClientInfo from answers JSONB).
  const { data: newAppointment, error: createError } = await supabase
    .from('appointments')
    .insert({
      response_id: data.responseId,
      user_id: userId,
      tenant_id: tenantId,
      start_time: data.startTime,
      end_time: data.endTime,
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
  // AAA-T-63: skip dispatch when no workflow attached for booking trigger on this link
  if (
    process.env.CMS_BASE_URL &&
    process.env.WORKFLOW_TRIGGER_SECRET &&
    surveyLinkRow.booking_workflow_id
  ) {
    // WHY BookingCreatedPayload: shared type from @agency/validators ensures the payload
    // fields here stay in sync with what the CMS engine/types.ts expects and what
    // lib/trigger-schemas.ts declares as available {{variables}}. Changing the payload
    // shape without updating the shared type is now a compile-time error.
    const triggerPayload: BookingCreatedPayload = {
      appointmentId: newAppointment.id,
      responseId: data.responseId,
      surveyLinkId: data.surveyId,
    }

    fetch(`${process.env.CMS_BASE_URL}/api/workflows/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKFLOW_TRIGGER_SECRET}`,
      },
      body: JSON.stringify({
        trigger_type: 'booking_created',
        workflow_id: surveyLinkRow.booking_workflow_id,
        tenant_id: tenantId,
        payload: triggerPayload,
      }),
    }).catch((err) => console.error('[Workflow] booking_created trigger failed:', err))
  }

  // Step 5: Create calendar event via multi-provider system (graceful degradation)
  try {
    const calendarResult = await createCalendarEvent(supabase, data.surveyId, data, client)

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
        // Sourced from `client` (derived from response.answers via findAnswerByRole).
        clientName: client.name,
        clientEmail: client.email,
        status: newAppointment.status,
        createdAt: newAppointment.created_at,
      },
      confirmationUrl: `${routes.surveySuccess(data.surveyId)}?appointmentId=${newAppointment.id}`,
    },
  }
}
