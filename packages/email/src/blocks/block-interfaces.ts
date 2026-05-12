/**
 * Interfejsy poszczególnych bloków emaila.
 * Plik oddzielony od types.ts żeby uniknąć circular dependency:
 *   block-interfaces.ts ← registry.ts ← types.ts
 *
 * Kształt każdego interfejsu MUSI pozostać kompatybilny wstecznie —
 * CMS przechowuje bloki jako JSONB w bazie danych.
 */

export interface HeaderBlock {
  id: string
  type: 'header'
  companyName: string
  backgroundColor: string // hex, default '#1a1a2e'
  textColor: string // hex, default '#ffffff'
}

export interface TextBlock {
  id: string
  type: 'text'
  content: string // HTML content, obsługuje {{clientName}}, {{surveyTitle}} variables
}

export interface CtaBlock {
  id: string
  type: 'cta'
  label: string
  url: string
  backgroundColor: string // hex, default '#1a1a2e'
  textColor: string // hex, default '#ffffff'
}

export interface DividerBlock {
  id: string
  type: 'divider'
  color: string // hex, default '#e5e7eb'
}

export interface FooterBlock {
  id: string
  type: 'footer'
  text: string // default 'Wiadomość wysłana automatycznie. Prosimy nie odpowiadać na ten email.'
}

export interface HeadingBlock {
  id: string
  type: 'heading'
  text: string
  level: 'h1' | 'h2' | 'h3'
  textAlign: 'left' | 'center' | 'right'
  color: string // hex
}

export interface ImageBlock {
  id: string
  type: 'image'
  src: string // URL (z Media Library lub ręcznie)
  alt: string
  width: number // px, default 600
  alignment: 'left' | 'center' | 'right'
}

export interface SpacerBlock {
  id: string
  type: 'spacer'
  size: 'sm' | 'md' | 'lg' // 16/32/64px
}

/**
 * Blok kolumnowy — dwukolumnowy nested layout (max nesting = 1, columns nie może zawierać columns).
 * leftChildren / rightChildren = zagnieżdżone bloki (wszystkie typy OPRÓCZ ColumnsBlock).
 *
 * Ograniczenie max nesting depth = 1 wymuszone przez:
 *   - Zod schema (nonColumnsBlockSchema wyklucza 'columns' z discriminatedUnion dzieci)
 *   - EditorComponent (paleta mini nie oferuje 'columns')
 */
export type NonColumnsBlock = HeaderBlock | TextBlock | CtaBlock | DividerBlock | FooterBlock | HeadingBlock | ImageBlock | SpacerBlock

export interface ColumnsBlock {
  id: string
  type: 'columns'
  leftChildren: NonColumnsBlock[]
  rightChildren: NonColumnsBlock[]
  gap: 'sm' | 'md' | 'lg' // 8/16/32px między kolumnami
  verticalAlign: 'top' | 'middle' | 'bottom'
}
