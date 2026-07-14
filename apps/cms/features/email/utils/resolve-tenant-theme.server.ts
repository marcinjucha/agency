import type { Json } from '@agency/database'
import type { ThemeColorMap } from '@agency/email'
import { resolveClientTheme } from '@/lib/theme'
import { fetchThemeTokens } from '@/lib/theme/fetch.server'
import type { StartClient } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// Email-templates client-theming — server-side email theme resolution.
//
// The CMS email-templates surface is TENANT-scoped by default, with an OPTIONAL
// per-template override (`email_templates.theme_id` → a named `so_themes` row).
// This helper turns the effective theme into ONE flat `ThemeColorMap`
// (token key → literal hex) that the @agency/email renderer consumes as its 2nd
// arg — the SAME map is used for live preview AND baked into the persisted
// `html_body` at save, so n8n (which reads html_body) renders identical colours.
//
// PRECEDENCE (lives HERE, in id-selection — the pure `resolveClientTheme` is
// untouched): a template's own `theme_id` wins over the tenant default:
//   effectiveThemeId = templateThemeId ?? tenantRow.theme_id
// The inline `tenants.theme` JSONB is ONLY a fallback for the tenant-default
// path — a template that names a theme_id must NOT silently fall back to the
// tenant's inline blob when that named row is missing (that would mask a broken
// reference), so `inlineFallback` is null whenever `templateThemeId` is set.
//
// NEVER throws: any fetch/parse failure degrades to the neutral Halo Efekt
// default (resolveClientTheme with a null tenant theme → HALO_EFEKT_DEFAULT), so
// preview + save never break on a bad/missing theme. Mirrors the no-drop safety
// net of features/venture/mail/resolve.server.ts.
// ---------------------------------------------------------------------------

/** Resolve with a null tenant theme → HALO_EFEKT_DEFAULT, downcast to a map. */
function defaultThemeMap(): ThemeColorMap {
  return { ...resolveClientTheme({ tenantTheme: null, clientTheme: null }) }
}

/**
 * Resolve the effective email theme map for a tenant, honouring an optional
 * per-template override.
 *
 * @param supabase Cookie-scoped StartClient (tenant-RLS applies).
 * @param opts.tenantId        The caller's tenant.
 * @param opts.templateThemeId The template's own `theme_id` (null = inherit the
 *   tenant default). When set, it wins over the tenant `theme_id` and the inline
 *   fallback is suppressed.
 */
export async function resolveEmailThemeMap(
  supabase: StartClient,
  { tenantId, templateThemeId }: { tenantId: string; templateThemeId: string | null },
): Promise<ThemeColorMap> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('theme_id, theme')
      .eq('id', tenantId)
      .maybeSingle()
    if (error) {
      console.error('[email theme] tenant theme lookup failed, using default:', error.message)
      return defaultThemeMap()
    }
    const row = data as { theme_id: string | null; theme: Json | null } | null
    // The template's own theme wins; else the tenant default. The inline
    // `tenants.theme` blob only backs the tenant-default path — a named template
    // theme never falls back to it.
    const effectiveThemeId = templateThemeId ?? row?.theme_id ?? null
    const inlineFallback = templateThemeId ? null : (row?.theme ?? null)
    // fetchThemeTokens never throws.
    const tenantTheme = await fetchThemeTokens(supabase, effectiveThemeId, inlineFallback)
    // Downcast ResolvedTheme (9 required HexColor tokens + optional logo/font) to
    // the plain ThemeColorMap the renderer reads; extra keys are inert (the
    // renderer only ever looks up the 9 colour-token keys).
    return { ...resolveClientTheme({ tenantTheme, clientTheme: null }) }
  } catch (e) {
    console.error('[email theme] email theme resolution threw, using default:', e)
    return defaultThemeMap()
  }
}

/**
 * Thin back-compat wrapper — resolves the pure TENANT-default email theme (no
 * per-template override). Delegates to `resolveEmailThemeMap` with
 * `templateThemeId: null`, so it hits the exact same branch as before the
 * per-template theme existed (byte-identical output guarantee).
 */
export function resolveTenantThemeMap(
  supabase: StartClient,
  tenantId: string,
): Promise<ThemeColorMap> {
  return resolveEmailThemeMap(supabase, { tenantId, templateThemeId: null })
}
