/**
 * Calendar Feature Validation Schemas
 *
 * Zod schemas for calendar-related request validation.
 *
 * @module apps/website/features/calendar/validation
 */

import { z } from 'zod'

export const bookingRequestSchema = z.object({
  surveyId: z.string().uuid('Invalid survey ID'),
  responseId: z.string().uuid('Invalid response ID'),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  clientName: z.string().min(2).max(100),
  clientEmail: z.string().email('Invalid email'),
  notes: z.string().max(500).optional().default(''),
})

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>
