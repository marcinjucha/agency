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
  LinkBlock,
  PreviewBlock,
  ColumnsBlock,
  SectionBlock,
  SectionChildBlock,
  SectionPadding,
  NonColumnsBlock,
  BlockStyleCommon,
  BlockTypography,
  BlockBorder,
} from '@agency/email'

// Sentinel emitted by the "Lista bonusów" affordance in AddBlockPopover. It is
// NOT a real block type (never enters the registry) — the add-block handlers
// recognise it and insert a pre-filled `text` block carrying the {{bonus_list}}
// marker instead. Distinct string literal so TS discriminates it from BlockType.
export const BONUS_LIST_PICK = '__bonus_list__' as const
export type AddBlockPick = import('@agency/email').BlockType | typeof BONUS_LIST_PICK

// EmailTemplate from DB with typed blocks
export type EmailTemplate = Omit<Tables<'email_templates'>, 'blocks'> & {
  blocks: Block[]
}

// User-defined template slug (e.g. 'form_confirmation', 'marketing_blast').
// Validated by `templateSlugSchema` in `./validation` — lowercase ASCII, digits,
// underscores, must start with a letter, max 50 chars.
// Workflows reference templates by slug, so the slug is immutable post-creation.
export type EmailTemplateType = string

// ---------------------------------------------------------------------------
// Template Variables
//
// Zmienne szablonu — auto-wykrywane z {{key}} w treści (subject + bloki).
// User może edytować label i description dla każdej zmiennej.
// Zapisywane w email_templates.template_variables JSONB.
//
// `source`:
// - 'trigger' — auto-detected from template body (subject/blocks scan)
// - 'manual'  — user-added explicitly; must survive body edits / re-extraction
// ---------------------------------------------------------------------------

export type TemplateVariableSource = 'trigger' | 'manual'

export interface TemplateVariable {
  key: string
  label: string
  description?: string
  source?: TemplateVariableSource
}
