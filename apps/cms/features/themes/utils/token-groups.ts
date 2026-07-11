import type { ThemeColorTokenKey } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Theme Manager (iter D3a) — presentation grouping of the 9 colour tokens.
//
// The editor renders the 9 `THEME_COLOR_TOKEN_KEYS` in three labelled groups
// (Marka / Tło+tekst / Nagłówek+stopka) mirroring CampaignBrandEditor's grid.
// This is PURE presentation metadata — the storage/resolve order stays owned by
// `THEME_COLOR_TOKEN_KEYS` in lib/theme. Each group's `labelKey` maps to a
// `messages.themes.*` heading; the token labels themselves reuse the existing
// `messages.email.themeTokenLabels` (single source of truth for the 9 names).
// ---------------------------------------------------------------------------

export type TokenGroup = {
  /** Key into `messages.themes` for the group heading. */
  labelKey: 'groupBrand' | 'groupSurface' | 'groupHeaderFooter'
  tokens: readonly ThemeColorTokenKey[]
}

export const THEME_TOKEN_GROUPS: readonly TokenGroup[] = [
  { labelKey: 'groupBrand', tokens: ['primary', 'primaryText', 'accent'] },
  { labelKey: 'groupSurface', tokens: ['background', 'text', 'mutedText'] },
  {
    labelKey: 'groupHeaderFooter',
    tokens: ['headerBackground', 'headerText', 'footerText'],
  },
]
