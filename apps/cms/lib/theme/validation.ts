import { z } from 'zod'
import type { Json } from '@agency/database'
import { BRAND_TO_THEME, type HexColor, type ThemeTokens } from './types'

// ---------------------------------------------------------------------------
// Venture client-theming — theme token validation + DB-boundary narrowing.
//
// This is the ONLY place a generic `Json` column value becomes a typed
// `ThemeTokens`. The resolver (resolve.ts) trusts its input is already a
// validated `ThemeTokens`; `parseThemeTokens` is the gate that guarantees that.
// ---------------------------------------------------------------------------

// ANCHORED hex regex — `^...$` is load-bearing. It accepts ONLY `#rgb` /
// `#rrggbb` and REJECTS every CSS colour form that renders wrong in email:
// `hsl(...)`, `rgb(...)`, `var(--x)`, and named colours (`red`). WHY: email
// inline styles render their value verbatim — Outlook/Gmail don't resolve
// `var()`/`hsl()`, so a leaked non-hex value silently breaks the rendered mail.
// The `.transform` brands the validated string as `HexColor` so downstream types
// line up (the brand is only ever minted here or from a byte-checked literal).
export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/)
  .transform((value): HexColor => value as HexColor)

// One `.nullable().optional()` per token — accepts BOTH `null` (Supabase returns
// null for an explicitly-cleared JSONB key) and `undefined` (key absent). Mirrors
// the storage-shape `ThemeTokens`. logoUrl is URL-validated; fontFamily is a
// free string (font stacks aren't URLs). New colour token = one line here +
// THEME_COLOR_TOKEN_KEYS (types.ts) + HALO_EFEKT_DEFAULT (resolve.ts).
export const themeTokensSchema = z.object({
  primary: hexColorSchema.nullable().optional(),
  primaryText: hexColorSchema.nullable().optional(),
  accent: hexColorSchema.nullable().optional(),
  background: hexColorSchema.nullable().optional(),
  text: hexColorSchema.nullable().optional(),
  mutedText: hexColorSchema.nullable().optional(),
  headerBackground: hexColorSchema.nullable().optional(),
  headerText: hexColorSchema.nullable().optional(),
  footerText: hexColorSchema.nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  fontFamily: z.string().nullable().optional(),
})

// DB-boundary narrowing helper: `Json` (generic, from the `theme` column) →
// `ThemeTokens` (domain). NEVER throws — a malformed/partial row must not crash
// the resolve path. On any parse failure (wrong type, invalid hex, non-object)
// it returns `{}` = "no theme", which the resolver treats as fully-defaulted.
// This is deliberate: a bad theme degrades to the neutral default, it never
// blocks a send (same no-drop safety net as resolveMailSender).
export function parseThemeTokens(raw: Json | null | undefined): ThemeTokens {
  const parsed = themeTokensSchema.safeParse(raw)
  return parsed.success ? (parsed.data as ThemeTokens) : {}
}

// Campaign-tier adapter (iter E2): remap the legacy `so_campaigns.brand` JSONB
// onto `ThemeTokens` via BRAND_TO_THEME (primary/accent 1:1, bg→background,
// logo_url→logoUrl, font→fontFamily). The brand shape carries NO header / footer
// / text / mutedText / primaryText tokens — those are simply absent and the
// resolver backfills them from HALO_EFEKT_DEFAULT (accepted whole-object
// contract). NEVER throws — a null / non-object / garbage input degrades to `{}`
// ("no theme"), the same no-drop safety net as parseThemeTokens.
//
// UNLIKE parseThemeTokens (whole-object reject on any invalid field), this
// narrows PER-FIELD and DROPS any field that fails, so its output ALWAYS passes
// `themeTokensSchema` (brand values were never field-validated, so one bad value
// must not discard the whole brand). Each field uses the SAME validator
// themeTokensSchema uses for it:
//   • colour tokens → hexColorSchema
//   • logoUrl       → z.string().url()  (a non-URL logo_url would otherwise fail
//                     the whole-object parse in fetchThemeTokens → collapse the
//                     campaign theme to {} → silently discard valid colours)
//   • fontFamily    → non-empty string (matches the resolver's usable-font check)
// Guaranteeing valid-only output is load-bearing: brandToThemeTokens feeds
// fetchThemeTokens → parseThemeTokens (whole-object), so the per-field-drop
// intent only holds if EVERY emitted field individually passes.
export function brandToThemeTokens(raw: Json | null): ThemeTokens {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const brand = raw as Record<string, unknown>
  const tokens: ThemeTokens = {}
  for (const brandKey of Object.keys(BRAND_TO_THEME) as (keyof typeof BRAND_TO_THEME)[]) {
    const themeKey = BRAND_TO_THEME[brandKey]
    const value = brand[brandKey]
    if (typeof value !== 'string') continue
    if (themeKey === 'logoUrl') {
      if (z.string().url().safeParse(value).success) tokens.logoUrl = value
      continue
    }
    if (themeKey === 'fontFamily') {
      if (value.trim().length > 0) tokens.fontFamily = value
      continue
    }
    const parsed = hexColorSchema.safeParse(value)
    if (parsed.success) tokens[themeKey] = parsed.data
  }
  return tokens
}
