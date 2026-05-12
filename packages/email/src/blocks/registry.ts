import type { ComponentType } from 'react'
import { HeaderBlockComponent } from './HeaderBlock'
import { TextBlockComponent } from './TextBlock'
import { CtaBlockComponent } from './CtaBlock'
import { DividerBlockComponent } from './DividerBlock'
import { FooterBlockComponent } from './FooterBlock'
import { HeadingBlockComponent } from './HeadingBlock'
import { ImageBlockComponent } from './ImageBlock'
import { SpacerBlockComponent } from './SpacerBlock'
import { ColumnsBlockComponent } from './ColumnsBlock'
import { BLOCK_DEFAULT_VALUES } from './defaults'
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

/**
 * Wpis w rejestrze bloków emaila.
 * T = konkretny typ bloku (np. HeaderBlock). Generics pozwala zachować type-safe
 * RendererComponent przy jednoczesnym przechowywaniu różnych typów bloków w jednym rejestrze.
 *
 * Na poziomie call-site każdy wpis jest statycznie typed przez `satisfies BlockRegistryEntry<ConcreteT>`.
 * Konsumenci (EmailRenderer) castują do `BlockRegistryEntry<Block>` — bezpieczne bo runtime zapewnia
 * że blok danego type zawsze trafia do właściwego komponentu.
 *
 * defaultValue pochodzi z BLOCK_DEFAULT_VALUES (defaults.ts) — SSoT bez importów @react-email.
 */
export interface BlockRegistryEntry<T> {
  /** Unikalny identyfikator typu bloku — klucz dyskryminujący */
  id: string
  /** Polska etykieta wyświetlana w edytorze */
  label: string
  /** Opis wyświetlany w edytorze */
  description: string
  /** Komponent renderujący blok w emailu */
  RendererComponent: ComponentType<{ block: T }>
  /** Domyślne wartości dla nowego bloku tego typu (bez pola `id`) */
  defaultValue: Omit<T, 'id'>
}

// Każdy wpis jest type-checked przez `satisfies` z konkretnym typem bloku.
// `as const` zachowuje literalne typy kluczy (wymagane przez `keyof typeof BLOCK_REGISTRY`).
export const BLOCK_REGISTRY = {
  header: {
    id: 'header',
    label: 'Nagłówek',
    description: 'Logo i nazwa firmy',
    RendererComponent: HeaderBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.header,
  } satisfies BlockRegistryEntry<HeaderBlock>,

  text: {
    id: 'text',
    label: 'Tekst',
    description: 'Akapit z treścią, obsługuje {{zmienne}}',
    RendererComponent: TextBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.text,
  } satisfies BlockRegistryEntry<TextBlock>,

  cta: {
    id: 'cta',
    label: 'Przycisk CTA',
    description: 'Przycisk z linkiem',
    RendererComponent: CtaBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.cta,
  } satisfies BlockRegistryEntry<CtaBlock>,

  divider: {
    id: 'divider',
    label: 'Linia',
    description: 'Pozioma linia rozdzielająca',
    RendererComponent: DividerBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.divider,
  } satisfies BlockRegistryEntry<DividerBlock>,

  footer: {
    id: 'footer',
    label: 'Stopka',
    description: 'Nota prawna / informacja o automatycznej wysyłce',
    RendererComponent: FooterBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.footer,
  } satisfies BlockRegistryEntry<FooterBlock>,

  heading: {
    id: 'heading',
    label: 'Nagłówek tekstowy',
    description: 'Tytuł lub podtytuł sekcji (h1/h2/h3)',
    RendererComponent: HeadingBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.heading,
  } satisfies BlockRegistryEntry<HeadingBlock>,

  image: {
    id: 'image',
    label: 'Obraz',
    description: 'Grafika z Media Library lub zewnętrznego URL',
    RendererComponent: ImageBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.image,
  } satisfies BlockRegistryEntry<ImageBlock>,

  spacer: {
    id: 'spacer',
    label: 'Odstęp',
    description: 'Pionowy odstęp między blokami (16/32/64px)',
    RendererComponent: SpacerBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.spacer,
  } satisfies BlockRegistryEntry<SpacerBlock>,

  columns: {
    id: 'columns',
    label: 'Kolumny',
    description: 'Dwukolumnowy układ (max 1 poziom zagnieżdżenia)',
    RendererComponent: ColumnsBlockComponent,
    defaultValue: BLOCK_DEFAULT_VALUES.columns,
  } satisfies BlockRegistryEntry<ColumnsBlock>,
} as const
