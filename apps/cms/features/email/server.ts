import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { updateEmailTemplateSchema } from '@/features/email/validation'
import { renderEmailBlocks, DEFAULT_BLOCKS } from './render.server'
import type { Block } from '@agency/email'
import type { Tables } from '@agency/database'
import { messages } from '@/lib/messages'
import { z } from 'zod'
import { TEMPLATE_TYPE_LABELS, type EmailTemplate, type EmailTemplateType, type TemplateVariable } from './types'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth.server'
import { extractTemplateVariableKeys } from './utils/extract-variable-keys'

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
  return {
    ...row,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
  } as unknown as EmailTemplate
}

/**
 * Scans subject + all block string values for {{variable}} patterns.
 * Returns empty array when no variables found (never null).
 * Delegates key extraction to the pure utility function.
 */
function extractTemplateVariables(subject: string, blocks: Block[]): TemplateVariable[] {
  return extractTemplateVariableKeys(subject, blocks).map((key) => ({
    key,
    label: key,
    source: 'trigger',
  }))
}

/**
 * Merges auto-detected variables with user-edited ones.
 * Preserves user-edited label/description for matching keys.
 * Prunes variables that are no longer detected in content.
 */
function mergeTemplateVariables(
  detected: TemplateVariable[],
  existing: TemplateVariable[]
): TemplateVariable[] {
  return detected.map((d) => {
    const userEdited = existing.find((e) => e.key === d.key)
    return userEdited
      ? { ...d, label: userEdited.label, description: userEdited.description }
      : d
  })
}

/**
 * Parses raw JSONB template_variables from DB into typed TemplateVariable[].
 * Returns empty array for null / malformed data.
 */
export function parseTemplateVariables(raw: unknown): TemplateVariable[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object' && typeof item.key === 'string')
    .map((item) => ({
      key: item.key as string,
      label: typeof item.label === 'string' ? item.label : (item.key as string),
      description: typeof item.description === 'string' ? item.description : undefined,
      source: typeof item.source === 'string' ? item.source : undefined,
    }))
}

// ---------------------------------------------------------------------------
// Server Functions — Preview
// ---------------------------------------------------------------------------

const renderEmailPreviewSchema = z.object({ blocks: updateEmailTemplateSchema.shape.blocks })

export const renderEmailPreviewFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof renderEmailPreviewSchema>) => renderEmailPreviewSchema.parse(input))
  .handler(async ({ data: { blocks } }): Promise<{ html: string }> => {
    const result = await requireAuthContext().andThen(() =>
      ResultAsync.fromPromise(
        renderEmailBlocks(blocks as Block[]),
        (e) => (e instanceof Error ? e.message : messages.common.unknownError)
      )
    )

    return result.match(
      (html) => ({ html }),
      (error) => {
        throw new Error(error)
      }
    )
  })

// ---------------------------------------------------------------------------
// Server Functions — Queries
// ---------------------------------------------------------------------------

export const getEmailTemplatesFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<EmailTemplate[]> => {
    const result = await requireAuthContext().andThen(({ supabase }) =>
      ResultAsync.fromPromise<{ data: unknown[] | null; error: unknown }, string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('email_templates').select('*').order('type'),
        dbError
      )
    )

    return result.match(
      ({ data, error }) => {
        if (error) throw error
        return (data ?? []).map(toEmailTemplate)
      },
      (error) => {
        throw new Error(error)
      }
    )
  }
)

export const getEmailTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof getEmailTemplateInputSchema>) => getEmailTemplateInputSchema.parse(input))
  .handler(async ({ data }): Promise<EmailTemplate | null> => {
    const result = await requireAuthContext().andThen(({ supabase }) =>
      ResultAsync.fromPromise<{ data: unknown | null; error: unknown }, string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('email_templates').select('*').eq('type', data.type).maybeSingle(),
        dbError
      )
    )

    return result.match(
      ({ data: row, error }) => {
        if (error) throw error
        if (!row) return null
        return toEmailTemplate(row)
      },
      (error) => {
        throw new Error(error)
      }
    )
  })

// ---------------------------------------------------------------------------
// Server Functions — Mutations
// ---------------------------------------------------------------------------

export const updateEmailTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof updateEmailTemplateInputSchema>) => updateEmailTemplateInputSchema.parse(input))
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      saveTemplate(
        auth,
        input.type,
        input.data.subject,
        input.data.blocks,
        input.data.template_variables as TemplateVariable[] | undefined
      )
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const resetEmailTemplateToDefaultFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof resetEmailTemplateInputSchema>) => resetEmailTemplateInputSchema.parse(input))
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
  blocks: Block[],
  userEditedVariables?: TemplateVariable[]
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const html_body = await renderEmailBlocks(blocks)

      // Auto-detect variables from content, then merge with user-edited labels/descriptions
      const detected = extractTemplateVariables(subject, blocks)
      const template_variables = userEditedVariables
        ? mergeTemplateVariables(detected, userEditedVariables)
        : detected

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
