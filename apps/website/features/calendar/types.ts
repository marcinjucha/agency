/**
 * Calendar Feature Type Definitions
 *
 * Foundation types for the available slots calculation.
 * Used by API routes and query functions.
 *
 * @module apps/website/features/calendar/types
 */

/**
 * Individual appointment time slot
 */
export interface TimeSlot {
  /** ISO datetime string (with timezone offset, e.g., 2025-12-15T09:00:00+01:00) */
  start: string
  /** ISO datetime string (with timezone offset, e.g., 2025-12-15T10:00:00+01:00) */
  end: string
}

/**
 * Available slots response from API
 */
export interface AvailableSlotsResponse {
  /** Array of available time slots */
  slots: TimeSlot[]
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** Timezone identifier (e.g., 'Europe/Warsaw') */
  timezone: string
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  success: false
  error: string
}

/**
 * Internal calendar event structure for busy time detection
 */
export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  description?: string | null
}

/**
 * Validated booking request data (output of Zod schema)
 */
export interface BookingRequest {
  surveyId: string
  responseId: string
  startTime: string
  endTime: string
  clientName: string
  clientEmail: string
  notes: string
}

/**
 * Successful booking result
 */
export interface BookingResult {
  appointment: {
    id: string
    startTime: string
    endTime: string
    clientName: string
    clientEmail: string
    status: string
    createdAt: string
  }
  confirmationUrl: string
}

/**
 * Booking error with HTTP status code and error code
 */
export interface BookingError {
  error: string
  code: string
  status: number
  details?: Array<{ path: string; message: string }>
}
