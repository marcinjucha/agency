/**
 * Domyślne wartości bloków emaila — bez importów z @react-email.
 *
 * Plik celowo nie importuje żadnych zależności serwera (@react-email, html-to-text).
 * Eksportowany jest zarówno przez packages/email jak i bezpośrednio przez CMS,
 * dzięki czemu nie wciąga @react-email do bundle'a klienta.
 *
 * Simplification (2026-05-15, AAA-T-221 follow-up):
 * - typography mixin do 2 pól (textAlign + textColor) — usunięte fontFamily/Size/Weight/LineHeight/LetterSpacing
 * - border do 3 pól (borderColor + borderRadius + backgroundColor) — usunięte borderWidth + borderStyle
 * - spacing: preset-based zamiast raw px (marginBottom/padding) — żadnych per-side paddingów
 */

import type {
  HeaderBlock,
  TextBlock,
  CtaBlock,
  DividerBlock,
  FooterBlock,
  HeadingBlock,
  ImageBlock,
  SpacerBlock,
  LinkBlock,
  PreviewBlock,
  ColumnsBlock,
  SectionBlock,
  SectionPadding,
  BlockTypography,
  BlockBorder,
  BorderRadiusToken,
  BorderableBlockType,
  SpacerSize,
  MarginBottomPreset,
} from './block-interfaces'

// Union wszystkich bloków — bez circular dependency na types.ts.
type AnyBlock =
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
  | ColumnsBlock
  | SectionBlock

type BlockTypeKey =
  | 'header'
  | 'text'
  | 'cta'
  | 'divider'
  | 'footer'
  | 'heading'
  | 'image'
  | 'spacer'
  | 'link'
  | 'preview'
  | 'columns'
  | 'section'

/**
 * Typografia per-typ bloku — defaults rzeczywiście używane przez renderer.
 *
 * Tylko 2 pola (textAlign + textColor). Pozostałe atrybuty typograficzne
 * (font-family/size/weight/line-height/letter-spacing) NIE są konfigurowalne
 * po stronie usera — żyją w hardcoded stylach bloków w rendererze.
 */
type TypographicBlockType = 'header' | 'heading' | 'text' | 'cta' | 'footer' | 'link'

// Token-reference fields (textColorToken) are ADDITIVE overrides — a default
// block carries a literal color, never a token — so they are excluded from the
// defaults' required shape.
export type TypographyDefaults = Required<Omit<BlockTypography, 'textColorToken'>>

export const DEFAULT_BLOCK_TYPOGRAPHY: Record<TypographicBlockType, TypographyDefaults> = {
  header: { textAlign: 'left', textColor: '#0f172a' },
  heading: { textAlign: 'left', textColor: '#0f172a' },
  text: { textAlign: 'left', textColor: '#334155' },
  cta: { textAlign: 'center', textColor: '#ffffff' },
  footer: { textAlign: 'center', textColor: '#94a3b8' },
  // Link — "linkowy" ciemny default; przy motywie rung (c) nadpisuje go
  // tokenem 'primary' (BLOCK_TEXT_COLOR_TOKEN w theme.ts).
  link: { textAlign: 'left', textColor: '#1a1a2e' },
}

/**
 * BorderRadius mapping — semantic key → px.
 *
 * - none: 0
 * - soft: 8 (subtelne zaokrąglenie — buttony, karty, obrazy)
 * - pill: 9999 (full pill — clampowane przez wysokość elementu)
 */
export const BORDER_RADIUS_PX: Record<BorderRadiusToken, number> = {
  none: 0,
  soft: 8,
  pill: 9999,
}

/** Neutralny fallback dla swatcha "Kolor obramowania" w UI gdy nic nie wybrane. */
export const BORDER_COLOR_FALLBACK = '#e2e8f0'

/** Spacer height presets. */
export const SPACER_HEIGHT_PX: Record<SpacerSize, number> = {
  sm: 16,
  md: 32,
  lg: 64,
  xl: 96,
}

/**
 * Section padding presets — jeden preset dla wszystkich stron (nigdy per-side).
 *
 * ŚWIADOME odstępstwo od modelu v2 "baked padding" (per-typ, nie-konfigurowalne):
 * kontener musi przełączać się między kartą (padded) a full-bleed ('none') —
 * baked padding nie wyraziłby obu ról jednym typem bloku.
 */
export const SECTION_PADDING_PX: Record<SectionPadding, number> = {
  none: 0,
  sm: 12,
  md: 24,
  lg: 32,
}

/**
 * Border defaults per-typ — używane przez renderer jako fallback.
 *
 * Wszystkie defaultują na borderRadius='none' i brak borderColor.
 * Wyjątki: cta + image dostają 'soft' rounding (konwencja UI buttonów / kart).
 */
export const DEFAULT_BLOCK_BORDER: Record<BorderableBlockType, Required<Pick<BlockBorder, 'borderRadius'>>> = {
  heading: { borderRadius: 'none' },
  text: { borderRadius: 'none' },
  cta: { borderRadius: 'soft' },
  header: { borderRadius: 'none' },
  footer: { borderRadius: 'none' },
  image: { borderRadius: 'soft' },
  columns: { borderRadius: 'none' },
  // Sekcje to zwykle karty — 'soft' jak cta/image.
  section: { borderRadius: 'soft' },
}

