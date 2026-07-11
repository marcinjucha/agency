/**
 * Client-theming support for the shared email renderer (ADDITIVE).
 *
 * A "theme" reaches this package as a PLAIN color map passed IN by the caller
 * (the CMS app resolves it via `apps/cms/lib/theme` and hands the literal-hex
 * map to `renderEmailBlocks`). This package NEVER imports the app's resolver
 * nor its token constants — ADR-006 forbids `packages → apps`. The token key
 * strings below are therefore plain string literals kept in sync MANUALLY with
 * `THEME_COLOR_TOKEN_KEYS` in `apps/cms/lib/theme/types.ts`. If a token key is
 * renamed there, mirror it here.
 *
 * The map is the ONLY theme input; the package's own `DEFAULT_BLOCK_TYPOGRAPHY`
 * / block defaults remain the hardcoded fallback (rung d of the ladder below).
 */

import type { BlockType } from './blocks/types'

/**
 * ThemeColorMap — token key → literal hex. `Partial` because a caller may
 * resolve only some tokens; a missing key falls through the resolution ladder.
 * Values are expected to be literal `#rgb`/`#rrggbb` — `themedColor` fail-open
 * guards this so a stray `var(...)`/`hsl(...)`/token name never reaches output.
 */
export type ThemeColorMap = Partial<Record<string, string>>

/**
 * Block-type → canonical TEXT-color token (ladder rung c — "themed default").
 * Mirrors what `apps/cms/features/venture/mail/bonus-email.ts` established.
 *
 * Byte-identical note (theme = Halo Efekt default):
 *   heading → primary          (#0f172a === DEFAULT_BLOCK_TYPOGRAPHY.heading.textColor)
 *   text    → text             (#334155 === DEFAULT_BLOCK_TYPOGRAPHY.text.textColor)
 *   footer  → footerText       (#94a3b8 === DEFAULT_BLOCK_TYPOGRAPHY.footer.textColor)
 * For header/cta the text color is always carried EXPLICITLY on the block
 * (required field), so rung (b) wins and rung (c) never fires in practice; the
 * mapping is included for completeness (header → headerText, cta → primaryText).
 */
export const BLOCK_TEXT_COLOR_TOKEN: Partial<Record<BlockType, string>> = {
  header: 'headerText',
  heading: 'primary',
  text: 'text',
  cta: 'primaryText',
  footer: 'footerText',
}

/**
 * Block-type → canonical BACKGROUND-color token (ladder rung c). Only header +
 * cta carry a themed background default; every other block emits a background
 * ONLY from an explicit field (raw hex / token ref), so the no-token-default
 * behaviour is unchanged for them.
 *
 * Byte-identical note: header → headerBackground and cta → accent both resolve
 * to #1a1a2e under the Halo Efekt default, matching the block components'
 * hardcoded '#1a1a2e' fallback — but those blocks also always carry an explicit
 * backgroundColor, so rung (b) wins first.
 */
export const BLOCK_BACKGROUND_COLOR_TOKEN: Partial<Record<BlockType, string>> = {
  header: 'headerBackground',
  cta: 'accent',
}

// Literal #rgb / #rrggbb only. Deliberately NOT matching var()/hsl()/rgb()/
// named colors — those must never survive into an email inline style.
const RENDERABLE_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Fail-open hex guard used for THEME MAP values (not for raw block hex). */
export function isRenderableHex(value: unknown): value is string {
  return typeof value === 'string' && RENDERABLE_HEX.test(value)
}

/**
 * Read a token from the theme map, fail-open. Returns the literal hex only when
 * the map has the key AND its value is a renderable hex; otherwise `undefined`
 * so the caller falls to the next rung. Never returns a `var(`/`hsl(`/token.
 */
export function themedColor(
  theme: ThemeColorMap | undefined,
  token: string | undefined,
): string | undefined {
  if (!theme || !token) return undefined
  return isRenderableHex(theme[token]) ? theme[token] : undefined
}

/**
 * Shared color-resolution ladder (council order):
 *   (a) explicit token ref   → theme[tokenRef]        (fail-open)
 *   (b) explicit raw hex      → rawHex                 (passed through as-is)
 *   (c) themed default        → theme[defaultToken]    (fail-open)
 *   (d) hardcoded fallback    → fallback               (may be undefined)
 *
 * With no `theme`, rungs (a) and (c) yield nothing, so this collapses to
 * `rawHex ?? fallback` — byte-identical to the pre-theming behaviour.
 */
export function resolveThemedColor(args: {
  theme?: ThemeColorMap
  tokenRef?: string
  rawHex?: string
  defaultToken?: string
  fallback?: string
}): string | undefined {
  const fromTokenRef = themedColor(args.theme, args.tokenRef)
  if (fromTokenRef) return fromTokenRef
  if (args.rawHex) return args.rawHex
  const fromDefaultToken = themedColor(args.theme, args.defaultToken)
  if (fromDefaultToken) return fromDefaultToken
  return args.fallback
}
