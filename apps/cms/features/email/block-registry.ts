/**
 * CMS Block Registry — metadane edytora po stronie klienta.
 * Oddzielone od packages/email/registry.ts (który zawiera RendererComponents na server-side)
 * żeby uniknąć importowania @react-email do bundle'a CMS.
 *
 * BLOCK_DEFAULT_VALUES pochodzi z packages/email/src/blocks/defaults (plik bez importów @react-email)
 * — SSoT dla wartości domyślnych, bez ryzyka wciągnięcia @react-email do bundle'a klienta.
 *
 * CmsBlockRegistryEntry<T> — generic zapewniający type-safe EditorComponent bez castów.
 * Każdy wpis w rejestrze używa `satisfies CmsBlockRegistryEntry<ConcreteBlock>`.
 */

import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Mail, AlignLeft, FileText, MousePointerClick, Minus, Heading, ImageIcon, AlignVerticalSpaceAround, Columns2 } from 'lucide-react'
import { z } from 'zod'
import type { Block, BlockType } from './types'
import type { HeaderBlock, TextBlock, CtaBlock, DividerBlock, FooterBlock, HeadingBlock, ImageBlock, SpacerBlock, ColumnsBlock } from '@agency/email'
import { BLOCK_DEFAULT_VALUES } from '@agency/email'
import type { TriggerVariable } from '@/lib/trigger-schemas'
import { HeaderBlockEditor } from './components/blocks/HeaderBlockEditor'
import { TextBlockEditor } from './components/blocks/TextBlockEditor'
import { CtaBlockEditor } from './components/blocks/CtaBlockEditor'
import { DividerBlockEditor } from './components/blocks/DividerBlockEditor'
import { FooterBlockEditor } from './components/blocks/FooterBlockEditor'
import { HeadingBlockEditor } from './components/blocks/HeadingBlockEditor'
import { ImageBlockEditor } from './components/blocks/ImageBlockEditor'
import { SpacerBlockEditor } from './components/blocks/SpacerBlockEditor'
import { ColumnsBlockEditor } from './components/blocks/ColumnsBlockEditor'

// ---------------------------------------------------------------------------
// Schematy Zod per-block
// ---------------------------------------------------------------------------

// Regex walidujący kolor hex 6-cyfrowy (#rrggbb)
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Nieprawidłowy kolor hex (wymagany format #rrggbb)')

const headerBlockSchema = z.object({
  type: z.literal('header'),
  companyName: z.string(),
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
})

const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1, 'Treść jest wymagana'),
})

const ctaBlockSchema = z.object({
  type: z.literal('cta'),
  label: z.string().min(1, 'Tekst przycisku jest wymagany'),
  url: z.string(),
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
})

const dividerBlockSchema = z.object({
  type: z.literal('divider'),
  color: hexColorSchema,
})

const footerBlockSchema = z.object({
  type: z.literal('footer'),
  text: z.string().min(1, 'Tekst stopki jest wymagany'),
})

const headingBlockSchema = z.object({
  type: z.literal('heading'),
  text: z.string().max(500),
  level: z.enum(['h1', 'h2', 'h3']),
  textAlign: z.enum(['left', 'center', 'right']),
  color: hexColorSchema,
})

// Walidacja URL obrazu: akceptuje puste (render pomijany), zmienne {{...}} oraz http(s):// i data:image/
const imageSrcSchema = z.string().max(2000).refine(
  (val) => {
    if (!val) return true // pusty = render skipped (ImageBlock.tsx ma `if (!block.src) return null`)
    if (/^\{\{.+\}\}$/.test(val)) return true // template variable
    try {
      const u = new URL(val)
      return (
        u.protocol === 'http:' ||
        u.protocol === 'https:' ||
        (u.protocol === 'data:' && val.startsWith('data:image/'))
      )
    } catch {
      return false
    }
  },
  { message: 'URL obrazu musi być http(s):// lub {{zmienna}}' }
)

