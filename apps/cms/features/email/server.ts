import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { updateEmailTemplateSchema } from '@/features/email/validation'
import { renderEmailBlocks, DEFAULT_BLOCKS } from '@agency/email'
import type { Block } from '@agency/email'
import type { Tables } from '@agency/database'
import { messages } from '@/lib/messages'
import { z } from 'zod'
import { TEMPLATE_TYPE_LABELS, type EmailTemplate, type EmailTemplateType } from './types'
import { createStartClient } from '@/lib/supabase/server-start'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const emailTemplateTypeSchema = z.enum(
  Object.keys(TEMPLATE_TYPE_LABELS) as [keyof typeof TEMPLATE_TYPE_LABELS, ...Array<keyof typeof TEMPLATE_TYPE_LABELS>]
)

const getEmailTemplateInputSchema = z.object({ type: emailTemplateTypeSchema })

const updateEmailTemplateInputSchema = z.object({
  type: emailTemplateTypeSchema,
  data: updateEmailTemplateSchema,
})

const resetEmailTemplateInputSchema = z.object({ type: emailTemplateTypeSchema })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

function toEmailTemplate(raw: unknown): EmailTemplate {
  const row = raw as Tables<'email_templates'>
  return { ...row, blocks: Array.isArray(row.blocks) ? row.blocks : [] } as unknown as EmailTemplate
}

/**
 * Scans subject + all block string values for {{variable}} patterns.
 */
function extractTemplateVariables(
  subject: string,
  blocks: Block[]
): { key: string; label: string; source: string }[] | null {
  const variableRegex = /\{\{(\w+)\}\}/g
  const keys = new Set<string>()

  for (const match of subject.matchAll(variableRegex)) {
    keys.add(match[1])
  }

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

// ---------------------------------------------------------------------------
// Server Functions — Preview
// ---------------------------------------------------------------------------

export const renderEmailPreviewFn = createServerFn()
  .inputValidator((input: unknown) => z.object({ blocks: z.array(z.any()) }).parse(input))
  .handler(async ({ data: { blocks } }): Promise<{ html: string }> => {
    const html = await renderEmailBlocks(blocks as Block[])
    return { html }
  })

// ---------------------------------------------------------------------------
// Server Functions — Queries
// ---------------------------------------------------------------------------

export const getEmailTemplatesFn = createServerFn().handler(
  async (): Promise<EmailTemplate[]> => {
    const supabase = createStartClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('email_templates')
      .select('*')
      .order('type')

    if (error) throw error
    return (data ?? []).map(toEmailTemplate)
  }
)

export const getEmailTemplateFn = createServerFn()
  .inputValidator((input: unknown) => getEmailTemplateInputSchema.parse(input))
  .handler(async ({ data }): Promise<EmailTemplate | null> => {
    const supabase = createStartClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('type', data.type)
      .maybeSingle()

    if (error) throw error
    if (!row) return null
    return toEmailTemplate(row)
  })

// ---------------------------------------------------------------------------
// Server Functions — Mutations
// ---------------------------------------------------------------------------

export const updateEmailTemplateFn = createServerFn()
  .inputValidator((input: unknown) => updateEmailTemplateInputSchema.parse(input))
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      saveTemplate(auth, input.type, input.data.subject, input.data.blocks)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const resetEmailTemplateToDefaultFn = createServerFn()
  .inputValidator((input: unknown) => resetEmailTemplateInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const defaultSubject = 'Dziękujemy za wypełnienie formularza - {{surveyTitle}}'
    const result = await requireAuthContext().andThen((auth) =>
      saveTemplate(auth, data.type, defaultSubject, DEFAULT_BLOCKS)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function saveTemplate(
  auth: AuthContext,
  type: EmailTemplateType,
  subject: string,
  blocks: Block[]
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const html_body = await renderEmailBlocks(blocks)
      const template_variables = extractTemplateVariables(subject, blocks)

      // Check if template already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (auth.supabase as any)
        .from('email_templates')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('type', type)
        .maybeSingle()

      const templatePayload = {
        tenant_id: auth.tenantId,
        type,
        subject,
        blocks,
        html_body,
        template_variables,
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      return existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (auth.supabase as any).from('email_templates').update(templatePayload).eq('id', existing.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (auth.supabase as any).from('email_templates').insert(templatePayload)
    })(),
    dbError
  ).andThen(fromSupabaseVoid())
}
