import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Validation schema for booking request
const bookingRequestSchema = z.object({
  surveyId: z.string().uuid('Invalid survey ID'),
  responseId: z.string().uuid('Invalid response ID'),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  clientName: z.string().min(2).max(100),
  clientEmail: z.string().email('Invalid email'),
  notes: z.string().max(500).optional().default(''),
})

type BookingRequest = z.infer<typeof bookingRequestSchema>

interface Appointment {
  id: string
  response_id: string
  start_time: string
  end_time: string
  client_name: string
  client_email: string
  notes: string | null
  status: string
  google_calendar_event_id: string | null
  created_at: string
}

/**
 * POST /api/calendar/book
 * Creates a new appointment after client books a time slot
 *
 * Request body:
 * {
 *   surveyId: string (uuid)
 *   responseId: string (uuid)
 *   startTime: string (ISO 8601)
 *   endTime: string (ISO 8601)
 *   clientName: string
 *   clientEmail: string
 *   notes?: string
 * }
 *
 * Success response (201):
 * {
 *   success: true
 *   appointment: { id, startTime, endTime, clientName, clientEmail, status }
 *   confirmationUrl?: string
 * }
 *
 * Error responses:
 * 400: Invalid request body
 * 404: Survey or response not found
 * 409: Double-booking conflict or slot no longer available
 * 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    console.log('[BOOKING API] Received body:', JSON.stringify(body, null, 2))
    const validatedData = bookingRequestSchema.parse(body)
    console.log('[BOOKING API] Validation passed')

    // Step 1: Validate survey exists and get lawyer info
    const { data: surveyLink, error: surveyError } = await supabase
      .from('survey_links')
      .select('surveys(id, created_by, tenant_id)')
      .eq('id', validatedData.surveyId)
      .single()

    if (surveyError || !surveyLink) {
      return NextResponse.json(
        { error: 'Survey not found', code: 'SURVEY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const survey = surveyLink.surveys as unknown as {
      id: string
      created_by: string
      tenant_id: string
    }
    const lawyerId = survey.created_by
    const tenantId = survey.tenant_id

    // Step 2: Validate response exists and belongs to this survey
    const { data: response, error: responseError } = await supabase
      .from('responses')
      .select('id, survey_link_id')
      .eq('id', validatedData.responseId)
      .eq('survey_link_id', validatedData.surveyId)
      .single()

    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Response not found or does not match survey', code: 'RESPONSE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Step 3: Check for double-booking conflicts in database
    const { data: existingAppointments, error: conflictError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('lawyer_id', lawyerId)
      .eq('status', 'scheduled')

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json(
        { error: 'Failed to check availability', code: 'AVAILABILITY_CHECK_FAILED' },
        { status: 500 }
      )
    }

    // Detect time conflicts with existing appointments
    const bookingStart = new Date(validatedData.startTime).getTime()
    const bookingEnd = new Date(validatedData.endTime).getTime()

    const hasConflict = existingAppointments?.some((apt) => {
      const aptStart = new Date(apt.start_time).getTime()
      const aptEnd = new Date(apt.end_time).getTime()

      // Check if booking overlaps with existing appointment
      return bookingStart < aptEnd && bookingEnd > aptStart
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available', code: 'SLOT_UNAVAILABLE' },
        { status: 409 }
      )
    }

    // Step 4: Create appointment in database
    const { data: newAppointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        response_id: validatedData.responseId,
        lawyer_id: lawyerId,
        tenant_id: tenantId,
        start_time: validatedData.startTime,
        end_time: validatedData.endTime,
        client_name: validatedData.clientName,
        client_email: validatedData.clientEmail,
        notes: validatedData.notes || null,
        status: 'scheduled',
        // google_calendar_event_id will be set after event creation
      })
      .select()
      .single()

    if (createError || !newAppointment) {
      console.error('Error creating appointment:', createError)
      return NextResponse.json(
        { error: 'Failed to create appointment', code: 'APPOINTMENT_CREATION_FAILED' },
        { status: 500 }
      )
    }

    // Step 5: Create Google Calendar event (mocked for now)
    let googleEventId: string | null = null

    try {
      // In production, this would call Google Calendar API
      // For now, using mock event ID (matches mock mode in events.ts)
      googleEventId = `mock_event_${newAppointment.id}_${Date.now()}`

      // Update appointment with Google Calendar event ID
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ google_calendar_event_id: googleEventId })
        .eq('id', newAppointment.id)

      if (updateError) {
        console.error('Error updating appointment with event ID:', updateError)
        // Don't fail the booking if this fails, the appointment is already created
      }
    } catch (error) {
      console.error('Error creating Google Calendar event:', error)
      // Don't fail the booking if calendar event creation fails
      // The appointment is already created in the database
    }

    // Step 6: Return success response
    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: newAppointment.id,
          startTime: newAppointment.start_time,
          endTime: newAppointment.end_time,
          clientName: newAppointment.client_name,
          clientEmail: newAppointment.client_email,
          status: newAppointment.status,
          createdAt: newAppointment.created_at,
        },
        confirmationUrl: `/survey/${validatedData.surveyId}/success?appointmentId=${newAppointment.id}`,
      },
      { status: 201 }
    )
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('[BOOKING API] Zod validation failed:', error.errors)
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', code: 'PARSE_ERROR' },
        { status: 400 }
      )
    }

    // Handle unexpected errors
    console.error('Unexpected error in booking endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
