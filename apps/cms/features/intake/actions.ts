'use server'

import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { updateStatusSchema, updateNotesSchema } from './validation'

/**
 * Update response status from Pipeline drag-and-drop or Sheet status selector.
 * Sets status_changed_at timestamp for pipeline sorting.
 */
export async function updateResponseStatus(
  responseId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('intake', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }

    const parsed = updateStatusSchema.safeParse({ responseId, status: newStatus })
    if (!parsed.success) return { success: false, error: messages.common.invalidData }

    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue with update payload
    const { error } = await (supabase as any)
      .from('responses')
      .update({
        status: parsed.data.status,
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.responseId)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.intake)
    return { success: true }
  } catch {
    return { success: false, error: messages.intake.statusUpdateFailed }
  }
}

/**
 * Update internal notes for a response from the Sheet detail view.
 * Notes are CMS-internal (not visible to clients).
 */
export async function updateInternalNotes(
  responseId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('intake', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }

    const parsed = updateNotesSchema.safeParse({ responseId, notes })
    if (!parsed.success) return { success: false, error: messages.common.invalidData }

    const { supabase } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue with update payload
    const { error } = await (supabase as any)
      .from('responses')
      .update({ internal_notes: parsed.data.notes })
      .eq('id', parsed.data.responseId)

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.intake)
    return { success: true }
  } catch {
    return { success: false, error: messages.intake.sheetNotesSaveFailed }
  }
}
