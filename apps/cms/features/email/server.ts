import { createServerFn } from '@tanstack/react-start'
import { ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import {
  updateEmailTemplateSchema,
  createEmailTemplateSchema,
  templateSlugSchema,
} from '@/features/email/validation'
import { renderEmailBlocks, DEFAULT_BLOCKS } from './render.server'
import { resolveTenantThemeMap } from './utils/resolve-tenant-theme.server'
import type { Block, ThemeColorMap } from '@agency/email'
import type { Tables } from '@agency/database'
import { messages } from '@/lib/messages'
import { z } from 'zod'
import type { EmailTemplate, EmailTemplateType, TemplateVariable } from './types'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

// Template type at the wire boundary is a free-form slug (validated via
// `templateSlugSchema`) — no longer constrained to a hardcoded enum, since
// tenants can create custom slugs.
const emailTemplateTypeSchema = templateSlugSchema

const getEmailTemplateInputSchema = z.object({ type: emailTemplateTypeSchema })

const updateEmailTemplateInputSchema = z.object({
  type: emailTemplateTypeSchema,
  data: updateEmailTemplateSchema,
})

const resetEmailTemplateInputSchema = z.object({ type: emailTemplateTypeSchema })

const createEmailTemplateInputSchema = createEmailTemplateSchema

const deleteEmailTemplateInputSchema = z.object({ type: emailTemplateTypeSchema })

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
 * Parses raw JSONB template_variables from DB into typed TemplateVariable[].
 * Returns empty array for null / malformed data.
 *
 * `source` zwężamy do unii `'trigger' | 'manual' | undefined` — w DB mogą być
 * inne stringi (legacy / błędne wpisy), traktujemy je jak brak `source`.
 */
export function parseTemplateVariables(raw: unknown): TemplateVariable[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object' && typeof item.key === 'string')
    .map((item) => ({
      key: item.key as string,
      label: typeof item.label === 'string' ? item.label : (item.key as string),
      description: typeof item.description === 'string' ? item.description : undefined,
      source:
        item.source === 'manual'
          ? ('manual' as const)
          : item.source === 'trigger'
            ? ('trigger' as const)
            : undefined,
    }))
}

// ---------------------------------------------------------------------------
// Server Functions — Preview
// ---------------------------------------------------------------------------

const renderEmailPreviewSchema = z.object({ blocks: updateEmailTemplateSchema.shape.blocks })

export const renderEmailPreviewFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof renderEmailPreviewSchema>) => renderEmailPreviewSchema.parse(input))
  .handler(async ({ data: { blocks } }): Promise<{ html: string }> => {
    const result = await requireAuthContext().andThen(({ supabase, tenantId }) =>
      ResultAsync.fromPromise(
        (async () => {
          // Bake the SAME resolved theme map used at save into the preview HTML,
          // so preview colours match the stored html_body byte-for-byte.
          const theme = await resolveTenantThemeMap(supabase, tenantId)
          return renderEmailBlocks(blocks as Block[], theme)
        })(),
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

/**
 * Resolved theme map for the CURRENT tenant — powers the editor's theme-token
 * swatches (ThemeTokenSelect). Same map the preview + save render paths use.
 * Never-fail: resolveTenantThemeMap already degrades to HALO_EFEKT_DEFAULT, so
 * this always returns a full 9-token map (the `.match` err arm is unreachable).
 */
export const getResolvedEmailThemeFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ThemeColorMap> => {
    const result = await requireAuthContext().andThen(({ supabase, tenantId }) =>
      ResultAsync.fromPromise(resolveTenantThemeMap(supabase, tenantId), dbError)
    )

    return result.match(
      (theme) => theme,
      () => ({}),
    )
  }
)

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
        input.data.template_variables as TemplateVariable[] | undefined,
        input.data.label
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

export const createEmailTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof createEmailTemplateInputSchema>) =>
    createEmailTemplateInputSchema.parse(input)
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      insertTemplate(auth, data.type, data.label)
    )

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

export const deleteEmailTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof deleteEmailTemplateInputSchema>) =>
    deleteEmailTemplateInputSchema.parse(input)
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen(({ supabase, tenantId }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ResultAsync.fromPromise<{ error: unknown }, string>(
        (supabase as any)
          .from('email_templates')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('type', data.type),
        dbError
      )
    )

    return result.match(
      ({ error }) =>
        error ? { success: false, error: dbError(error) } : { success: true },
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
  userEditedVariables?: TemplateVariable[],
  label?: string
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    (async () => {
      // Bake tenant theme colours into html_body at save — n8n reads this stored
      // HTML, so it MUST use the same resolved map as the live preview.
      const theme = await resolveTenantThemeMap(auth.supabase, auth.tenantId)
      const html_body = await renderEmailBlocks(blocks, theme)

      // AAA-T-221 (2026-05-15): persist EXACTLY the user-managed list — no
      // server-side auto-merge with detected `{{key}}` tokens from content.
      // Previously the server was silently appending detected entries back
      // into template_variables even when the user had deleted them from the
      // inspector, making "delete" effectively impossible. The variable
      // picker autocomplete still uses live content detection (client-side),
      // so users can insert known variables — but the saved list is owned
      // entirely by the user.
      const template_variables = userEditedVariables ?? []

      // Check if template already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (auth.supabase as any)
        .from('email_templates')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('type', type)
        .maybeSingle()

      // `label` is included only when explicitly provided. Otherwise an update
      // without label would overwrite the stored value with undefined.
      // saveTemplate is only called from update / reset paths (both run against
      // existing rows), so NOT NULL on label is never violated here — new rows
      // go through `insertTemplate` which always passes label.
      const templatePayload = {
        tenant_id: auth.tenantId,
        type,
        subject,
        blocks,
        html_body,
        template_variables,
        is_active: true,
        updated_at: new Date().toISOString(),
        ...(label !== undefined ? { label } : {}),
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

function insertTemplate(
  auth: AuthContext,
  type: EmailTemplateType,
  label: string
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const defaultSubject = 'Temat wiadomości — {{firstName}}'
      const theme = await resolveTenantThemeMap(auth.supabase, auth.tenantId)
      const html_body = await renderEmailBlocks(DEFAULT_BLOCKS, theme)

      // AAA-T-221 (2026-05-15): no auto-seed. User decides which variables
      // to register via the Zmienne tab — empty list at creation time, opt-in
      // via "Wykryj z treści" button when they want auto-detection.
      const payload = {
        tenant_id: auth.tenantId,
        type,
        label,
        subject: defaultSubject,
        blocks: DEFAULT_BLOCKS,
        html_body,
        template_variables: [],
        is_active: true,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (auth.supabase as any).from('email_templates').insert(payload)
      if (error) {
        // 23505 = unique_violation on (tenant_id, type) — translate to user-facing message.
        if (typeof error === 'object' && error && 'code' in error && (error as { code: string }).code === '23505') {
          throw new Error(messages.email.slugAlreadyExists)
        }
        const msg =
          typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : messages.email.createFailed
        throw new Error(msg)
      }
    })(),
    dbError
  )
  // IIFE awaits insert + throws on error itself → ResultAsync<void, string> already.
  // NO .andThen(fromSupabaseVoid()) — IIFE returns undefined (implicit), and
  // fromSupabaseVoid would try to read `.error` on undefined.
}
