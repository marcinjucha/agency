import type { Tables } from '@agency/database'
import type { Block } from '@agency/email'

// Re-export block types from shared package for convenience
export type { Block, BlockType, HeaderBlock, TextBlock, CtaBlock, DividerBlock, FooterBlock } from '@agency/email'
// Turbopack barrel re-export bug: `export { X } from 'module'` breaks Server Actions context.
// Import then re-export instead.
import { AVAILABLE_BLOCKS as _AVAILABLE_BLOCKS, DEFAULT_BLOCKS as _DEFAULT_BLOCKS } from '@agency/email'
export const AVAILABLE_BLOCKS = _AVAILABLE_BLOCKS
export const DEFAULT_BLOCKS = _DEFAULT_BLOCKS

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
