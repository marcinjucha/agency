import { createServerClient } from '@/lib/supabase/server-start'
import type { Tables } from '@agency/database'
import type { EmailTemplate } from './types'

// Supabase returns `blocks` as generic Json (JSONB) — cast to typed EmailTemplate once here
function toEmailTemplate(raw: unknown): EmailTemplate {
  const row = raw as Tables<'email_templates'>
  return { ...row, blocks: Array.isArray(row.blocks) ? row.blocks : [] } as unknown as EmailTemplate
}

export async function getEmailTemplate(type: string): Promise<EmailTemplate | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('type', type)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toEmailTemplate(data)
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('type')

  if (error) throw error
  return (data ?? []).map(toEmailTemplate)
}
