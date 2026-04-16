import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'
import { getAuth, requireAuthContext } from '@/lib/server-auth'
import { messages } from '@/lib/messages'
import type { AppointmentListItem, AppointmentResponseContext } from './types'

const deleteSchema = z.object({ id: z.string().uuid() })

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.appointments.deleteFailed

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformToListItem(data: any): AppointmentListItem {
  const responseContext: AppointmentResponseContext | null = data.response
    ? { id: data.response.id, status: data.response.status, created_at: data.response.created_at }
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

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

/**
 * Fetch all appointments for the authenticated user.
 * Mirrors getAppointments from queries.ts but uses server client.
 */
export const getAppointmentsFn = createServerFn({ method: 'POST' }).handler(async (): Promise<AppointmentListItem[]> => {
  const auth = await getAuth()
  if (!auth) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any)
    .from('appointments')
    .select('*, response:responses(id, status, created_at)')
    .eq('user_id', auth.userId)
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data || []).map(transformToListItem)
})

export const deleteAppointmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof deleteSchema>) => deleteSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await requireAuthContext()
      .andThen(({ supabase }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ResultAsync.fromPromise(
          (supabase as any).from('appointments').delete().eq('id', data.id),
          dbError,
        ),
      )

    return result.match(
      () => ({ success: true as const }),
      (error) => ({ success: false as const, error }),
    )
  })
