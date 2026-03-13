export type BlockType = 'header' | 'text' | 'cta' | 'divider' | 'footer'

export interface HeaderBlock {
  id: string
  type: 'header'
  companyName: string
  backgroundColor: string  // hex, default '#1a1a2e'
  textColor: string        // hex, default '#ffffff'
}

export interface TextBlock {
  id: string
  type: 'text'
  content: string  // HTML content, supports {{clientName}}, {{surveyTitle}} variables
}

export interface CtaBlock {
  id: string
  type: 'cta'
  label: string
  url: string
  backgroundColor: string  // hex, default '#1a1a2e'
  textColor: string        // hex, default '#ffffff'
}

export interface DividerBlock {
  id: string
  type: 'divider'
  color: string  // hex, default '#e5e7eb'
}

export interface FooterBlock {
  id: string
  type: 'footer'
  text: string  // default 'Wiadomość wysłana automatycznie. Prosimy nie odpowiadać na ten email.'
}

export type Block = HeaderBlock | TextBlock | CtaBlock | DividerBlock | FooterBlock

export const AVAILABLE_BLOCKS: { type: BlockType; label: string; description: string }[] = [
  { type: 'header', label: 'Nagłówek', description: 'Logo i nazwa firmy' },
  { type: 'text', label: 'Tekst', description: 'Akapit z treścią, obsługuje {{zmienne}}' },
  { type: 'cta', label: 'Przycisk CTA', description: 'Przycisk z linkiem' },
  { type: 'divider', label: 'Linia', description: 'Pozioma linia rozdzielająca' },
  { type: 'footer', label: 'Stopka', description: 'Nota prawna / informacja o automatycznej wysyłce' },
]

export const DEFAULT_BLOCKS: Block[] = [
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
    content: 'Otrzymałeś nowe zgłoszenie z formularza <strong>{{surveyTitle}}</strong>.<br/><br/>Klient: <strong>{{clientName}}</strong>',
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
