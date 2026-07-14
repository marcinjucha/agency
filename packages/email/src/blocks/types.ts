/**
 * Publiczne typy pakietu @agency/email.
 *
 * BlockType i Block są DERIVED z BLOCK_REGISTRY — nie są ręcznie pisane.
 * Dodanie nowego typu bloku = wpis w registry.ts, nie edycja tego pliku.
 *
 * Interfejsy poszczególnych bloków są w block-interfaces.ts (oddzielone żeby
 * uniknąć circular dependency z registry.ts).
 */

// Re-eksport interfejsów bloków — backward compat (istniejący kod importuje z './types')
export type {
  HeaderBlock,
  TextBlock,
  CtaBlock,
  DividerBlock,
  FooterBlock,
  HeadingBlock,
  ImageBlock,
  SpacerBlock,
  ColumnsBlock,
  SectionBlock,
  SectionChildBlock,
  SectionPadding,
  NonColumnsBlock,
} from './block-interfaces'

import { BLOCK_REGISTRY } from './registry'
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
  SectionBlock,
} from './block-interfaces'

/**
 * Union wszystkich typów bloków — derived z kluczy BLOCK_REGISTRY.
 * Dodanie nowego wpisu do registry automatycznie rozszerza ten union.
 */
export type BlockType = keyof typeof BLOCK_REGISTRY

/**
 * Union wszystkich interfejsów bloków.
 * Jawnie wymieniony discriminated union — zapewnia TypeScript exhaustiveness checking.
 */
export type Block = HeaderBlock | TextBlock | CtaBlock | DividerBlock | FooterBlock | HeadingBlock | ImageBlock | SpacerBlock | ColumnsBlock | SectionBlock

/**
 * Lista bloków dostępnych w edytorze — derived z BLOCK_REGISTRY.
 * Używana przez CMS do renderowania palety bloków.
 */
export const AVAILABLE_BLOCKS: { type: BlockType; label: string; description: string }[] =
  (Object.values(BLOCK_REGISTRY) as Array<{ id: string; label: string; description: string }>).map(
    (entry) => ({
      type: entry.id as BlockType,
      label: entry.label,
      description: entry.description,
    })
  )

// DEFAULT_BLOCKS — re-export z defaults.ts (SSoT)
export { DEFAULT_BLOCKS } from './defaults'
