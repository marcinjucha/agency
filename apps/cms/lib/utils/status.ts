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
 * - contacted: Purple (contacted clients)
 * - default: Gray (unknown/null)
 *
 * @param status - Response status from database
 * @returns Tailwind CSS classes string (e.g., "bg-blue-100 text-blue-800")
 */
export function getResponseStatusColor(status: ResponseStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800'
    case 'qualified':
      return 'bg-green-100 text-green-800'
    case 'disqualified':
      return 'bg-red-100 text-red-800'
    case 'contacted':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
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
 * @returns Tailwind CSS classes string (e.g., "bg-blue-100 text-blue-800")
 */
export function getAppointmentStatusColor(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'no_show':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Returns Tailwind CSS classes for survey status badges
 *
 * Color scheme:
 * - active: Green (published surveys)
 * - draft: Yellow (unpublished surveys)
 * - archived: Gray (archived surveys)
 * - default: Gray (unknown/null)
 *
 * @param status - Survey status from database
 * @returns Tailwind CSS classes string (e.g., "bg-green-100 text-green-700")
 */
export function getSurveyStatusColor(status: SurveyStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700'
    case 'draft':
      return 'bg-yellow-100 text-yellow-700'
    case 'archived':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
