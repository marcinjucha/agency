import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'
import { extractClientInfo } from '@agency/validators'
import { getAuth, requireAuthContext } from '@/lib/server-auth.server'
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

/**
 * Map a joined appointments row → AppointmentListItem.
 *
 * Client name/email are derived from the joined response's `answers` JSONB
 * via `extractClientInfo` (using the survey's `questions` for `semantic_role`
 * lookup). The response is the single source of truth for client identity.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformToListItem(data: any, fallbackIndex: number): AppointmentListItem {
  const responseContext: AppointmentResponseContext | null = data.response
    ? { id: data.response.id, status: data.response.status, created_at: data.response.created_at }
    : null

  const derived = data.response
    ? extractClientInfo(
        (data.response.answers ?? {}) as Record<string, unknown>,
        (data.response.survey_links?.surveys?.questions ?? []) as unknown[],
        fallbackIndex,
      )
    : null

  const clientName = derived?.name ?? messages.appointments.unknownClient
  const clientEmail = derived?.email ?? null

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    user_id: data.user_id,
    response_id: data.response_id,
    start_time: data.start_time,
    end_time: data.end_time,
    duration_minutes: calculateDuration(data.start_time, data.end_time),
    client_name: clientName,
    client_email: clientEmail,
    status: data.status,
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
 *
 * Joins the response → survey_links → surveys chain so `transformToListItem`
 * can derive client name/email from `answers` JSONB via `semantic_role` markers.
 * Mirrors the join shape used in `features/intake/server.ts#getPipelineResponsesFn`.
 */
export const getAppointmentsFn = createServerFn({ method: 'POST' }).handler(async (): Promise<AppointmentListItem[]> => {
  const auth = await getAuth()
  if (!auth) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any)
    .from('appointments')
    .select(`
      *,
      response:responses(
        id, status, created_at, answers,
        survey_links(surveys(questions))
      )
    `)
    .eq('user_id', auth.userId)
    .order('start_time', { ascending: true })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any, index: number) => transformToListItem(row, index + 1))
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
