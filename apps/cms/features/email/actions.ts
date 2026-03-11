'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { renderEmailBlocks, DEFAULT_BLOCKS } from '@agency/email'
import type { Block } from '@agency/email'
import type { Json, Tables } from '@agency/database'
import { updateEmailTemplateSchema } from './validation'

export async function updateEmailTemplate(
  type: string,
  data: { subject: string; blocks: Block[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = updateEmailTemplateSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? 'Nieprawidłowe dane' }
    }

    const html_body = await renderEmailBlocks(parsed.data.blocks)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nie zalogowany' }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    if (userError || !userData) return { success: false, error: 'Nie znaleziono użytkownika' }
    const userWithTenant = userData as Pick<Tables<'users'>, 'tenant_id'>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from('email_templates')
      .upsert(
        {
          tenant_id: userWithTenant.tenant_id,
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
    const message = err instanceof Error ? err.message : 'Nieznany błąd'
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
