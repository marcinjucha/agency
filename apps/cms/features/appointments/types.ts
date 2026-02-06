/**
 * Appointment Management Type Definitions
 *
 * Foundation types for the CMS appointment management feature.
 * All queries, validation schemas, and components import from this file.
 *
 * Includes types for:
 * - Individual appointments with full data
 * - Appointment list items for table display
 * - Appointment status tracking
 * - Computed fields (duration_minutes)
 *
 * @module apps/cms/features/appointments/types
 */

import type { Tables } from '@agency/database'

/**
 * Appointment status values
 * Defines all possible states for an appointment in the system
 *
 * - scheduled: Appointment is confirmed and scheduled
 * - completed: Appointment has been completed
 * - cancelled: Appointment was cancelled by either party
 * - no_show: Client did not show up for the appointment
 */
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

/**
 * Minimal response data for appointment context
 * Subset of response data with only the fields needed for appointments
 * Used when joining appointments with their associated responses
 */
export interface AppointmentResponseContext {
  /** Response UUID from database */
  id: string
  /** Response status for display */
  status: string | null
  /** Response creation timestamp (ISO 8601) */
  created_at: string | null
}

/**
 * Appointment with optional response relationship
 * Used in detail view when displaying appointment with its associated response
 * Includes all appointment fields + optional response join
 *
 * @example
 * const appointment: AppointmentWithResponse = {
 *   id: "a-123",
 *   tenant_id: "t-789",
 *   lawyer_id: "u-456",
 *   response_id: "r-123",
 *   start_time: "2026-01-20T10:00:00Z",
 *   end_time: "2026-01-20T11:00:00Z",
 *   client_name: "John Doe",
 *   client_email: "john@example.com",
 *   status: "scheduled",
 *   notes: "Initial consultation",
 *   google_calendar_event_id: "evt_123",
 *   created_at: "2026-01-15T10:30:00Z",
 *   updated_at: "2026-01-15T10:30:00Z",
 *   response: { id: "r-123", status: "qualified", created_at: "2026-01-15T10:00:00Z" }
 * }
 */
export type AppointmentWithResponse = Tables<'appointments'> & {
  /** Optional joined response data (null if no response_id) */
  response?: AppointmentResponseContext | null
}

/**
 * Appointment list item for table display
 * Extends base appointment with computed fields for efficient list rendering
 * Includes only fields needed for:
 * - Status badge display
 * - Client name/email columns
 * - Time and duration display
 * - Optional response relationship
 * - Detail view link
 *
 * @example
 * const item: AppointmentListItem = {
 *   id: "a-123",
 *   tenant_id: "t-789",
 *   lawyer_id: "u-456",
 *   response_id: "r-123",
 *   start_time: "2026-01-20T10:00:00Z",
 *   end_time: "2026-01-20T11:00:00Z",
 *   duration_minutes: 60,
 *   client_name: "John Doe",
 *   client_email: "john@example.com",
 *   status: "scheduled",
 *   notes: "Initial consultation",
 *   google_calendar_event_id: "evt_123",
 *   created_at: "2026-01-15T10:30:00Z",
 *   updated_at: "2026-01-15T10:30:00Z",
 *   response: { id: "r-123", status: "qualified", created_at: "2026-01-15T10:00:00Z" }
 * }
 */
export type AppointmentListItem = Tables<'appointments'> & {
  /**
   * Computed duration in minutes
   * Calculated from start_time and end_time
   * Used for display in list view
   */
  duration_minutes: number

  /** Optional joined response data (null if no response_id) */
  response?: AppointmentResponseContext | null
}

/**
 * Appointment filter criteria
 * Used for filtering appointments in list view
 *
 * @example
 * const filters: AppointmentFilters = {
 *   lawyerId: "u-456",
 *   status: "scheduled",
 *   dateFrom: "2026-01-01",
 *   dateTo: "2026-01-31"
 * }
 */
export interface AppointmentFilters {
  /** Filter by lawyer ID */
  lawyerId?: string
  /** Filter by appointment status */
  status?: AppointmentStatus
  /** Filter appointments from date (ISO 8601) */
  dateFrom?: string
  /** Filter appointments to date (ISO 8601) */
  dateTo?: string
  /** Search in client name/email */
  searchQuery?: string
}

/**
 * Appointment pagination metadata
 * Used for paginated appointment lists
 *
 * @example
 * const pagination: AppointmentPagination = {
 *   total: 100,
 *   page: 1,
 *   pageSize: 25,
 *   totalPages: 4
 * }
 */
export interface AppointmentPagination {
  /** Total number of appointments matching filters */
  total: number
  /** Current page (1-indexed) */
  page: number
  /** Number of items per page */
  pageSize: number
  /** Total number of pages */
  totalPages: number
}

/**
 * Appointment list response data
 * Combines list items with pagination metadata
 *
 * @example
 * const data: AppointmentListData = {
 *   items: [...],
 *   pagination: { total: 100, page: 1, pageSize: 25, totalPages: 4 }
 * }
 */
export interface AppointmentListData {
  /** Array of appointment list items */
  items: AppointmentListItem[]
  /** Pagination metadata */
  pagination: AppointmentPagination
}

/**
 * Appointment status change event
 * Used for tracking status update history (future enhancement)
 *
 * @example
 * const event: AppointmentStatusChange = {
 *   appointmentId: "a-123",
 *   from: "scheduled",
 *   to: "completed",
 *   changedAt: "2026-01-20T11:00:00Z",
 *   changedBy: "u-456"
 * }
 */
export interface AppointmentStatusChange {
  /** Appointment UUID */
  appointmentId: string
  /** Previous status */
  from: AppointmentStatus | null
  /** New status */
  to: AppointmentStatus
  /** Change timestamp */
  changedAt: string
  /** User UUID who made the change */
  changedBy?: string
}