const imageBlockSchema = z.object({
  type: z.literal('image'),
  src: imageSrcSchema,
  alt: z.string().max(300),
  width: z.number().int().min(1).max(2400),
  alignment: z.enum(['left', 'center', 'right']),
})

const spacerBlockSchema = z.object({
  type: z.literal('spacer'),
  size: z.enum(['sm', 'md', 'lg']),
})

// columnsBlockSchema — children walidowane przez nonColumnsBlockSchema w validation.ts (rekurencja z z.lazy).
// Tu schemat obejmuje tylko pola samego bloku (gap, verticalAlign) + luźna walidacja tablic dzieci.
const columnsBlockSchema = z.object({
  type: z.literal('columns'),
  leftChildren: z.array(z.unknown()),
  rightChildren: z.array(z.unknown()),
  gap: z.enum(['sm', 'md', 'lg']),
  verticalAlign: z.enum(['top', 'middle', 'bottom']),
})

// ---------------------------------------------------------------------------
// Interfejs wpisu rejestru — generic
// ---------------------------------------------------------------------------

/**
 * T = konkretny typ bloku (HeaderBlock, TextBlock, etc.)
 * Generic zapewnia type-safe EditorComponent — eliminuje konieczność castowania
 * `as CmsBlockRegistryEntry['EditorComponent']` przy każdym wpisie rejestru.
 *
 * Konsumenci używający CMS_BLOCK_REGISTRY[block.type] otrzymują CmsBlockRegistryEntry<Block>
 * (upcast jest bezpieczny, bo runtime gwarantuje dopasowanie type → komponent).
 */
export interface CmsBlockRegistryEntry<T extends Block = Block> {
  id: BlockType
  label: string
  description: string
  icon: LucideIcon
  group: 'treść' | 'akcja' | 'layout' | 'media'
  /** Krótkie streszczenie bloku wyświetlane w nagłówku accordion listy bloków */
  getSummary: (block: T) => string
  EditorComponent: ComponentType<{
    block: T
    onChange: (updated: Block) => void
    variables?: TriggerVariable[]
  }>
  validationSchema: z.ZodSchema
  defaultValue: Omit<T, 'id'>
}

// ---------------------------------------------------------------------------
// Rejestr CMS
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// Typ pomocniczy: wejście konkretnego edytora (np. HeaderBlock) wymagane dla type-safety
// przy definicji wpisu, ale przy przypisaniu do Record<BlockType, CmsBlockRegistryEntry<Block>>
// EditorComponent musi być upcasted — runtime gwarantuje poprawność (blok danego type
// zawsze trafia do właściwego komponentu).
type EditorComponentType = CmsBlockRegistryEntry['EditorComponent']

