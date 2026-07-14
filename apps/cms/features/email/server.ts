import { createServerFn } from '@tanstack/react-start'
import { err, ok, okAsync, ResultAsync } from 'neverthrow'
import { fromSupabaseVoid } from '@/lib/result-helpers'
import {
  updateEmailTemplateSchema,
  createEmailTemplateSchema,
  templateSlugSchema,
  themeIdFieldSchema,
} from '@/features/email/validation'
import { renderEmailBlocks, DEFAULT_BLOCKS } from './render.server'
import { resolveEmailThemeMap } from './utils/resolve-tenant-theme.server'
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

/**
 * Verify a per-template `theme_id` belongs to the caller's tenant BEFORE it is
 * persisted onto an `email_templates` row. NULL ("inherit the tenant theme") is
 * always allowed and skips the check. A non-null id that does NOT resolve under
 * the caller's tenant is REJECTED (standard no-permission) — never silently
 * nulled. WHY: the FK alone accepts ANY tenant's `so_themes.id`, and the n8n
 * mail path resolves the template theme server-side (service-role reads bypass
 * RLS), so a template pointed at another tenant's theme would bake that tenant's
 * tokens/logo into the sent email. Mirrors `assertThemeOwnedIfPresent` in
 * features/venture/admin-handlers.server.ts — this is the same cross-tenant
 * theme-leak bug class, on the email surface.
 */
export function assertThemeOwnedIfPresent(
  auth: AuthContext,
  themeId: string | null | undefined,
): ResultAsync<undefined, string> {
  if (!themeId) return okAsync(undefined)
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('so_themes')
      .select('id')
      .eq('id', themeId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string } | null; error: unknown }
    if (r.error) return err(dbError(r.error))
    // Missing OR belongs to another tenant → indistinguishable, both forbidden.
    if (!r.data) return err(messages.common.noPermission)
    return ok(undefined)
  })
}

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

// `themeId` (optional) lets the preview reflect the theme currently PICKED in
// the editor before it is saved — null/absent = the tenant default.
//
// UWAGA (bezpieczeństwo): zwracany HTML NIE przechodzi sanitizeHtmlUrls — jest
// bezpieczny WYŁĄCZNIE dlatego, że jedyny konsument (EmailPreview) renderuje go
// w iframe z sandbox="" (javascript: href jest inertny). Każde NOWE użycie tego
// fn poza sandboxowanym iframe (np. "wyślij testowy mail") MUSI przepuścić
// wynik przez sanitizeHtmlUrls — ścieżki wysyłkowe (n8n, venture) robią to
// na finalnym HTML po substytucji zmiennych.
const renderEmailPreviewSchema = z.object({
  blocks: updateEmailTemplateSchema.shape.blocks,
  themeId: themeIdFieldSchema,
})

