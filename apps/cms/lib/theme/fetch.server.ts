import type { Json } from '@agency/database'
import { parseThemeTokens, type ThemeTokens } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Theme Manager (iter D2) — named-theme token fetch, with inline fallback.
//
// Single place the consumption callers (email tenant-theme resolver, venture
// bonus-email) turn a `theme_id` FK into the actual `ThemeTokens` blob. Takes
// the Supabase client as a PARAM (never creates one, never imports a feature) so
// it can run under BOTH the cookie-scoped StartClient (email) and the
// service-role client (venture ingest) without lib → features / lib → app
// coupling. `.server.ts` = the import-protection boundary (server-only).
//
// NEVER throws — a lookup failure / missing row degrades to the inline `theme`
// JSONB fallback (the transition column kept alongside `theme_id`), which
// `parseThemeTokens` treats as "no theme" ({}) when it too is absent/malformed.
// Same no-drop safety net as resolveMailSender / resolveClientTheme.
// ---------------------------------------------------------------------------

// Minimal structural client surface. Both the cookie-scoped StartClient and the
// service-role client satisfy it. Declared structurally (not by importing the
// concrete client types) so this stays in lib/ without pulling feature/app deps,
// and so the so_themes-typegen-resolves-to-never divergence in a worktree that
// shares node_modules with MAIN can't break typing here.
type ThemeFetchClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

/**
 * Resolve the effective ThemeTokens for a `theme_id` FK, falling back to the
 * row's inline `theme` JSONB when the FK is null or the named row is gone.
 *
 * @param supabase       Any Supabase client (cookie-scoped or service-role).
 * @param themeId        The row's `theme_id` FK (null = no named theme assigned).
 * @param inlineFallback The row's inline `theme` JSONB (transition fallback).
 */
export async function fetchThemeTokens(
  supabase: ThemeFetchClient,
  themeId: string | null,
  inlineFallback: Json | null,
): Promise<ThemeTokens> {
  // No named theme assigned → the inline blob is the only source.
  if (!themeId) return parseThemeTokens(inlineFallback)

  try {
    const { data, error } = await supabase
      .from('so_themes')
      .select('tokens')
      .eq('id', themeId)
      .maybeSingle()
    // Query error OR the referenced theme no longer exists → inline fallback.
    if (error || !data) return parseThemeTokens(inlineFallback)
    return parseThemeTokens((data as { tokens: Json | null }).tokens)
  } catch {
    // Thrown (network/pool) failure — degrade to the inline fallback, never throw.
    return parseThemeTokens(inlineFallback)
  }
}
