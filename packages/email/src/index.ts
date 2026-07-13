export * from './blocks/types'
export * from './EmailRenderer'
export { escapeHtml, substituteTokens, safeUrlValue } from './substitute'
export { BLOCK_REGISTRY } from './blocks/registry'
export type { BlockRegistryEntry } from './blocks/registry'
export type {
  BlockStyleCommon,
  BlockTypography,
  BlockBorder,
  BorderRadiusToken,
  BorderableBlockType,
  CtaWidth,
  SpacerSize,
  MarginBottomPreset,
} from './blocks/block-interfaces'
export {
  BLOCK_DEFAULT_VALUES,
  DEFAULT_BLOCKS,
  DEFAULT_BLOCK_TYPOGRAPHY,
  DEFAULT_BLOCK_BORDER,
  DEFAULT_BLOCK_MARGIN_BOTTOM_PRESET,
  MARGIN_BOTTOM_PX,
  BORDER_RADIUS_PX,
  BORDER_COLOR_FALLBACK,
  SPACER_HEIGHT_PX,
  BORDERABLE_BLOCK_TYPES,
  isBorderableBlockType,
} from './blocks/defaults'
export type { TypographyDefaults } from './blocks/defaults'
export type { ThemeColorMap } from './theme'
export {
  BLOCK_TEXT_COLOR_TOKEN,
  BLOCK_BACKGROUND_COLOR_TOKEN,
  isRenderableHex,
  themedColor,
  resolveThemedColor,
} from './theme'