export const renderEmailPreviewFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof renderEmailPreviewSchema>) => renderEmailPreviewSchema.parse(input))
  .handler(async ({ data: { blocks, themeId } }): Promise<{ html: string }> => {
    const result = await requireAuthContext().andThen(({ supabase, tenantId }) =>
      ResultAsync.fromPromise(
        (async () => {
          // Bake the SAME resolved theme map used at save into the preview HTML,
          // so preview colours match the stored html_body byte-for-byte. Honour
          // the picked (unsaved) theme so the preview updates live.
          const theme = await resolveEmailThemeMap(supabase, {
            tenantId,
            templateThemeId: themeId ?? null,
          })
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

const getResolvedEmailThemeInputSchema = z.object({ themeId: themeIdFieldSchema })

/**
 * Resolved theme map for the current tenant / picked template theme — powers the
 * editor's theme-token swatches (ThemeTokenSelect). Same map the preview + save
 * render paths use. Optional `themeId` reflects the theme picked in the editor
 * (null/absent = tenant default). Never-fail: resolveEmailThemeMap already
 * degrades to HALO_EFEKT_DEFAULT, so this always returns a full 9-token map (the
 * `.match` err arm is unreachable).
 */
export const getResolvedEmailThemeFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof getResolvedEmailThemeInputSchema>) =>
    getResolvedEmailThemeInputSchema.parse(input)
  )
  .handler(async ({ data }): Promise<ThemeColorMap> => {
    const result = await requireAuthContext().andThen(({ supabase, tenantId }) =>
      ResultAsync.fromPromise(
        resolveEmailThemeMap(supabase, { tenantId, templateThemeId: data.themeId ?? null }),
        dbError
      )
    )

    return result.match(
      (theme) => theme,
      () => ({}),
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
        // Pass `theme_id` THROUGH untouched: `undefined` (field absent) tells
        // saveTemplate to PRESERVE the stored theme; explicit `null` clears it to
        // inherit the tenant; a string sets it. Do NOT coalesce `?? null` here —
        // that would erase a per-template theme on any payload omitting the field.
        input.data.theme_id,
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
    // Reset also clears any per-template theme → back to inheriting the tenant.
    const result = await requireAuthContext().andThen((auth) =>
      saveTemplate(auth, data.type, defaultSubject, DEFAULT_BLOCKS, null)
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
// Delete-guard usage count (email_templates ← so_campaigns.email_template_id)
// ---------------------------------------------------------------------------

/** Campaigns that explicitly select this template (delete-warning payload). */
export interface EmailTemplateUsage {
  campaigns: number
  campaignNames: string[]
}

/**
 * Count campaigns that reference this template via
 * `so_campaigns.email_template_id` (reverse FK, ON DELETE SET NULL). Deleting the
 * template neither blocks nor cascades — it SILENTLY un-assigns every campaign
 * that selected it (each falls back to the tenant `venture_bonus` singleton) — so
 * the delete dialog must WARN the operator with this count first. Mirrors the
 * `so_themes` app-level delete-guard counters (`getThemeReferences` /
 * `getThemeUsage` in features/themes/server.ts) required by the memory rule
 * "every new FK to a delete-guarded reference table must be wired into its usage
 * counter".
 *
 * `deleteEmailTemplateFn` deletes by (tenant_id, type); campaign references are
 * keyed by the template's `id`, so we resolve the id under the caller's tenant
 * first. `so_campaigns` has NO `tenant_id` column, but filtering by
 * `email_template_id` alone is tenant-safe: the id is this tenant's own template,
 * the cross-tenant template write guard forbids a foreign campaign from pointing
 * at it, and RLS on `so_campaigns` scopes the read to the tenant regardless.
 */
export function getEmailTemplateUsage(
  auth: AuthContext,
  type: EmailTemplateType
): ResultAsync<EmailTemplateUsage, string> {
  return ResultAsync.fromPromise(
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = auth.supabase as any
      const { data: template } = await supabase
        .from('email_templates')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('type', type)
        .maybeSingle()
      // No persisted row (tenant still on the seeded default) → nothing can
      // select it, so there is nothing to un-assign.
      if (!template?.id) return { campaigns: 0, campaignNames: [] }

      const { data, error } = await supabase
        .from('so_campaigns')
        .select('display_name')
        .eq('email_template_id', template.id)
      if (error) throw new Error(dbError(error))
      const rows = (data ?? []) as { display_name: string | null }[]
      const campaignNames = rows
        .map((row) => row.display_name?.trim())
        .filter((name): name is string => Boolean(name))
      return { campaigns: rows.length, campaignNames }
    })(),
    dbError
  )
}

export const getEmailTemplateUsageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof getEmailTemplateInputSchema>) =>
    getEmailTemplateInputSchema.parse(input)
  )
  .handler(async ({ data }): Promise<EmailTemplateUsage> => {
    const result = await requireAuthContext().andThen((auth) =>
      getEmailTemplateUsage(auth, data.type)
    )
    return result.match(
      (usage) => usage,
      () => ({ campaigns: 0, campaignNames: [] })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

export function saveTemplate(
  auth: AuthContext,
  type: EmailTemplateType,
  subject: string,
  blocks: Block[],
  // `undefined` = field absent → PRESERVE the stored theme_id; `null` = clear to
  // inherit the tenant; a string = set that per-template theme.
  themeId: string | null | undefined,
  userEditedVariables?: TemplateVariable[],
  label?: string
): ResultAsync<undefined, string> {
  // SECURITY: reject a foreign-tenant theme_id BEFORE any render/persist — the
  // ownership gate mirrors the venture cross-tenant theme-leak guard. NULL and
  // undefined both skip (undefined preserves the already-validated stored id).
  return assertThemeOwnedIfPresent(auth, themeId).andThen(() =>
    ResultAsync.fromPromise(
      (async () => {
        // Fetch the existing row FIRST — it decides update-vs-insert AND, when the
        // caller omitted `theme_id` (undefined), supplies the value to preserve.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (auth.supabase as any)
          .from('email_templates')
          .select('id, theme_id')
          .eq('tenant_id', auth.tenantId)
          .eq('type', type)
          .maybeSingle()

        // theme_id semantics: `undefined` (field absent) PRESERVES the stored
        // theme; explicit `null` clears to inherit the tenant; a string sets it.
        // Distinguishing undefined from null is REQUIRED — coalescing `?? null`
        // silently wipes a per-template theme on any save that omits the field.
        const effectiveThemeId =
          themeId === undefined ? ((existing?.theme_id as string | null) ?? null) : themeId

        // Bake the effective theme colours into html_body at save — n8n reads this
        // stored HTML, so it MUST use the same resolved map as the live preview.
        // The template's own theme wins over the tenant default (id-selection in
        // resolveEmailThemeMap).
        const theme = await resolveEmailThemeMap(auth.supabase, {
          tenantId: auth.tenantId,
          templateThemeId: effectiveThemeId,
        })
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
        theme_id: effectiveThemeId,
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
  )
}

function insertTemplate(
  auth: AuthContext,
  type: EmailTemplateType,
  label: string
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    (async () => {
      // Neutral default with NO token — `{{firstName}}` was filled by NOTHING
      // (no trigger schema, no injector) → a guaranteed-literal leak at creation.
      const defaultSubject = 'Powiadomienie'
      // New templates inherit the tenant theme (theme_id null) — resolve with a
      // null override so html_body bakes the tenant-default colours.
      const theme = await resolveEmailThemeMap(auth.supabase, {
        tenantId: auth.tenantId,
        templateThemeId: null,
      })
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
        theme_id: null,
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
