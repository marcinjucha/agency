import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Json } from '@agency/database'
import { requireAuthContextFull, hasPermission } from '@/lib/server-auth.server'
import { parseThemeTokens } from '@/lib/theme'
import { messages } from '@/lib/messages'
import {
  themeIdSchema,
  themeInputSchema,
  themeUsageInputSchema,
  updateThemeInputSchema,
  type ThemeInput,
} from './validation'
import type { Theme, ThemeReferences, ThemeUsage, ThemeWithUsage } from './types'

// ---------------------------------------------------------------------------
// Theme Manager (iter D2) — named-theme library CRUD (AUTHENTICATED admin layer).
//
// Structure mirrors features/venture/server.ts: exported PURE async functions
// (supabase injected) hold all the logic and are unit-tested directly; thin
// createServerFn wrappers below resolve auth then delegate. Tenant scoping is
// enforced twice — RLS (`tenant_id = current_user_tenant_id()`) AND an explicit
// `.eq('tenant_id', tenantId)` on every read/write (defense-in-depth, same as
// the venture handlers). Every createServerFn wrapper is permission-gated on
// `design.themes` via auth() (reads AND mutations) — the endpoints match the
// sidebar, which hides the section for users without the key.
//
// so_* insert/update types resolve to `never` in this Supabase JS version (see
// shop-categories / venture handler-base) AND @agency/database may resolve to
// MAIN's pre-so_themes types in a worktree — so table access is routed through an
// untyped structural client. Reads stay correct at runtime.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThemesDbClient = { from: (table: string) => any }

/** Value-producing mutation contract. `error` may be a code (`'nameTaken'`) the D3 UI localizes. */
type MutationResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Delete outcome. `'themeInUse'` is a structured guard (NOT a localized string) —
 * the D3 UI maps it to copy AND renders `usedBy` counts, same pattern as the
 * `'nameTaken'` code. Any other failure carries a localized message.
 */
export type DeleteThemeResult =
  | { success: true }
  | { success: false; error: 'themeInUse'; usedBy: ThemeReferences }
  | { success: false; error: string }

const PG_UNIQUE_VIOLATION = '23505'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** DB-boundary narrowing: a raw so_themes row → domain `Theme` (tokens narrowed). */
function toTheme(row: Record<string, unknown>): Theme {
  return {
    ...(row as unknown as Omit<Theme, 'tokens'>),
    tokens: parseThemeTokens((row as { tokens?: Json | null }).tokens ?? null),
  }
}

/**
 * Map a raw DB error from a create/update to a client-facing error. A
 * unique-name collision (the `(tenant_id, lower(name))` index) becomes the
 * `'nameTaken'` code the UI localizes; anything else logs the raw error
 * (developer-facing) and returns a generic localized message.
 */
function mapMutationError(error: { code?: string; message?: string } | null): string {
  if (error?.code === PG_UNIQUE_VIOLATION) return 'nameTaken'
  console.error('[themes] mutation failed:', error)
  return messages.common.unknownError
}

/** Count how many of the tenant's clients reference each theme_id (reverse FK). */
async function countClientUsageByTheme(
  supabase: ThemesDbClient,
  tenantId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const { data, error } = await supabase
    .from('so_clients')
    .select('theme_id')
    .eq('tenant_id', tenantId)
  if (error || !data) return counts
  for (const row of data as { theme_id: string | null }[]) {
    if (row.theme_id) counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1)
  }
  return counts
}

/**
 * Count how many campaigns reference each theme_id (reverse FK). `so_campaigns`
 * has NO `tenant_id` column, but filtering by `theme_id` is tenant-safe here:
 * `themeIds` are this tenant's own themes AND the cross-tenant theme write guard
 * (venture admin-handlers) forbids any campaign referencing a foreign theme — so
 * no other tenant's campaign can point at these ids.
 */
