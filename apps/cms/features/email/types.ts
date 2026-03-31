import type { Tables } from '@agency/database'
import type { Block } from '@agency/email'

// Re-export block types from shared package for convenience
export type { Block, BlockType, HeaderBlock, TextBlock, CtaBlock, DividerBlock, FooterBlock } from '@agency/email'
export { AVAILABLE_BLOCKS, DEFAULT_BLOCKS } from '@agency/email'

// EmailTemplate from DB with typed blocks
export type EmailTemplate = Omit<Tables<'email_templates'>, 'blocks'> & {
  blocks: Block[]
}

// Template type enum
export type EmailTemplateType = 'form_confirmation' | 'workflow_custom'

export const TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  form_confirmation: 'Potwierdzenie formularza',
  workflow_custom: 'Szablon workflow',
}
