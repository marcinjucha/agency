import { z } from 'zod'
import {
  type HexColor,
  type ResolvedTheme,
  type ThemeColorTokenKey,
  type ThemeTokens,
  THEME_COLOR_TOKEN_KEYS,
} from './types'
import { hexColorSchema } from './validation'

// ---------------------------------------------------------------------------
// Venture client-theming — theme resolution (iter 1b).
//
// `resolveClientTheme` turns the stored (partial, possibly-null) brand themes
// into ONE fully-populated `ResolvedTheme` ready to colour the bonus email. It
// mirrors `resolveMailSender` (../mail/resolve.server.ts): PURE, SYNCHRONOUS, no
// I/O, deterministic, and NEVER throws — a bad/missing theme degrades to the
// neutral Halo Efekt default rather than blocking a send.
//
// THREE TIERS, most- to least-specific (iter E2 added the campaign tier):
//   • the CAMPAIGN theme = the per-launch brand (so_campaigns.theme_id, or the
//     legacy `brand` JSONB adapted via brandToThemeTokens) — OPTIONAL
//   • the CLIENT theme   = the campaign creator's OWN brand (so_clients)
//   • the TENANT theme   = the AGENCY brand (Halo Efekt) — the neutral fallback
//
// SEMANTICS — whole-object selection + neutral-default backfill (council b):
//   1. Pick the ONE most-specific source that carries any usable brand identity:
//      the campaign theme if it has any, else the client's, else the tenant's,
//      else {}.
//   2. Backfill every missing/invalid token in that source from
//      HALO_EFEKT_DEFAULT — NEVER from a LESS-specific tier.
//   3. Guard header readability (WCAG contrast).
//
// WHY whole-object (not per-token merge across tiers): each tier is a DISTINCT
// brand — campaign = this launch, client = the creator, tenant = the agency. A
// per-token merge could ship an agency-navy header with a client-blue accent and
// a campaign-red CTA — a Frankenstein brand. We never inherit an INDIVIDUAL token
// from a different tier; the only cross-source fallback is the neutral default.
//
// BYTE-IDENTICAL for 2-tier callers: `campaignTheme` is OPTIONAL and coalesced
// with `?? null`, so a caller that omits it hits the SAME branch as before the
// campaign tier existed (pinned by a `===`/deep-equal regression test).
// ---------------------------------------------------------------------------

// Neutral Halo Efekt default. The FIVE email-critical tokens below MUST match
// the current bonus email output BYTE-FOR-BYTE (council finding c, regression
// guard) — source of truth: ../mail/bonus-email.ts +
// @agency/email DEFAULT_BLOCK_TYPOGRAPHY (packages/email/src/blocks/defaults.ts):
//   headerBackground '#1a1a2e'  ← bonus-header backgroundColor
//   headerText       '#ffffff'  ← bonus-header textColor
//   primary          '#0f172a'  ← DEFAULT_BLOCK_TYPOGRAPHY.heading.textColor
//                                 (the value the renderer ACTUALLY applies to the
//                                 heading; the old '#1a1a2e' came from the inert
//                                 bonus-email `color` field that never rendered)
//   text             '#334155'  ← DEFAULT_BLOCK_TYPOGRAPHY.text (body copy)
//   footerText       '#94a3b8'  ← DEFAULT_BLOCK_TYPOGRAPHY.footer
// Do NOT change these without re-checking bonus-email.ts — they pin today's
// rendered output. The remaining four are sensible complements: primaryText /
// accent match the shared CTA default (defaults.ts: '#1a1a2e' bg + '#ffffff'
// text), background is the email body white, mutedText a slate midtone.
export const HALO_EFEKT_DEFAULT: ResolvedTheme = {
  primary: '#0f172a' as HexColor,
  primaryText: '#ffffff' as HexColor,
  accent: '#1a1a2e' as HexColor,
  background: '#ffffff' as HexColor,
  text: '#334155' as HexColor,
  mutedText: '#64748b' as HexColor,
  headerBackground: '#1a1a2e' as HexColor,
  headerText: '#ffffff' as HexColor,
  footerText: '#94a3b8' as HexColor,
}

// WCAG minimum contrast for normal text (AA).
const MIN_CONTRAST_RATIO = 4.5

// Readable header-text fallbacks tried when the resolved header pair fails the
// contrast guard — pick whichever yields the higher ratio against the bg.
const READABLE_ON_DARK = '#ffffff' as HexColor
const READABLE_ON_LIGHT = '#0f172a' as HexColor

function isValidHexColor(value: unknown): value is HexColor {
  return hexColorSchema.safeParse(value).success
}

