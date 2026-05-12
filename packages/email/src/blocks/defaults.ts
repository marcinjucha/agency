/**
 * Domyślne wartości bloków emaila — bez importów z @react-email.
 *
 * Plik celowo nie importuje żadnych zależności serwera (@react-email, html-to-text).
 * Eksportowany jest zarówno przez packages/email jak i bezpośrednio przez CMS,
 * dzięki czemu nie wciąga @react-email do bundle'a klienta.
 *
 * BLOCK_DEFAULT_VALUES   = domyślne wartości per-typ bloku (używane do tworzenia nowego bloku w edytorze)
 * DEFAULT_BLOCKS         = business defaults dla nowego szablonu Halo Efekt (kompletna lista bloków z id)
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
  ColumnsBlock,
} from './block-interfaces'

// Union wszystkich bloków — lustrzane odbicie Block z types.ts, bez circular dependency.
// Celowo nie importujemy z types.ts żeby zachować zero-dependency isolation tego pliku.
type AnyBlock = HeaderBlock | TextBlock | CtaBlock | DividerBlock | FooterBlock | HeadingBlock | ImageBlock | SpacerBlock | ColumnsBlock

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
  columns: BlockWithoutId<ColumnsBlock>
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
    textAlign: 'left',
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
  columns: {
    type: 'columns' as const,
    leftChildren: [],
    rightChildren: [],
    gap: 'md',
    verticalAlign: 'top',
  },
}

// Business defaults dla nowego szablonu — kompletna lista bloków gotowych do wstawienia.
// Odmienne od BLOCK_DEFAULT_VALUES: tu zawierają `id` i treść specyficzną dla Halo Efekt.
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
      'Otrzymałeś nowe zgłoszenie z formularza <strong>{{surveyTitle}}</strong>.<br/><br/>Klient: <strong>{{clientName}}</strong>',
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
