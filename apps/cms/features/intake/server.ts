import { createServerFn } from '@tanstack/react-start'
import { createStartClient } from '@/lib/supabase/server-start'
import { messages } from '@/lib/messages'
import { updateStatusSchema, updateNotesSchema } from '@/features/intake/validation'

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
 * Update response status from Pipeline drag-and-drop or Sheet status selector.
 * TanStack Start port of features/intake/actions.ts#updateResponseStatus.
 * Sets status_changed_at timestamp for pipeline sorting.
 */
export const updateResponseStatusFn = createServerFn()
  .inputValidator((input: { responseId: string; status: string }) =>
    updateStatusSchema.parse(input)
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const auth = await getAuth()
      if (!auth) return { success: false, error: 'Not authenticated' }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue with update payload
      const { error } = await (auth.supabase as any)
        .from('responses')
        .update({
          status: data.status,
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', data.responseId)

      if (error) return { success: false, error: error.message }

      return { success: true }
    } catch {
      return { success: false, error: messages.intake.statusUpdateFailed }
    }
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
    try {
      const auth = await getAuth()
      if (!auth) return { success: false, error: 'Not authenticated' }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue with update payload
      const { error } = await (auth.supabase as any)
        .from('responses')
        .update({ internal_notes: data.notes })
        .eq('id', data.responseId)

      if (error) return { success: false, error: error.message }

      return { success: true }
    } catch {
      return { success: false, error: messages.intake.sheetNotesSaveFailed }
    }
  })
