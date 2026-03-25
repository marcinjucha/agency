'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { renderEmailBlocks, DEFAULT_BLOCKS } from '@agency/email'
import type { Block } from '@agency/email'
import { updateEmailTemplateSchema } from './validation'
import { messages } from '@/lib/messages'

export async function updateEmailTemplate(
  type: string,
  data: { subject: string; blocks: Block[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = updateEmailTemplateSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const html_body = await renderEmailBlocks(parsed.data.blocks)

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from('email_templates')
      .upsert(
        {
          tenant_id: tenantId,
          type,
          subject: parsed.data.subject,
          blocks: parsed.data.blocks,
          html_body,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,type' }
      )

    if (upsertError) return { success: false, error: upsertError.message }

    revalidatePath('/admin/email-templates')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}

export async function resetEmailTemplateToDefault(
  type: string
): Promise<{ success: boolean; error?: string }> {
  return updateEmailTemplate(type, {
    subject: 'Dziękujemy za wypełnienie formularza - {{surveyTitle}}',
    blocks: DEFAULT_BLOCKS,
  })
}