async function countCampaignUsageByTheme(
  supabase: ThemesDbClient,
  themeIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (themeIds.length === 0) return counts
  const { data, error } = await supabase
    .from('so_campaigns')
    .select('theme_id')
    .in('theme_id', themeIds)
  if (error || !data) return counts
  for (const row of data as { theme_id: string | null }[]) {
    if (row.theme_id) counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1)
  }
  return counts
}

/**
 * Count how many of the tenant's email templates reference each theme_id
 * (reverse FK). `email_templates` HAS a `tenant_id` column, so this scopes by it
 * directly (unlike `so_campaigns`).
 */
async function countEmailTemplateUsageByTheme(
  supabase: ThemesDbClient,
  tenantId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const { data, error } = await supabase
    .from('email_templates')
    .select('theme_id')
    .eq('tenant_id', tenantId)
  if (error || !data) return counts
  for (const row of data as { theme_id: string | null }[]) {
    if (row.theme_id) counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1)
  }
  return counts
}

// ---------------------------------------------------------------------------
// Pure handlers (supabase injected — unit-tested directly)
// ---------------------------------------------------------------------------

/** List the tenant's themes with reverse-FK usage counts (clients + campaigns). */
export async function listThemes(
  supabase: ThemesDbClient,
  tenantId: string,
): Promise<ThemeWithUsage[]> {
  const { data, error } = await supabase
    .from('so_themes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(messages.common.unknownError)

  const themes = ((data ?? []) as Record<string, unknown>[]).map(toTheme)
  if (themes.length === 0) return []

  const [clientCounts, campaignCounts, emailTemplateCounts] = await Promise.all([
    countClientUsageByTheme(supabase, tenantId),
    countCampaignUsageByTheme(
      supabase,
      themes.map((theme) => theme.id),
    ),
    countEmailTemplateUsageByTheme(supabase, tenantId),
  ])
  return themes.map((theme) => ({
    ...theme,
    usedBy: {
      clients: clientCounts.get(theme.id) ?? 0,
      campaigns: campaignCounts.get(theme.id) ?? 0,
      emailTemplates: emailTemplateCounts.get(theme.id) ?? 0,
    },
  }))
}

/** Fetch one theme scoped to the tenant, or null when it doesn't exist. */
export async function getTheme(
  supabase: ThemesDbClient,
  tenantId: string,
  id: string,
): Promise<Theme | null> {
  const { data, error } = await supabase
    .from('so_themes')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw new Error(messages.common.unknownError)
  if (!data) return null
  return toTheme(data as Record<string, unknown>)
}

/** Create a theme owned by the tenant. Unique name per tenant → `'nameTaken'` on 23505. */
export async function createTheme(
  supabase: ThemesDbClient,
  tenantId: string,
  input: ThemeInput,
): Promise<MutationResult<Theme>> {
  const { data, error } = await supabase
    .from('so_themes')
    .insert({ tenant_id: tenantId, name: input.name, tokens: input.tokens })
    .select('*')
    .single()
  if (error) return { success: false, error: mapMutationError(error) }
  return { success: true, data: toTheme(data as Record<string, unknown>) }
}

/** Update a theme (double-scoped id + tenant_id — a foreign id updates zero rows). */
export async function updateTheme(
  supabase: ThemesDbClient,
  tenantId: string,
  id: string,
  input: ThemeInput,
): Promise<MutationResult<Theme>> {
  const { data, error } = await supabase
    .from('so_themes')
    .update({ name: input.name, tokens: input.tokens })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()
  if (error) return { success: false, error: mapMutationError(error) }
  if (!data) return { success: false, error: messages.common.unknownError }
  return { success: true, data: toTheme(data as Record<string, unknown>) }
}

/**
 * Count the live references to a theme (delete guard). Blocks deletion while any
 * client, tenant, OR campaign still points at it — the FK is ON DELETE SET NULL,
 * so a raw delete would silently un-assign those rows. The `so_campaigns` count
 * filters by `theme_id` only (no `tenant_id` column): tenant-safe because `id` is
 * this tenant's own theme and the cross-tenant theme write guard forbids a
 * foreign campaign from referencing it.
 */
export async function getThemeReferences(
  supabase: ThemesDbClient,
  tenantId: string,
  id: string,
): Promise<ThemeReferences> {
  const [clientsRes, tenantsRes, campaignsRes, emailTemplatesRes] = await Promise.all([
    supabase.from('so_clients').select('id').eq('tenant_id', tenantId).eq('theme_id', id),
    supabase.from('tenants').select('id').eq('theme_id', id),
    supabase.from('so_campaigns').select('id').eq('theme_id', id),
    // email_templates HAS tenant_id → scope by it (tenant-safe, defense-in-depth).
    supabase.from('email_templates').select('id').eq('tenant_id', tenantId).eq('theme_id', id),
  ])
  const clients = ((clientsRes as { data: unknown[] | null }).data ?? []).length
  const tenants = ((tenantsRes as { data: unknown[] | null }).data ?? []).length
  const campaigns = ((campaignsRes as { data: unknown[] | null }).data ?? []).length
  const emailTemplates = ((emailTemplatesRes as { data: unknown[] | null }).data ?? []).length
  return { clients, tenants, campaigns, emailTemplates }
}

/** Delete a theme — refused (with the dependents listed) while it is still referenced. */
export async function deleteTheme(
  supabase: ThemesDbClient,
  tenantId: string,
  id: string,
): Promise<DeleteThemeResult> {
  const refs = await getThemeReferences(supabase, tenantId, id)
  if (refs.clients + refs.tenants + refs.campaigns + refs.emailTemplates > 0) {
    return { success: false, error: 'themeInUse', usedBy: refs }
  }
  const { error } = await supabase
    .from('so_themes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) {
    console.error('[themes] delete failed:', error)
    return { success: false, error: messages.common.unknownError }
  }
  return { success: true }
}

/**
 * Duplicate a theme: copy its tokens under a unique `"<name> (kopia)"`. The name
 * is made unique PROACTIVELY (case-insensitive, matching the DB index) so the
 * insert never trips the unique constraint on the common re-duplicate case.
 */
export async function duplicateTheme(
  supabase: ThemesDbClient,
  tenantId: string,
  id: string,
): Promise<MutationResult<Theme>> {
  const original = await getTheme(supabase, tenantId, id)
  if (!original) return { success: false, error: messages.common.unknownError }

  const existingNames = await fetchThemeNames(supabase, tenantId)
  const name = uniqueCopyName(original.name, existingNames)

  const { data, error } = await supabase
    .from('so_themes')
    .insert({ tenant_id: tenantId, name, tokens: original.tokens })
    .select('*')
    .single()
  if (error) return { success: false, error: mapMutationError(error) }
  return { success: true, data: toTheme(data as Record<string, unknown>) }
}

/** All existing theme names for the tenant (used to make a duplicate name unique). */
async function fetchThemeNames(
  supabase: ThemesDbClient,
  tenantId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('so_themes')
    .select('name')
    .eq('tenant_id', tenantId)
  if (error || !data) return []
  return (data as { name: string }[]).map((row) => row.name)
}

/**
 * Build `"<base> (kopia)"`, then `"(kopia 2)"`, `"(kopia 3)"`… until it doesn't
 * collide with an existing name (case-insensitive, matching the DB unique index).
 * Pure — unit-tested.
 */
export function uniqueCopyName(base: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()))
  const first = `${base} (kopia)`
  if (!taken.has(first.toLowerCase())) return first
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (kopia ${n})`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

/** Single-theme reverse-FK usage for the library "used by N" line (clients + campaigns). */
export async function getThemeUsage(
  supabase: ThemesDbClient,
  tenantId: string,
  id?: string,
): Promise<ThemeUsage> {
  if (!id) return { clients: 0, campaigns: 0, emailTemplates: 0 }
  const [clientsRes, campaignsRes, emailTemplatesRes] = await Promise.all([
    supabase.from('so_clients').select('id').eq('tenant_id', tenantId).eq('theme_id', id),
    // No tenant_id on so_campaigns — filter by theme_id only (tenant-safe, see
    // getThemeReferences / countCampaignUsageByTheme).
    supabase.from('so_campaigns').select('id').eq('theme_id', id),
    // email_templates HAS tenant_id → scope by it.
    supabase.from('email_templates').select('id').eq('tenant_id', tenantId).eq('theme_id', id),
  ])
  const clientsErr = (clientsRes as { error: unknown }).error
  const campaignsErr = (campaignsRes as { error: unknown }).error
  const emailTemplatesErr = (emailTemplatesRes as { error: unknown }).error
  const clients = clientsErr ? 0 : (((clientsRes as { data: unknown[] | null }).data ?? []).length)
  const campaigns = campaignsErr
    ? 0
    : ((campaignsRes as { data: unknown[] | null }).data ?? []).length
  const emailTemplates = emailTemplatesErr
    ? 0
    : ((emailTemplatesRes as { data: unknown[] | null }).data ?? []).length
  return { clients, campaigns, emailTemplates }
}

// ---------------------------------------------------------------------------
// createServerFn wrappers — resolve auth, then delegate to the pure handlers.
// ---------------------------------------------------------------------------

/**
 * Resolve auth AND gate on `design.themes`. Every theme server fn (reads AND
 * mutations) routes through here, so the HTTP-invokable endpoints match the
 * sidebar: a tenant member whose role lacks `design.themes` is rejected with the
 * standard no-permission error BEFORE any DB access. Mirrors the venture `gated`
 * helper (requireAuthContextFull → hasPermission), expressed as a throw so the
 * thin wrappers keep their `const { supabase, tenantId } = await auth()` shape.
 */
async function auth() {
  return requireAuthContextFull().match(
    (ctx) => {
      if (!hasPermission('design.themes', ctx.permissions)) {
        throw new Error(messages.common.noPermission)
      }
      return ctx
    },
    (error) => {
      throw new Error(error)
    },
  )
}

export const listThemesFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ThemeWithUsage[]> => {
    const { supabase, tenantId } = await auth()
    return listThemes(supabase, tenantId)
  },
)

export const getThemeFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof themeIdSchema>) => themeIdSchema.parse(v))
  .handler(async ({ data }): Promise<Theme | null> => {
    const { supabase, tenantId } = await auth()
    return getTheme(supabase, tenantId, data.id)
  })

export const createThemeFn = createServerFn({ method: 'POST' })
  .inputValidator((v: ThemeInput) => themeInputSchema.parse(v))
  .handler(async ({ data }): Promise<MutationResult<Theme>> => {
    const { supabase, tenantId } = await auth()
    return createTheme(supabase, tenantId, data)
  })

export const updateThemeFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof updateThemeInputSchema>) => updateThemeInputSchema.parse(v))
  .handler(async ({ data }): Promise<MutationResult<Theme>> => {
    const { supabase, tenantId } = await auth()
    return updateTheme(supabase, tenantId, data.id, data.data)
  })

export const deleteThemeFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof themeIdSchema>) => themeIdSchema.parse(v))
  .handler(async ({ data }): Promise<DeleteThemeResult> => {
    const { supabase, tenantId } = await auth()
    return deleteTheme(supabase, tenantId, data.id)
  })

export const duplicateThemeFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof themeIdSchema>) => themeIdSchema.parse(v))
  .handler(async ({ data }): Promise<MutationResult<Theme>> => {
    const { supabase, tenantId } = await auth()
    return duplicateTheme(supabase, tenantId, data.id)
  })

export const getThemeUsageFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof themeUsageInputSchema>) => themeUsageInputSchema.parse(v))
  .handler(async ({ data }): Promise<ThemeUsage> => {
    const { supabase, tenantId } = await auth()
    return getThemeUsage(supabase, tenantId, data.id)
  })
