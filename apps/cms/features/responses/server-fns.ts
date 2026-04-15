import { createServerFn } from '@tanstack/react-start'
import { createStartClient } from '@/lib/supabase/server-start'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// Auth helper — shared pattern for this module
// ---------------------------------------------------------------------------

async function getAuth() {
  const supabase = createStartClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return null

  return { supabase, userId: user.id, tenantId: userData.tenant_id as string }
}

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Delete a response, checking for and removing linked appointment first.
 * TanStack Start port of features/responses/actions.ts#deleteResponse.
 */
export const deleteResponseFn = createServerFn()
  .inputValidator((input: { id: string }) => input)
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string; hadAppointment?: boolean }> => {
      try {
        const auth = await getAuth()
        if (!auth) return { success: false, error: 'Not authenticated' }

        const { supabase } = auth

        // Check if response has a linked appointment
        const { data: appointment } = await supabase
          .from('appointments')
          .select('id')
          .eq('response_id', data.id)
          .maybeSingle()

        // Delete appointment first to avoid FK constraint violation
        if (appointment) {
          const { error: appointmentError } = await supabase
            .from('appointments')
            .delete()
            .eq('response_id', data.id)

          if (appointmentError) return { success: false, error: appointmentError.message }
        }

        const { error } = await supabase.from('responses').delete().eq('id', data.id)
        if (error) return { success: false, error: error.message }

        return { success: true, hadAppointment: !!appointment }
      } catch {
        return { success: false, error: messages.responses.deleteFailed }
      }
    }
  )

/**
 * Trigger AI analysis for a response via n8n webhook.
 * TanStack Start port of features/responses/actions.ts#triggerAiAnalysis.
 * process.env is safe here — createServerFn is server-only.
 */
export const triggerAiAnalysisFn = createServerFn()
  .inputValidator((input: { responseId: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const auth = await getAuth()
    if (!auth) return { success: false, error: 'Not authenticated' }

    const webhookUrl = process.env.N8N_WEBHOOK_SURVEY_ANALYSIS_URL
    if (!webhookUrl) {
      return { success: false, error: 'N8N_WEBHOOK_SURVEY_ANALYSIS_URL not configured' }
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: data.responseId }),
      })

      if (!res.ok) return { success: false, error: `Webhook returned ${res.status}` }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : messages.common.unknownError }
    }
  })
