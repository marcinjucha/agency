/**
 * Centralized status color utility
 *
 * Provides consistent color schemes for status badges across the CMS.
 * Uses Tailwind CSS utility classes for background and text colors.
 *
 * @module status
 */

/**
 * Response status types from survey_responses table
 */
export type ResponseStatus = 'new' | 'qualified' | 'disqualified' | 'contacted' | null

/**
 * Appointment status types from appointments table
 */
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | null

/**
 * Survey status types from surveys table
 */
export type SurveyStatus = 'draft' | 'active' | 'archived' | null

/**
 * Returns Tailwind CSS classes for response status badges
 *
 * Color scheme:
 * - new: Blue (new submissions)
 * - qualified: Green (qualified leads)
 * - disqualified: Red (disqualified leads)
 * - contacted: Blue (contacted clients)
 * - default: Gray (unknown/null)
 *
 * @param status - Response status from database
 * @returns Tailwind CSS classes string (e.g., "bg-status-info text-status-info-foreground")
 */
export function getResponseStatusColor(status: ResponseStatus): string {
  switch (status) {
    case 'new':
      return 'bg-status-info text-status-info-foreground'
    case 'qualified':
      return 'bg-status-success text-status-success-foreground'
    case 'disqualified':
      return 'bg-status-error text-status-error-foreground'
    case 'contacted':
      return 'bg-status-info text-status-info-foreground'
    default:
      return 'bg-status-neutral text-status-neutral-foreground'
  }
}

/**
 * Returns Tailwind CSS classes for appointment status badges
 *
 * Color scheme:
 * - scheduled: Blue (upcoming appointments)
 * - completed: Green (past appointments)
 * - cancelled: Red (cancelled appointments)
 * - no_show: Gray (missed appointments)
 * - default: Gray (unknown/null)
 *
 * @param status - Appointment status from database
 * @returns Tailwind CSS classes string (e.g., "bg-status-info text-status-info-foreground")
 */
export function getAppointmentStatusColor(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled':
      return 'bg-status-info text-status-info-foreground'
    case 'completed':
      return 'bg-status-success text-status-success-foreground'
    case 'cancelled':
      return 'bg-status-error text-status-error-foreground'
    case 'no_show':
      return 'bg-status-neutral text-status-neutral-foreground'
    default:
      return 'bg-status-neutral text-status-neutral-foreground'
  }
}

/**
 * Returns Tailwind CSS classes for survey status badges
 *
 * Color scheme:
 * - active: Green (published surveys)
 * - draft: Warning (unpublished surveys)
 * - archived: Gray (archived surveys)
 * - default: Gray (unknown/null)
 *
 * @param status - Survey status from database
 * @returns Tailwind CSS classes string (e.g., "bg-status-success text-status-success-foreground")
 */
export function getSurveyStatusColor(status: SurveyStatus): string {
  switch (status) {
    case 'active':
      return 'bg-status-success text-status-success-foreground'
    case 'draft':
      return 'bg-status-warning text-status-warning-foreground'
    case 'archived':
      return 'bg-status-neutral text-status-neutral-foreground'
    default:
      return 'bg-status-neutral text-status-neutral-foreground'
  }
}
