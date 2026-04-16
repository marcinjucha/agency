import { createServerFn } from '@tanstack/react-start'
import { okAsync, errAsync, ResultAsync } from 'neverthrow'
import { messages } from '@/lib/messages'
import { getAuth, requireAuthContext, type AuthContext } from '@/lib/server-auth'

// ---------------------------------------------------------------------------
// DB error mapper
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Delete a response, checking for and removing linked appointment first.
 * TanStack Start port of features/responses/actions.ts#deleteResponse.
 */
export const deleteResponseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string; hadAppointment?: boolean }> => {
      const result = await requireAuthContext().andThen((auth) =>
        deleteResponseWithCleanup(auth, data.id),
      )

      return result.match(
        ({ hadAppointment }) => ({ success: true, hadAppointment }),
        (error) => ({ success: false, error }),
      )
    },
  )

/**
 * Trigger AI analysis for a response via n8n webhook.
 * TanStack Start port of features/responses/actions.ts#triggerAiAnalysis.
 * process.env is safe here — createServerFn is server-only.
 */
export const triggerAiAnalysisFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { responseId: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const auth = await getAuth()
    if (!auth) return { success: false, error: 'Not authenticated' }

    const webhookUrl = process.env.N8N_WEBHOOK_SURVEY_ANALYSIS_URL
    if (!webhookUrl) {
      return { success: false, error: 'N8N_WEBHOOK_SURVEY_ANALYSIS_URL not configured' }
    }

    const result = await ResultAsync.fromPromise(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: data.responseId }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Webhook returned ${res.status}`)
        return res
      }),
      dbError,
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error }),
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function deleteResponseWithCleanup(auth: AuthContext, responseId: string) {
  return checkLinkedAppointment(auth, responseId).andThen(({ appointmentExists }) =>
    (appointmentExists ? deleteAppointment(auth, responseId) : okAsync(undefined)).andThen(() =>
      deleteResponseRow(auth, responseId).map(() => ({ hadAppointment: appointmentExists })),
    ),
  )
}

function checkLinkedAppointment(auth: AuthContext, responseId: string) {
  return ResultAsync.fromPromise(
    auth.supabase.from('appointments').select('id').eq('response_id', responseId).maybeSingle(),
    dbError,
  ).andThen(({ data, error }) => {
    if (error) return errAsync(error.message)
    return okAsync({ appointmentExists: !!data })
  })
}

function deleteAppointment(auth: AuthContext, responseId: string) {
  return ResultAsync.fromPromise(
    auth.supabase.from('appointments').delete().eq('response_id', responseId),
    dbError,
  ).andThen(({ error }) => {
    if (error) return errAsync(error.message)
    return okAsync(undefined)
  })
}

function deleteResponseRow(auth: AuthContext, responseId: string) {
  return ResultAsync.fromPromise(
    auth.supabase.from('responses').delete().eq('id', responseId),
    dbError,
  ).andThen(({ error }) => {
    if (error) return errAsync(error.message)
    return okAsync(undefined)
  })
}