/** True when the value is a non-empty string that parses as a URL (logo brand identity). */
function isUsableLogoUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && z.string().url().safeParse(value).success
}

/** True when the value is a non-empty font stack (font brand identity). */
function isUsableFontFamily(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** ≥1 valid colour token. Kept color-only for the backfill path semantics. */
function hasAnyToken(theme: ThemeTokens | null): boolean {
  if (!theme) return false
  return THEME_COLOR_TOKEN_KEYS.some((key) => isValidHexColor(theme[key]))
}

// A theme counts as a brand OVERRIDE for source selection if it carries ANY
// usable brand identity — a colour token OR a logo OR a font. A logo-only /
// font-only client override MUST win over the tenant (its colours then backfill
// from the default), otherwise a client that set only its logo would silently
// render with the agency logo dropped. Broader than `hasAnyToken` on purpose:
// selection is about "did this brand say anything?", backfill is colour-only.
function hasAnyOverride(theme: ThemeTokens | null): boolean {
  if (!theme) return false
  return (
    hasAnyToken(theme) ||
    isUsableLogoUrl(theme.logoUrl) ||
    isUsableFontFamily(theme.fontFamily)
  )
}

/** Non-empty trimmed string, else undefined (absence is a real render branch). */
function optionalString(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export function resolveClientTheme(input: {
  tenantTheme: ThemeTokens | null
  clientTheme: ThemeTokens | null
  campaignTheme?: ThemeTokens | null
}): ResolvedTheme {
  // (1) Whole-object selection — the most-specific tier that says ANYTHING
  // (a colour, a logo, or a font). Campaign wins over client wins over tenant;
  // a logo-only override at any tier still wins over the tiers below it.
  const campaignTheme = input.campaignTheme ?? null
  const source: ThemeTokens = hasAnyOverride(campaignTheme)
    ? (campaignTheme as ThemeTokens)
    : hasAnyOverride(input.clientTheme)
      ? (input.clientTheme as ThemeTokens)
      : (input.tenantTheme ?? {})

  // (2) Backfill every colour token: keep the source's value if it is a valid
  // hex, otherwise fall to the neutral default (an invalid token = absent).
  const resolved = backfillColorTokens(source)

  // (3) Header readability guard.
  const readableHeaderText = ensureHeaderContrast(
    resolved.headerBackground,
    resolved.headerText,
  )

  return {
    ...resolved,
    headerText: readableHeaderText,
    logoUrl: optionalString(source.logoUrl),
    fontFamily: optionalString(source.fontFamily),
  }
}

function backfillColorTokens(source: ThemeTokens): Record<ThemeColorTokenKey, HexColor> {
  const result = {} as Record<ThemeColorTokenKey, HexColor>
  for (const key of THEME_COLOR_TOKEN_KEYS) {
    const value = source[key]
    result[key] = isValidHexColor(value) ? value : HALO_EFEKT_DEFAULT[key]
  }
  return result
}

// If the resolved header pair fails WCAG AA, swap header text for the readable
// fallback with the higher contrast against the background. WHY: two independent
// client tokens can collide (white-on-white); low-contrast bulk mail also raises
// spam complaints. The background is authoritative (it's the client's surface);
// only the text is corrected.
export function ensureHeaderContrast(background: HexColor, text: HexColor): HexColor {
  if (contrastRatio(background, text) >= MIN_CONTRAST_RATIO) return text

  const darkRatio = contrastRatio(background, READABLE_ON_DARK)
  const lightRatio = contrastRatio(background, READABLE_ON_LIGHT)
  return darkRatio >= lightRatio ? READABLE_ON_DARK : READABLE_ON_LIGHT
}

// --- WCAG relative-luminance contrast (pure math) -------------------------

function expandShorthandHex(hex: string): string {
  // '#abc' → '#aabbcc'; a 6-digit value passes through unchanged.
  if (hex.length === 4) {
    const [, r, g, b] = hex
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return hex
}

function hexToRgb(hex: HexColor): { r: number; g: number; b: number } {
  const full = expandShorthandHex(hex)
  return {
    r: parseInt(full.slice(1, 3), 16),
    g: parseInt(full.slice(3, 5), 16),
    b: parseInt(full.slice(5, 7), 16),
  }
}

function channelLuminance(channel8bit: number): number {
  const c = channel8bit / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(color: HexColor): number {
  const { r, g, b } = hexToRgb(color)
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  )
}

/** WCAG contrast ratio in [1, 21]. Order-independent. */
export function contrastRatio(colorA: HexColor, colorB: HexColor): number {
  const lumA = relativeLuminance(colorA)
  const lumB = relativeLuminance(colorB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}
