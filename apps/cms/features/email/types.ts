import type { Tables } from '@agency/database'
import type { Block } from '@agency/email'

// Re-export block types from shared package for convenience
export type { Block, BlockType, HeaderBlock, TextBlock, CtaBlock, DividerBlock, FooterBlock } from '@agency/email'

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
