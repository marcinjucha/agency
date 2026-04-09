/**
 * Appointment Data Fetching Queries
 *
 * Browser client queries for appointment management in CMS.
 * All queries are filtered by current lawyer's ID from auth session.
 * Uses TanStack Query pattern with explicit return types.
 *
 * Authentication: Required for all queries (throws if not authenticated)
 * Authorization: RLS filters by tenant_id, queries filter by user_id
 * Client Type: Browser client (used with TanStack Query in components)
 *
 * @module apps/cms/features/appointments/queries
 */

import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'
import type { AppointmentListItem, AppointmentWithResponse, AppointmentResponseContext } from './types'

async function requireAuth(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Authentication required')
  return user
}

/**
 * Raw Supabase response structure from nested join query
 * Matches the select() query structure with nested responses table
 */
type SupabaseAppointmentRow = Tables<'appointments'> & {
  response: Tables<'responses'> | null
}

/**
 * Calculate duration in minutes between two timestamps
 * Rounds to nearest minute for display purposes
 *
 * @param startTime - ISO 8601 timestamp of appointment start
 * @param endTime - ISO 8601 timestamp of appointment end
 * @returns Duration in minutes (rounded)
 *
 * @example
 * calculateDuration('2026-01-20T10:00:00Z', '2026-01-20T11:30:00Z')
 * // returns 90
 */
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Transform Supabase nested response to AppointmentListItem
 * Converts nested responses structure to flat AppointmentResponseContext
 * Calculates duration_minutes from start_time and end_time
 * Maintains type safety by explicitly mapping to expected output type
 *
 * @param data - Raw Supabase appointment row with joined response
 * @returns Transformed appointment list item with computed fields
 */
function transformToListItem(data: SupabaseAppointmentRow): AppointmentListItem {
  const responseContext: AppointmentResponseContext | null = data.response
    ? {
        id: data.response.id,
        status: data.response.status,
        created_at: data.response.created_at,
      }
    : null

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    user_id: data.user_id,
    response_id: data.response_id,
    start_time: data.start_time,
    end_time: data.end_time,
    duration_minutes: calculateDuration(data.start_time, data.end_time),
    client_name: data.client_name,
    client_email: data.client_email,
    status: data.status,
    notes: data.notes,
    calendar_event_id: data.calendar_event_id,
    calendar_provider: data.calendar_provider,
    calendar_connection_id: data.calendar_connection_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    response: responseContext,
  }
}

/**
 * Fetch all appointments for the authenticated lawyer
 * Returns appointments ordered by start time (upcoming appointments first)
 * Includes optional joined response data for context
 *
 * Authentication: Required - throws if no user session
 * Authorization: Filtered by user_id = current user's ID
 * Sorting: start_time ASC (upcoming appointments first)
 *
 * @returns Array of appointments with computed duration and response context
 * @throws Error if not authenticated
 * @throws Error if query fails
 *
 * @example
 * const appointments = await getAppointments()
 * // [{
 * //   id: "a-123",
 * //   client_name: "John Doe",
 * //   start_time: "2026-01-20T10:00:00Z",
 * //   duration_minutes: 60,
 * //   status: "scheduled",
 * //   response: { id: "r-123", status: "qualified", ... }
 * // }]
 */
export async function getAppointments(): Promise<AppointmentListItem[]> {
  const supabase = createClient()
  const user = await requireAuth(supabase)

  // Fetch appointments with optional response join
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      response:responses(id, status, created_at)
    `
    )
    .eq('user_id', user.id)
    .order('start_time', { ascending: true })

  if (error) throw error

  return (data as SupabaseAppointmentRow[] || []).map(transformToListItem)
}

/**
 * Fetch a single appointment by ID with all related data
 * Returns null if appointment not found or user not authorized
 * Includes joined response data if available
 *
 * Authentication: Required - throws if no user session
 * Authorization: Must be owned by current user (user_id check)
 * Security: Prevents access to other lawyers' appointments
 *
 * @param id - Appointment UUID
 * @returns Appointment with response data or null if not found/unauthorized
 * @throws Error if not authenticated
 * @throws Error if query fails
 *
 * @example
 * const appointment = await getAppointmentById('a-123')
 * if (appointment) {
 *   console.log(appointment.client_name)
 *   console.log(appointment.response?.status)
 * }
 */
export async function getAppointmentById(id: string): Promise<AppointmentWithResponse | null> {
  const supabase = createClient()
  const user = await requireAuth(supabase)

  // Fetch single appointment with security check
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      response:responses(id, status, created_at)
    `
    )
    .eq('id', id)
    .eq('user_id', user.id) // Security: only own appointments
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // Transform response context if present
  const rawData = data as SupabaseAppointmentRow
  const responseContext: AppointmentResponseContext | null = rawData.response
    ? {
        id: rawData.response.id,
        status: rawData.response.status,
        created_at: rawData.response.created_at,
      }
    : null

  return {
    ...rawData,
    response: responseContext,
  } as AppointmentWithResponse
}

/**
 * Count total appointments for the authenticated lawyer
 * Used for dashboard statistics and analytics
 *
 * Authentication: Required - throws if no user session
 * Authorization: Filtered by user_id = current user's ID
 *
 * @returns Total appointment count for current lawyer
 * @throws Error if not authenticated
 * @throws Error if query fails
 *
 * @example
 * const totalAppointments = await getAppointmentCount()
 * console.log(`You have ${totalAppointments} total appointments`)
 */
export async function getAppointmentCount(): Promise<number> {
  const supabase = createClient()
  const user = await requireAuth(supabase)

  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (error) throw error
  return count || 0
}

/**
 * Count appointments by status for the authenticated lawyer
 * Used for dashboard statistics (scheduled, completed, cancelled counts)
 *
 * Authentication: Required - throws if no user session
 * Authorization: Filtered by user_id = current user's ID
 *
 * @param status - Appointment status to count
 * @returns Count of appointments with the specified status
 * @throws Error if not authenticated
 * @throws Error if query fails
 *
 * @example
 * const scheduledCount = await getAppointmentCountByStatus('scheduled')
 * const completedCount = await getAppointmentCountByStatus('completed')
 * console.log(`Scheduled: ${scheduledCount}, Completed: ${completedCount}`)
 */
export async function getAppointmentCountByStatus(status: string): Promise<number> {
  const supabase = createClient()
  const user = await requireAuth(supabase)

  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', status)

  if (error) throw error
  return count || 0
}
