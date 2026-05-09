/**
 * Calendar Feature Validation Schemas
 *
 * Zod schemas for calendar-related request validation.
 *
 * @module apps/website/features/calendar/validation
 */

import { z } from 'zod'

// AAA-T-63 (Commit 9): clientName/clientEmail/notes removed from request.
// Client identity is derived server-side from `responses.respondent_name`
// + `responses.client_email` (see bookAppointment in booking.ts).
export const bookingRequestSchema = z.object({
  surveyId: z.string().uuid('Invalid survey ID'),
  responseId: z.string().uuid('Invalid response ID'),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
})

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>
