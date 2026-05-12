import type { Tables } from '@agency/database'
import type { Block } from '@agency/email'

// Re-export block types from shared package for convenience
export type {
  Block,
  BlockType,
  HeaderBlock,
  TextBlock,
  CtaBlock,
  DividerBlock,
  FooterBlock,
  HeadingBlock,
  ImageBlock,
  SpacerBlock,
  ColumnsBlock,
  NonColumnsBlock,
} from '@agency/email'

// EmailTemplate from DB with typed blocks
export type EmailTemplate = Omit<Tables<'email_templates'>, 'blocks'> & {
  blocks: Block[]
}

export const TEMPLATE_TYPE_LABELS = {
  form_confirmation: 'Potwierdzenie formularza',
  workflow_custom: 'Szablon workflow',
} as const

// Derived from TEMPLATE_TYPE_LABELS — single source of truth
export type EmailTemplateType = keyof typeof TEMPLATE_TYPE_LABELS

// ---------------------------------------------------------------------------
// Template Variables
//
// Zmienne szablonu — auto-wykrywane z {{key}} w treści (subject + bloki).
// User może edytować label i description dla każdej zmiennej.
// Zapisywane w email_templates.template_variables JSONB.
// ---------------------------------------------------------------------------

export interface TemplateVariable {
  key: string
  label: string
  description?: string
  source?: string  // 'trigger' — auto-detected, 'manual' — future
}
