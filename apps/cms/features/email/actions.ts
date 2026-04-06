'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { renderEmailBlocks, DEFAULT_BLOCKS } from '@agency/email'
import type { Block } from '@agency/email'
import { updateEmailTemplateSchema } from './validation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

/**
 * Scans subject + all block string values for {{variable}} patterns.
 * Returns unique variable metadata for DB storage.
 */
function extractTemplateVariables(
  subject: string,
  blocks: Block[]
): { key: string; label: string; source: string }[] | null {
  const variableRegex = /\{\{(\w+)\}\}/g
  const keys = new Set<string>()

  // Scan subject line
  for (const match of subject.matchAll(variableRegex)) {
    keys.add(match[1])
  }

  // Recursively scan all string values in blocks JSONB
  function scanValue(value: unknown): void {
    if (typeof value === 'string') {
      for (const match of value.matchAll(variableRegex)) {
        keys.add(match[1])
      }
    } else if (Array.isArray(value)) {
      for (const item of value) scanValue(item)
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value)) scanValue(v)
    }
  }

  scanValue(blocks)

  if (keys.size === 0) return null

  return Array.from(keys).map((key) => ({
    key,
    label: key,
    source: 'trigger',
  }))
}

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

    // Extract variable keys used in blocks (scan all string values for {{...}} pattern)
    const template_variables = extractTemplateVariables(parsed.data.subject, parsed.data.blocks)

    const auth = await requireAuth('system.email_templates')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // Check if template already exists (cannot use upsert — partial unique index
    // on tenant_id+type WHERE type != 'workflow_custom' breaks ON CONFLICT)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('email_templates')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .maybeSingle()

    const templatePayload = {
      tenant_id: tenantId,
      type,
      subject: parsed.data.subject,
      blocks: parsed.data.blocks,
      html_body,
      template_variables,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveError } = existing
      ? await (supabase as any)
          .from('email_templates')
          .update(templatePayload)
          .eq('id', existing.id)
      : await (supabase as any)
          .from('email_templates')
          .insert(templatePayload)

    if (saveError) {
      console.error('[EMAIL_TEMPLATE] Save failed:', saveError.message, saveError.code, saveError.details)
      return { success: false, error: saveError.message }
    }

    revalidatePath(routes.admin.emailTemplates)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[EMAIL_TEMPLATE] Unexpected error:', message)
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
