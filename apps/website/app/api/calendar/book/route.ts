import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { bookingRequestSchema } from '@/features/calendar/validation'
import { bookAppointment } from '@/features/calendar/booking'

/**
 * POST /api/calendar/book (legacy Next.js route — superseded by bookAppointmentFn)
 * Creates a new appointment after client books a time slot.
 *
 * Thin HTTP handler — all business logic lives in features/calendar/booking.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = bookingRequestSchema.parse(body)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const result = await bookAppointment(supabase, validatedData)

    if (!result.success) {
      const { error, code, status, details } = result.error
      return NextResponse.json(
        { error, code, ...(details && { details }) },
        { status }
      )
    }

    return NextResponse.json(
      { success: true, ...result.data },
      { status: 201 }
    )
  } catch (error) {
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

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', code: 'PARSE_ERROR' },
        { status: 400 }
      )
    }

    console.error('Unexpected error in booking endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
