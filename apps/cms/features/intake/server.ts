import { createServerFn } from '@tanstack/react-start'
import { ok, err, ResultAsync } from 'neverthrow'
import { messages } from '@/lib/messages'
import { updateStatusSchema, updateNotesSchema } from '@/features/intake/validation'
import { getAuth, requireAuthContext, type AuthContext } from '@/lib/server-auth'
import { extractClientInfo } from './queries'
import type { AIQualification } from '../responses/types'
import type { PipelineResponse, IntakeStats } from './types'

// ---------------------------------------------------------------------------
// DB error mapper
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Fetch pipeline responses for Intake Hub.
 * Used by route loader ensureQueryData + IntakeHub useQuery.
 * Mirrors getPipelineResponses from queries.ts but uses server client.
 */
export const getPipelineResponsesFn = createServerFn({ method: 'POST' }).handler(async (): Promise<PipelineResponse[]> => {
  const auth = await getAuth()
  if (!auth) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any)
    .from('responses')
    .select(`
      id, status, answers, ai_qualification, created_at, internal_notes, status_changed_at, survey_link_id,
      survey_links(survey_id, surveys(title, questions)),
      appointments(id, start_time, end_time, status)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any, index: number) => {
    const ai = row.ai_qualification as AIQualification | null
    const answers = (row.answers ?? {}) as Record<string, unknown>
    const clientInfo = extractClientInfo(answers, row.survey_links?.surveys?.questions ?? [], index + 1)

    return {
      id: row.id,
      status: row.status ?? 'new',
      clientName: clientInfo.name,
      clientEmail: clientInfo.email,
      companyName: clientInfo.companyName,
      phone: clientInfo.phone,
      aiScore: ai?.overall_score ?? null,
      aiRecommendation: ai?.recommendation ?? null,
      createdAt: row.created_at,
      hasAppointment: !!(row.appointments && row.appointments.length > 0),
      appointment: row.appointments?.[0]
        ? { startTime: row.appointments[0].start_time, endTime: row.appointments[0].end_time, status: row.appointments[0].status }
        : null,
      internalNotes: row.internal_notes,
      statusChangedAt: row.status_changed_at,
      answers: answers as PipelineResponse['answers'],
      surveyTitle: row.survey_links?.surveys?.title ?? 'Nieznana ankieta',
      surveyQuestions: (row.survey_links?.surveys?.questions ?? []) as unknown[],
      surveyLinkId: row.survey_link_id,
    }
  })
})

/**
 * Fetch intake stats: counts for new responses, contacted, and today/tomorrow appointments.
 * Used by StatsBar component. Mirrors getIntakeStats from queries.ts but uses server client.
 */
export const getIntakeStatsFn = createServerFn({ method: 'POST' }).handler(async (): Promise<IntakeStats> => {
  const auth = await getAuth()
  if (!auth) return { newResponses: 0, waitingForContact: 0, appointmentsToday: 0, appointmentsTomorrow: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = auth.supabase as any

  const todayApptQuery = supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
  if (auth.userId) todayApptQuery.eq('user_id', auth.userId)

  const tomorrowApptQuery = supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_time', tomorrow.toISOString())
    .lt('start_time', dayAfter.toISOString())
  if (auth.userId) tomorrowApptQuery.eq('user_id', auth.userId)

  const [newRes, contactedRes, todayAppt, tomorrowAppt] = await Promise.all([
    supabase.from('responses').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('responses').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
    todayApptQuery,
    tomorrowApptQuery,
  ])

  return {
    newResponses: newRes.count ?? 0,
    waitingForContact: contactedRes.count ?? 0,
    appointmentsToday: todayAppt.count ?? 0,
    appointmentsTomorrow: tomorrowAppt.count ?? 0,
  }
})

/**
 * Update response status from Pipeline drag-and-drop or Sheet status selector.
 * TanStack Start port of features/intake/actions.ts#updateResponseStatus.
 * Sets status_changed_at timestamp for pipeline sorting.
 */
export const updateResponseStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { responseId: string; status: string }) =>
    updateStatusSchema.parse(input)
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      updateStatus(auth, data.responseId, data.status),
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error: String(error) }),
    )
  })

/**
 * Update internal notes for a response from the Sheet detail view.
 * TanStack Start port of features/intake/actions.ts#updateInternalNotes.
 * Notes are CMS-internal (not visible to clients).
 */
export const updateInternalNotesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { responseId: string; notes: string }) =>
    updateNotesSchema.parse(input)
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      updateNotes(auth, data.responseId, data.notes),
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error: String(error) }),
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function updateStatus(auth: AuthContext, responseId: string, status: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue with update payload
    (auth.supabase as any)
      .from('responses')
      .update({ status, status_changed_at: new Date().toISOString() })
      .eq('id', responseId) as Promise<{ error: { message: string } | null }>,
    dbError,
  ).andThen(({ error }) => (error ? err(error.message) : ok(undefined)))
}

function updateNotes(auth: AuthContext, responseId: string, notes: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue with update payload
    (auth.supabase as any)
      .from('responses')
      .update({ internal_notes: notes })
      .eq('id', responseId) as Promise<{ error: { message: string } | null }>,
    dbError,
  ).andThen(({ error }) => (error ? err(error.message) : ok(undefined)))
}
