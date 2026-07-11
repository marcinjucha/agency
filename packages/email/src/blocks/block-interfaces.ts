/**
 * Interfejsy poszczególnych bloków emaila.
 *
 * Plik oddzielony od types.ts żeby uniknąć circular dependency:
 *   block-interfaces.ts ← registry.ts ← types.ts
 *
 * Backward compat NIE wymagana — istniejące rekordy JSONB z usuniętymi polami
 * (fontFamily/fontSize/fontWeight/lineHeight/letterSpacing/borderWidth/borderStyle
 * /per-side padding/marginBottom-as-number/padding-preset) wciąż walidują się
 * przez optional() w registry, ale renderer ich nie czyta.
 *
 * Mixiny (BlockStyleCommon / Typography / Border) są celowo MINIMALNE — Halo
 * Efekt potrzebuje "wystarczająco" konfigurowalności na 9 typów bloków, nie
 * Figmę. Każde dodane pole rośnie pole zaufania użytkownika + powierzchnię
 * walidacji + dług w 3 miejscach (defaults / renderer / inspector). Trzymamy
 * skromnie.
 */

/**
 * BlockStyleCommon — vertical-rhythm preset.
 *
 * Tylko jedno pole: marginBottom (odstęp pod blokiem). Internal padding NIE
 * jest user-controllable — każdy typ bloku ma własny baked padding w rendererze
 * (v2 design model). Mapowanie marginBottom presetu na piksele żyje w defaults.ts
 * (MARGIN_BOTTOM_PX).
 */
export type MarginBottomPreset = 'none' | 'compact' | 'normal' | 'large'

export interface BlockStyleCommon {
  marginBottom?: MarginBottomPreset
}

/**
 * BlockTypography — minimalny mixin tekstowy.
 *
 * Tylko 2 pola: wyrównanie + kolor. Font family / size / weight / line-height /
 * letter-spacing celowo USUNIĘTE — nie działały widocznie w canvasie i mnożyły
 * powierzchnię konfiguracji bez wartości. Dla nagłówków user używa HeadingBlock
 * (osobny typ z poziomem h1/h2/h3 i własną typografią w renderze).
 */
export interface BlockTypography {
  textAlign?: 'left' | 'center' | 'right'
  /** Hex z prefiksem # (np. '#334155'). */
  textColor?: string
  /**
   * ADDITIVE (client-theming): opcjonalna REFERENCJA do tokenu motywu (np.
   * 'primary'). Gdy ustawiony I renderer dostał `theme` z tym kluczem →
   * wygrywa nad `textColor`. Optional, żeby stare rekordy/bloki były nietknięte.
   * Rozwiązywany fail-open: nieprawidłowy hex w mapie motywu = pominięty.
   */
  textColorToken?: string
}

/**
 * BlockBorder — minimalny mixin obramowania.
 *
 * - borderColor: gdy ustawiony, renderer rysuje 1px solid w tym kolorze.
 *   Brak osobnego "borderWidth" / "borderStyle" — zawsze 1px solid. Email
 *   klienty i tak ignorują niestandardowe style border.
 * - borderRadius: semantyczne 3 wartości (none/soft/pill). Mapowanie do px
 *   w defaults.ts (BORDER_RADIUS_PX).
 * - backgroundColor: opcjonalne tło bloku.
 */
export type BorderRadiusToken = 'none' | 'soft' | 'pill'

export interface BlockBorder {
  borderColor?: string
  borderRadius?: BorderRadiusToken
  backgroundColor?: string
  /**
   * ADDITIVE (client-theming): opcjonalne REFERENCJE do tokenów motywu, obok
   * surowych pól hex powyżej. Gdy ustawione I renderer dostał `theme` z danym
   * kluczem → wygrywają nad surowym hex. Optional = stare rekordy nietknięte.
   * Fail-open: nieprawidłowa wartość tokenu w mapie motywu = pominięta.
   */
  borderColorToken?: string
  backgroundColorToken?: string
}

/**
 * Block types that carry the BlockBorder mixin.
 * Mirrors DEFAULT_BLOCK_BORDER keys in defaults.ts.
 */
export type BorderableBlockType =
  | 'heading'
  | 'text'
  | 'cta'
  | 'header'
  | 'footer'
  | 'image'
  | 'columns'

export type HeaderBlock = {
  id: string
  type: 'header'
  companyName: string
  /** Legacy block-specific textColor — nadal czytany przez renderer dla wstecznej kompatybilności. */
  textColor: string
  /** Legacy block-specific backgroundColor. Renderer preferuje BlockBorder.backgroundColor. */
  backgroundColor?: string
} & BlockStyleCommon &
  BlockTypography &
  BlockBorder

export type TextBlock = {
  id: string
  type: 'text'
  /** HTML produkowane przez Tiptap editor (Bold/Italic/Underline/Link/UL/OL). Sanitizowane w rendererze. */
  content: string
} & BlockStyleCommon &
  BlockTypography &
  BlockBorder

/**
 * CTA width: 'auto' (content-sized button, default) or 'full' (stretches container).
 */
export type CtaWidth = 'auto' | 'full'

export type CtaBlock = {
  id: string
  type: 'cta'
  label: string
  url: string
  /** Legacy block-specific textColor — nadal czytany przez renderer. */
  textColor: string
  /** Legacy block-specific backgroundColor. Renderer preferuje BlockBorder.backgroundColor. */
  backgroundColor?: string
  width?: CtaWidth
} & BlockStyleCommon &
  BlockTypography &
  BlockBorder

export type DividerBlock = {
  id: string
  type: 'divider'
  color: string
} & BlockStyleCommon

export type FooterBlock = {
  id: string
  type: 'footer'
  text: string
} & BlockStyleCommon &
  BlockTypography &
  BlockBorder

export type HeadingBlock = {
  id: string
  type: 'heading'
  text: string
  level: 'h1' | 'h2' | 'h3'
  /** Legacy block-specific color — nadal czytany przez renderer. */
  color: string
} & BlockStyleCommon &
  BlockTypography &
  BlockBorder

export type ImageBlock = {
  id: string
  type: 'image'
  src: string
  alt: string
  width: number
  alignment: 'left' | 'center' | 'right'
} & BlockStyleCommon &
  BlockBorder

/**
 * SpacerBlock — pionowy odstęp.
 *
 * Tylko 4 presety (sm/md/lg/xl). customHeight usunięty — spacer ma być prosty.
 */
export type SpacerSize = 'sm' | 'md' | 'lg' | 'xl' // 16/32/64/96px

export type SpacerBlock = {
  id: string
  type: 'spacer'
  size: SpacerSize
} & BlockStyleCommon

export type NonColumnsBlock =
  | HeaderBlock
  | TextBlock
  | CtaBlock
  | DividerBlock
  | FooterBlock
  | HeadingBlock
  | ImageBlock
  | SpacerBlock

export type ColumnsBlock = {
  id: string
  type: 'columns'
  leftChildren: NonColumnsBlock[]
  rightChildren: NonColumnsBlock[]
  gap: 'sm' | 'md' | 'lg'
  verticalAlign: 'top' | 'middle' | 'bottom'
} & BlockStyleCommon &
  BlockBorder