export const CMS_BLOCK_REGISTRY: Record<BlockType, CmsBlockRegistryEntry> = {
  header: {
    id: 'header',
    label: 'Nagłówek',
    description: 'Logo i nazwa firmy',
    icon: Mail,
    group: 'treść',
    getSummary: (block) => `Nagłówek: „${(block as HeaderBlock).companyName.slice(0, 40)}"`,
    EditorComponent: HeaderBlockEditor as EditorComponentType,
    validationSchema: headerBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.header,
  },

  text: {
    id: 'text',
    label: 'Tekst',
    description: 'Akapit z treścią, obsługuje {{zmienne}}',
    icon: AlignLeft,
    group: 'treść',
    getSummary: (block) => {
      const stripped = stripHtml((block as TextBlock).content)
      return stripped.slice(0, 50) || 'Pusty blok tekstu'
    },
    EditorComponent: TextBlockEditor as EditorComponentType,
    validationSchema: textBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.text,
  },

  cta: {
    id: 'cta',
    label: 'Przycisk CTA',
    description: 'Przycisk z linkiem',
    icon: MousePointerClick,
    group: 'akcja',
    getSummary: (block) => `CTA: „${(block as CtaBlock).label}"`,
    EditorComponent: CtaBlockEditor as EditorComponentType,
    validationSchema: ctaBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.cta,
  },

  divider: {
    id: 'divider',
    label: 'Linia',
    description: 'Pozioma linia rozdzielająca',
    icon: Minus,
    group: 'layout',
    getSummary: () => 'Linia rozdzielająca',
    EditorComponent: DividerBlockEditor as EditorComponentType,
    validationSchema: dividerBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.divider,
  },

  footer: {
    id: 'footer',
    label: 'Stopka',
    description: 'Nota prawna / informacja o automatycznej wysyłce',
    icon: FileText,
    group: 'treść',
    getSummary: (block) => (block as FooterBlock).text.slice(0, 50) || 'Pusta stopka',
    EditorComponent: FooterBlockEditor as EditorComponentType,
    validationSchema: footerBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.footer,
  },

  heading: {
    id: 'heading',
    label: 'Nagłówek tekstowy',
    description: 'Tytuł lub podtytuł sekcji (h1/h2/h3)',
    icon: Heading,
    group: 'treść',
    getSummary: (block) => {
      const h = block as HeadingBlock
      return `${h.level.toUpperCase()}: „${h.text.slice(0, 40)}"` || 'Pusty nagłówek'
    },
    EditorComponent: HeadingBlockEditor as EditorComponentType,
    validationSchema: headingBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.heading,
  },

  image: {
    id: 'image',
    label: 'Obraz',
    description: 'Grafika z Media Library lub zewnętrznego URL',
    icon: ImageIcon,
    group: 'media',
    getSummary: (block) => {
      const img = block as ImageBlock
      return img.alt ? `Obraz: „${img.alt.slice(0, 40)}"` : 'Obraz bez opisu alt'
    },
    EditorComponent: ImageBlockEditor as EditorComponentType,
    validationSchema: imageBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.image,
  },

  spacer: {
    id: 'spacer',
    label: 'Odstęp',
    description: 'Pionowy odstęp między blokami',
    icon: AlignVerticalSpaceAround,
    group: 'layout',
    getSummary: (block) => {
      const s = block as SpacerBlock
      const sizeLabel = s.size === 'sm' ? '16px' : s.size === 'md' ? '32px' : '64px'
      return `Odstęp: ${sizeLabel}`
    },
    EditorComponent: SpacerBlockEditor as EditorComponentType,
    validationSchema: spacerBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.spacer,
  },

  columns: {
    id: 'columns',
    label: 'Kolumny',
    description: 'Dwukolumnowy układ',
    icon: Columns2,
    group: 'layout',
    getSummary: (block) => {
      const c = block as ColumnsBlock
      const total = c.leftChildren.length + c.rightChildren.length
      return `Kolumny: ${total} ${total === 1 ? 'blok' : total < 5 ? 'bloki' : 'bloków'}`
    },
    EditorComponent: ColumnsBlockEditor as EditorComponentType,
    validationSchema: columnsBlockSchema,
    defaultValue: BLOCK_DEFAULT_VALUES.columns,
  },
}

// Grupy do renderowania w BlockPalette — zachowuje kolejność
export const BLOCK_GROUPS: Array<{
  id: 'treść' | 'akcja' | 'layout' | 'media'
  label: string
  blocks: CmsBlockRegistryEntry[]
}> = [
  {
    id: 'treść',
    label: 'TREŚĆ',
    blocks: Object.values(CMS_BLOCK_REGISTRY).filter((e) => e.group === 'treść'),
  },
  {
    id: 'akcja',
    label: 'AKCJA',
    blocks: Object.values(CMS_BLOCK_REGISTRY).filter((e) => e.group === 'akcja'),
  },
  {
    id: 'media',
    label: 'MEDIA',
    blocks: Object.values(CMS_BLOCK_REGISTRY).filter((e) => e.group === 'media'),
  },
  {
    id: 'layout',
    label: 'LAYOUT',
    blocks: Object.values(CMS_BLOCK_REGISTRY).filter((e) => e.group === 'layout'),
  },
]
