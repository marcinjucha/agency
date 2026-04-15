import { createServerFn } from '@tanstack/react-start'
import { ok, err, ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import { updateEmailTemplateSchema } from '@/features/email/validation'
import { renderEmailBlocks, DEFAULT_BLOCKS } from '@agency/email'
import type { Block } from '@agency/email'
import type { Tables } from '@agency/database'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'
import type { EmailTemplate } from './types'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

type StartClient = ReturnType<typeof createStartClient>

type AuthContext = {
  supabase: StartClient
  userId: string
  tenantId: string
}

async function getAuth(): Promise<AuthContext | null> {
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

function requireAuthContext(): ResultAsync<AuthContext, string> {
  return ResultAsync.fromPromise(getAuth(), String).andThen((auth) =>
    auth ? ok(auth) : err('Not authenticated')
  )
}

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
  .inputValidator((input: { type: string }) => input)
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
  .inputValidator((input: { type: string; data: { subject: string; blocks: Block[] } }) => input)
  .handler(async ({ data: input }): Promise<{ success: boolean; error?: string }> => {
    const parsed = updateEmailTemplateSchema.safeParse(input.data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? messages.common.invalidData,
      }
    }

    const result = await requireAuthContext().andThen((auth) =>
      saveTemplate(auth, input.type, parsed.data.subject, parsed.data.blocks)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const resetEmailTemplateToDefaultFn = createServerFn()
  .inputValidator((input: { type: string }) => input)
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
  type: string,
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
