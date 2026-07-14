// ---------------------------------------------------------------------------
// Venture client-theming — theme domain model (iter 1b).
//
// A "theme" is the set of brand tokens that colour a client's transactional
// bonus email (iter 2 wiring). Two independent brands can carry a theme:
//   • the TENANT theme  = the AGENCY brand (Halo Efekt) — the fallback identity
//   • the CLIENT theme  = the campaign creator's own brand (so_clients.theme)
// Both are stored as partially-filled `theme JSONB` columns (iter 1a added the
// columns; types.ts already exposes `theme: Json | null` on both tables).
//
// This module is PURE domain code — no DB access, no `.server.ts`. The resolver
// (resolve.ts) takes plain objects; the Iter-2 caller fetches the rows and
// narrows them through `parseThemeTokens` (validation.ts) before calling in.
//
// Token-set evolution strategy (council finding a): new tokens are ADDITIVE.
// Old JSONB rows that lack a newly-introduced key simply fall through the
// resolver's neutral-default backfill (resolve.ts) — an absent key is treated
// exactly like an unset one. No `version` field on the JSONB is needed yet;
// introduce one only if a token ever needs a BREAKING re-interpretation (e.g.
// a value format change), which additive growth does not.
// ---------------------------------------------------------------------------

// Local structural mirror of `CampaignBrand` (features/venture/types.ts). This
// module lives in `lib/` and ADR-006 forbids `lib → features` imports, so we
// CANNOT import the canonical `CampaignBrand` here. Instead we redeclare its
// shape locally and use it purely as the key-set for the BRAND_TO_THEME drift-
// guard below. Kept in sync MANUALLY: if a key is added/renamed/removed on the
// canonical `CampaignBrand`, mirror it here too (the drift-guard only protects
// against changes to keys that exist in BOTH shapes). Exported so the
// `brandToThemeTokens` adapter (validation.ts) can type its structural param
// without importing the feature-side `CampaignBrand`.
export type BrandTokenShape = {
  primary?: string | null
  accent?: string | null
  bg?: string | null
  logo_url?: string | null
  font?: string | null
}

// Branded hex-colour string. A plain `string` can hold `hsl(...)`, `var(--x)`,
// or a typo; `HexColor` is only ever produced by `hexColorSchema` (validation.ts)
// or a byte-checked literal (the HALO_EFEKT_DEFAULT const in resolve.ts), so a
// value typed `HexColor` is guaranteed to be a literal `#rgb`/`#rrggbb` — safe to
// drop verbatim into an email inline style. No existing `__brand` idiom in the
// codebase; this establishes the pattern for the venture theme module.
export type HexColor = string & { readonly __brand: 'HexColor' }

// Single source of truth for the render-critical colour tokens. The resolver
// iterates THIS array to backfill every missing token, so adding a colour token
// = one entry here + one entry in HALO_EFEKT_DEFAULT (resolve.ts) + one line in
// themeTokensSchema (validation.ts). `ThemeColorTokenKey` is DERIVED from it —
// never hand-maintain a parallel string union (features/CLAUDE.md, ag-coding).
export const THEME_COLOR_TOKEN_KEYS = [
  'primary',
  'primaryText',
  'accent',
  'background',
  'text',
  'mutedText',
  'headerBackground',
  'headerText',
  'footerText',
] as const

export type ThemeColorTokenKey = (typeof THEME_COLOR_TOKEN_KEYS)[number]

// STORAGE shape — mirrors a partially-filled `theme JSONB` row. EVERY colour
// token is optional AND nullable: a freshly-created row may set only a couple of
// tokens, and Supabase returns `null` for an explicitly-cleared key. logoUrl /
// fontFamily are optional strings (a client may set colours but no logo).
export type ThemeTokens = {
  [K in ThemeColorTokenKey]?: HexColor | null
} & {
  logoUrl?: string | null
  fontFamily?: string | null
}

// OUTPUT shape — the fully-resolved theme a consumer renders. All 9 colour
// tokens are REQUIRED `HexColor`: after resolution there is never a missing
// render-critical colour (the resolver backfills from HALO_EFEKT_DEFAULT), so
// consumers must never branch on "is this colour set?". logoUrl / fontFamily
// stay OPTIONAL — their absence is a REAL render branch ("no logo" / "system
// font"), not a defaulting gap.
export type ResolvedTheme = {
  [K in ThemeColorTokenKey]: HexColor
} & {
  logoUrl?: string
  fontFamily?: string
}

// Superset relationship to the legacy `so_campaigns.brand` JSONB (council
// finding e). `CampaignBrand` (features/venture/types.ts) is the older, freeform
// per-campaign brand blob; `ThemeTokens` is a DELIBERATE SUPERSET — every brand
// key maps onto a theme token, but the theme adds header/footer/text tokens the
// brand never had.
//
// This mapping is the runtime source of truth for `brandToThemeTokens`
// (validation.ts) — the campaign-tier adapter that remaps the legacy
// `so_campaigns.brand` JSONB onto theme tokens (campaign-theme tier, iter E2).
// The adapter hex-validates each COLOUR value through `hexColorSchema` (brand
// values were never hex-validated) and drops any invalid one, so a brand colour
// can't leak an invalid value into the resolver.
//
// Keyed by `keyof BrandTokenShape` (the local mirror of `CampaignBrand`) so
// this stops compiling if a mirrored brand key is renamed/removed — that is the
// drift-guard. See the BrandTokenShape note above (lib may not import features).
export const BRAND_TO_THEME = {
  primary: 'primary',
  accent: 'accent',
  bg: 'background',
  logo_url: 'logoUrl',
  font: 'fontFamily',
} as const satisfies Record<
  keyof BrandTokenShape,
  ThemeColorTokenKey | 'logoUrl' | 'fontFamily'
>
