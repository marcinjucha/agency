// Public surface of the venture client-theming module (iter 1 + iter 2 wiring).
// Consumers import from `../theme` — never reach into resolve.ts / validation.ts
// / types.ts directly, so the internal file layout can change freely.
export { HALO_EFEKT_DEFAULT, resolveClientTheme, contrastRatio, ensureHeaderContrast } from './resolve'
export { brandToThemeTokens, hexColorSchema, parseThemeTokens, themeTokensSchema } from './validation'
export {
  THEME_COLOR_TOKEN_KEYS,
  type HexColor,
  type ResolvedTheme,
  type ThemeColorTokenKey,
  type ThemeTokens,
} from './types'