/** Set of borderable block types — runtime check used by renderer. */
export const BORDERABLE_BLOCK_TYPES: ReadonlySet<BorderableBlockType> = new Set<BorderableBlockType>([
  'heading',
  'text',
  'cta',
  'header',
  'footer',
  'image',
  'columns',
  'section',
])

export function isBorderableBlockType(type: string): type is BorderableBlockType {
  return BORDERABLE_BLOCK_TYPES.has(type as BorderableBlockType)
}

/**
 * Preset → px mapping for marginBottom (pionowy odstęp pod blokiem).
 *
 * Renderer aplikuje jako paddingBottom na Section wrappera (Outlook-safe).
 */
export const MARGIN_BOTTOM_PX: Record<MarginBottomPreset, number> = {
  none: 0,
  compact: 8,
  normal: 16,
  large: 32,
}

/**
 * Default marginBottom preset per-typ bloku — używany gdy block.marginBottom
 * jest undefined.
 *
 * Wszystkie typy defaultują do 'none' (0px). Świadoma decyzja UX
 * (2026-05-15): bloki email mają już własne baked padding (12-32px), który
 * sam w sobie daje wizualne odstępy. Dodawanie domyślnego marginu między
 * blokami zsumowane z padding tworzyło zbyt powietrzny feel. User świadomie
 * dodaje marginBottom (compact/normal/large) tam gdzie chce większy oddech;
 * 'none' jako default = baseline z samego baked paddingu.
 */
export const DEFAULT_BLOCK_MARGIN_BOTTOM_PRESET: Record<BlockTypeKey, MarginBottomPreset> = {
  header: 'none',
  heading: 'none',
  text: 'none',
  cta: 'none',
  image: 'none',
  divider: 'none',
  spacer: 'none',
  footer: 'none',
  link: 'none',
  // preview jest niewidzialny w treści — margines i tak byłby inert, ale klucz
  // musi istnieć (Record<BlockTypeKey> jest exhaustive).
  preview: 'none',
  columns: 'none',
  section: 'none',
}

// Typ pomocniczy — blok bez pola `id` (id nadawane przez edytor)
type BlockWithoutId<T extends { id: string }> = Omit<T, 'id'>

export const BLOCK_DEFAULT_VALUES: {
  header: BlockWithoutId<HeaderBlock>
  text: BlockWithoutId<TextBlock>
  cta: BlockWithoutId<CtaBlock>
  divider: BlockWithoutId<DividerBlock>
  footer: BlockWithoutId<FooterBlock>
  heading: BlockWithoutId<HeadingBlock>
  image: BlockWithoutId<ImageBlock>
  spacer: BlockWithoutId<SpacerBlock>
  link: BlockWithoutId<LinkBlock>
  preview: BlockWithoutId<PreviewBlock>
  columns: BlockWithoutId<ColumnsBlock>
  section: BlockWithoutId<SectionBlock>
} = {
  header: {
    type: 'header' as const,
    companyName: '{{companyName}}',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
  },
  text: {
    type: 'text' as const,
    content: '',
  },
  cta: {
    type: 'cta' as const,
    label: 'Kliknij tutaj',
    url: '',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
  },
  divider: {
    type: 'divider' as const,
    color: '#e5e7eb',
  },
  footer: {
    type: 'footer' as const,
    text: 'Wiadomość wysłana automatycznie. Prosimy nie odpowiadać na ten email.',
  },
  heading: {
    type: 'heading' as const,
    text: '',
    level: 'h2',
    color: '#1a1a2e',
  },
  image: {
    type: 'image' as const,
    src: '',
    alt: '',
    width: 600,
    alignment: 'center',
  },
  spacer: {
    type: 'spacer' as const,
    size: 'md',
  },
  link: {
    type: 'link' as const,
    label: 'Zobacz więcej',
    url: '',
  },
  preview: {
    type: 'preview' as const,
    text: '',
  },
  columns: {
    type: 'columns' as const,
    leftChildren: [],
    rightChildren: [],
    gap: 'md',
    verticalAlign: 'top',
  },
  section: {
    type: 'section' as const,
    children: [],
    padding: 'md',
  },
}

// Business defaults dla nowego szablonu — kompletna lista bloków gotowych do wstawienia.
export const DEFAULT_BLOCKS: AnyBlock[] = [
  {
    id: 'default-header',
    type: 'header',
    companyName: '{{companyName}}',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
  },
  {
    id: 'default-text',
    type: 'text',
    content:
      '<p>Otrzymałeś nowe zgłoszenie z formularza <strong>{{surveyTitle}}</strong>.</p><p>Klient: <strong>{{clientName}}</strong></p>',
  },
  {
    id: 'default-cta',
    type: 'cta',
    label: 'Zobacz zgłoszenie',
    url: '{{responseUrl}}',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
  },
  {
    id: 'default-divider',
    type: 'divider',
    color: '#e5e7eb',
  },
  {
    id: 'default-footer',
    type: 'footer',
    text: 'Wiadomość wygenerowana automatycznie przez system Halo Efekt.',
  },
]
