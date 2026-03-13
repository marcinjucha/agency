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
export type EmailTemplateType = 'form_confirmation'

export const TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  form_confirmation: 'Potwierdzenie formularza',
}

// Available variables per template type
export const TEMPLATE_VARIABLES: Record<EmailTemplateType, { name: string; description: string }[]> = {
  form_confirmation: [
    { name: '{{clientName}}', description: 'Imię klienta (z odpowiedzi)' },
    { name: '{{surveyTitle}}', description: 'Tytuł ankiety' },
    { name: '{{companyName}}', description: 'Nazwa firmy (z profilu tenanta)' },
    { name: '{{responseUrl}}', description: 'Link do zgłoszenia w panelu CMS' },
  ],
}
