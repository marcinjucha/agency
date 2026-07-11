import type { Json } from '@agency/database'
import type { ThemeColorMap } from '@agency/email'
import { resolveClientTheme } from '@/lib/theme'
import { fetchThemeTokens } from '@/lib/theme/fetch.server'
import type { StartClient } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// Email-templates client-theming (iter C) — server-side tenant theme resolution.
//
// The CMS email-templates surface is TENANT-scoped (per-client theming lives in
// the venture bonus flow, features/venture/mail). This helper turns the current
// tenant's stored `tenants.theme` JSONB into ONE flat `ThemeColorMap`
// (token key → literal hex) that the @agency/email renderer consumes as its 2nd
// arg — the SAME map is used for live preview AND baked into the persisted
// `html_body` at save, so n8n (which reads html_body) renders identical colours.
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

export async function resolveTenantThemeMap(
  supabase: StartClient,
  tenantId: string,
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
    // Named theme (via theme_id) is the source of truth; the inline `theme` JSONB
    // is the transition fallback. fetchThemeTokens never throws.
    const row = data as { theme_id: string | null; theme: Json | null } | null
    const tenantTheme = await fetchThemeTokens(supabase, row?.theme_id ?? null, row?.theme ?? null)
    // Downcast ResolvedTheme (9 required HexColor tokens + optional logo/font) to
    // the plain ThemeColorMap the renderer reads; extra keys are inert (the
    // renderer only ever looks up the 9 colour-token keys).
    return { ...resolveClientTheme({ tenantTheme, clientTheme: null }) }
  } catch (e) {
    console.error('[email theme] tenant theme resolution threw, using default:', e)
    return defaultThemeMap()
  }
}
