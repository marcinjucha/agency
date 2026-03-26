'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { legalPageSchema, type LegalPageFormData } from './validation'
import { parseContent, generateHtmlFromContent } from '../editor/utils'
import { messages } from '@/lib/messages'
import type { TiptapContent } from '../editor/types'
import type { Tables } from '@agency/database'

export async function updateLegalPage(
  id: string,
  data: LegalPageFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = legalPageSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase } = auth

    const content = parseContent(parsed.data.content) as TiptapContent
    const htmlBody = generateHtmlFromContent(content)

    const payload: Partial<Tables<'pages'>> = {
      title: parsed.data.title,
      blocks: content as unknown as Tables<'pages'>['blocks'],
      html_body: htmlBody,
      is_published: parsed.data.is_published,
    }

    // Supabase .update() parameter resolves to `never` for pages table (known Supabase JS v2 issue)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pages')
      .update(payload)
      .eq('id', id)
      .eq('page_type', 'legal')

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/legal-pages')
    revalidatePath(`/admin/legal-pages/${id}`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
