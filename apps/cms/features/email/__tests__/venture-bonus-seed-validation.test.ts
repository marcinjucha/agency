import { describe, it, expect } from 'vitest'
import { updateEmailTemplateSchema } from '../validation'

// ---------------------------------------------------------------------------
// Regression (Bug A, 2026-07-14): the seeded `venture_bonus` email template
// (supabase/migrations/20260714120000_seed_venture_bonus_email_template.sql)
// originally shipped its heading block (blocks[1]) WITHOUT a `color` field. The
// email block registry requires `heading.color` (block-registry.ts headingBlockSchema,
// mirrored in validation.ts headingSchema), so opening the template in the CMS
// editor and saving failed Zod with `invalid_type … path ["blocks",1,"color"] Required`
// — the template could never be saved.
//
// These tests pin that the (fixed) seeded blocks validate against the update
// schema, and that dropping `color` from the heading reproduces the failure —
// so this can't regress silently via another "dead-data cleanup".
// ---------------------------------------------------------------------------

// Mirrors the seed migration's `blocks` JSONB verbatim (post-fix — heading has color).
const SEEDED_VENTURE_BONUS_BLOCKS = [
  { id: 'bonus-header', type: 'header', companyName: '{{companyName}}', textColor: '#ffffff' },
  { id: 'bonus-heading', type: 'heading', text: 'Twoje bonusy są gotowe', level: 'h2', color: '#1a1a2e' },
  {
    id: 'bonus-intro',
    type: 'text',
    content: '<p>Dziękujemy! Poniżej znajdziesz materiały, które dla Ciebie przygotowaliśmy.</p>',
  },
  { id: 'bonus-list-marker', type: 'text', content: '{{bonus_list}}' },
  {
    id: 'bonus-inbox-note',
    type: 'text',
    content: '<p>Sprawdź swoją skrzynkę — wkrótce odezwiemy się z informacją o starcie.</p>',
  },
  {
    id: 'bonus-footer',
    type: 'footer',
    text: 'Wiadomość wysłana automatycznie przez {{companyName}}. Prosimy nie odpowiadać na ten email.',
  },
] as const

const BASE_UPDATE_PAYLOAD = {
  subject: 'Twoje bonusy od {{companyName}}',
  template_variables: [
    { key: 'companyName', label: 'Nazwa marki' },
    { key: 'bonus_list', label: 'Lista bonusów' },
  ],
  label: 'Mail bonusowy (venture)',
  theme_id: null,
}

describe('venture_bonus seeded template — email update schema', () => {
  it('the seeded blocks validate against updateEmailTemplateSchema (heading has color)', () => {
    const result = updateEmailTemplateSchema.safeParse({
      ...BASE_UPDATE_PAYLOAD,
      blocks: SEEDED_VENTURE_BONUS_BLOCKS,
    })

    expect(result.success).toBe(true)
  })

  it('dropping color from the heading block reproduces the Bug A failure', () => {
    const brokenBlocks = SEEDED_VENTURE_BONUS_BLOCKS.map((b) =>
      b.id === 'bonus-heading' ? { id: b.id, type: b.type, text: b.text, level: b.level } : b,
    )

    const result = updateEmailTemplateSchema.safeParse({
      ...BASE_UPDATE_PAYLOAD,
      blocks: brokenBlocks,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const colorIssue = result.error.issues.find(
        (issue) => issue.path[0] === 'blocks' && issue.path[1] === 1 && issue.path[2] === 'color',
      )
      expect(colorIssue).toBeDefined()
    }
  })
})
