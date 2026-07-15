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
  | 'section'

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

/**
 * Poziomy nagłówka. 'eyebrow' (Iter 3, parytet React Email) to mała etykieta
 * nadtytułowa — uppercase, letter-spacing, muted (np. "TWOJE MATERIAŁY").
 * Renderowana jako akapit (<Text>), nie tag h* — semantycznie to label, nie
 * nagłówek dokumentu. Rozszerzenie enum jest ADDITIVE — istniejące wiersze
 * JSONB (h1/h2/h3) nietknięte.
 */
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'eyebrow'

export type HeadingBlock = {
  id: string
  type: 'heading'
  text: string
  level: HeadingLevel
  /** Legacy block-specific color — nadal czytany przez renderer. */
  color: string
} & BlockStyleCommon &
  BlockTypography &
  BlockBorder

/**
 * LinkBlock (Iter 3, parytet React Email <Link>) — samodzielny link tekstowy
 * we własnym wierszu; odrębny od przycisku CTA (kotwica, nie button).
 * Typograficzny (textAlign + textColor/token), ale ŚWIADOMIE nie-borderowalny —
 * link ma być minimalny (bez tła/ramki; do tego służy CTA).
 */
export type LinkBlock = {
  id: string
  type: 'link'
  label: string
  url: string
} & BlockStyleCommon &
  BlockTypography

/**
 * PreviewBlock (Iter 3, parytet React Email <Preview>) — ukryty preheader
 * (snippet widoczny na liście skrzynki odbiorczej obok tematu). Renderowany
 * przez @react-email <Preview> (ukryte divy w body — pozycjonowanie w treści
 * nie ma znaczenia dla klientów pocztowych). ŚWIADOMIE jako BLOK (nie kolumna
 * DB) — zero zmian schematu, addytywne dla istniejących szablonów.
 */
export type PreviewBlock = {
  id: string
  type: 'preview'
  text: string
} & BlockStyleCommon

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

// UWAGA (drift trap): nowy typ bloku-liścia trzeba dodać i TU, i do `Block`
// w types.ts, i do SectionChildBlock (przez ten union) — inaczej blok jest
// renderowalny na najwyższym poziomie, ale niewstawialny do kolumn/sekcji.
export type NonColumnsBlock =
  | HeaderBlock
  | TextBlock
  | CtaBlock
  | DividerBlock
  | FooterBlock
  | HeadingBlock
  | ImageBlock
  | SpacerBlock
  | LinkBlock
  | PreviewBlock

export type ColumnsBlock = {
  id: string
  type: 'columns'
  leftChildren: NonColumnsBlock[]
  rightChildren: NonColumnsBlock[]
  gap: 'sm' | 'md' | 'lg'
  verticalAlign: 'top' | 'middle' | 'bottom'
} & BlockStyleCommon &
  BlockBorder

/**
 * SectionBlock — kontener grupujący bloki (parytet z React Email <Section>).
 *
 * padding: JEDEN preset (nigdy per-side) — ŚWIADOME odstępstwo od modelu v2
 * "baked padding". Kontener musi przełączać się między kartą (padded) a
 * full-bleed (padding 'none'); baked per-type padding nie wyraziłby obu.
 * Mapowanie presetu na px żyje w defaults.ts (SECTION_PADDING_PX).
 *
 * Zagnieżdżanie: sekcja-w-sekcji dozwolona do MAX_SECTION_DEPTH=2 (egzekwowane
 * w walidacji CMS + edytorze, NIE w typach — typy pozostają rekurencyjne bez
 * kodowania głębokości). Kolumny mogą siedzieć w sekcji; kolumny NIE mogą
 * zawierać sekcji (NonColumnsBlock bez zmian) — brak możliwych cykli.
 */
export type SectionPadding = 'none' | 'sm' | 'md' | 'lg'

/**
 * Union bloków dopuszczalnych jako dzieci sekcji — lustrzane odbicie pełnego
 * `Block` z types.ts, zdefiniowane lokalnie żeby uniknąć circular dependency
 * (types.ts importuje registry.ts, który importuje ten plik).
 */
export type SectionChildBlock = NonColumnsBlock | ColumnsBlock | SectionBlock

export type SectionBlock = {
  id: string
  type: 'section'
  children: SectionChildBlock[]
  padding?: SectionPadding
} & BlockStyleCommon &
  BlockBorder
