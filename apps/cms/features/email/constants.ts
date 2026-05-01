// Local copies of email block constants — type-only import from @agency/email
// to avoid pulling html-to-text (via @react-email/components) into the client bundle.
// The original runtime values live in packages/email/src/blocks/types.ts; this file
// must stay in sync with that source. Renderers (@agency/email runtime) are accessed
// only via render.server.ts, never from client code paths.
import type { Block, BlockType } from '@agency/email'

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
