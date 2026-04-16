import { createServerFn } from '@tanstack/react-start'
import { ok, err, ResultAsync } from 'neverthrow'
import { messages } from '@/lib/messages'
import { updateStatusSchema, updateNotesSchema } from '@/features/intake/validation'
import { getAuth, requireAuthContext, type AuthContext } from '@/lib/server-auth'

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
export const getPipelineResponsesFn = createServerFn().handler(async () => {
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
  return data || []
})

/**
 * Update response status from Pipeline drag-and-drop or Sheet status selector.
 * TanStack Start port of features/intake/actions.ts#updateResponseStatus.
 * Sets status_changed_at timestamp for pipeline sorting.
 */
export const updateResponseStatusFn = createServerFn()
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
export const updateInternalNotesFn = createServerFn()
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
