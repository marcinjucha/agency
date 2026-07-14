import { describe, it, expect } from 'vitest'
import { renderEmailBlocks, type Block } from '@agency/email'
import { buildBonusEmailBlocks } from '../mail/bonus-email'
import {
  buildBonusEmailFromTemplate,
  buildBonusEmailFromTemplateHtml,
  BONUS_LIST_MARKER,
} from '../mail/bonus-email-template'
import { HALO_EFEKT_DEFAULT } from '@/lib/theme'

// The seed copy blocks (mirror of the seed migration
// 20260714_..._seed_venture_bonus_email_template.sql). Themeless + tokenised:
//   - header / footer carry {{companyName}}
//   - a text block whose content is the {{bonus_list}} marker pins the splice
//     position between the intro and the inbox-note (== today's list position)
// The builder overlays the resolved theme by role, so the DEFAULT theme yields
// the SAME colours the hardcoded builder bakes inline — the byte-identical AC.
const SEED_BONUS_TEMPLATE_BLOCKS: Block[] = [
  { id: 'bonus-header', type: 'header', companyName: '{{companyName}}', textColor: '#ffffff' },
  { id: 'bonus-heading', type: 'heading', text: 'Twoje bonusy są gotowe', level: 'h2', color: '#1a1a2e' },
  {
    id: 'bonus-intro',
    type: 'text',
    content: '<p>Dziękujemy! Poniżej znajdziesz materiały, które dla Ciebie przygotowaliśmy.</p>',
  },
  { id: 'bonus-list-marker', type: 'text', content: BONUS_LIST_MARKER },
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
]

const SUBJECT_TEMPLATE = 'Twoje bonusy od {{companyName}}'

const BONUSES = [
  { title: 'Szablon Notion', url: 'https://drive.example.com/notion' },
  { title: 'Checklista PDF', url: 'https://drive.example.com/pdf' },
]

describe('buildBonusEmailFromTemplate (pure)', () => {
  it('replaces the {{bonus_list}} marker with the programmatic list, in place', () => {
    const blocks = buildBonusEmailFromTemplate({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
    })
    const ids = blocks.map((b) => b.id)
    // Marker gone; the list sits exactly where the marker was (index 3).
    expect(ids).toEqual([
      'bonus-header',
      'bonus-heading',
      'bonus-intro',
      'bonus-list',
      'bonus-inbox-note',
      'bonus-footer',
    ])
    const list = blocks[3] as { content: string }
    expect(list.content).toContain('href="https://drive.example.com/notion"')
  })

  it('falls back to before-footer when the marker was removed (list never dropped)', () => {
    const noMarker = SEED_BONUS_TEMPLATE_BLOCKS.filter((b) => b.id !== 'bonus-list-marker')
    const blocks = buildBonusEmailFromTemplate({
      templateBlocks: noMarker,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
    })
    const ids = blocks.map((b) => b.id)
    expect(ids).toEqual([
      'bonus-header',
      'bonus-heading',
      'bonus-intro',
      'bonus-inbox-note',
      'bonus-list',
      'bonus-footer',
    ])
  })

  it('overlays the resolved theme onto copy blocks by role', () => {
    const blocks = buildBonusEmailFromTemplate({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
    })
    const header = blocks.find((b) => b.id === 'bonus-header') as {
      backgroundColor: string
      textColor: string
    }
    expect(header.backgroundColor).toBe('#1a1a2e')
    expect(header.textColor).toBe('#ffffff')
    const footer = blocks.find((b) => b.id === 'bonus-footer') as { textColor: string }
    expect(footer.textColor).toBe('#94a3b8')
  })
})

describe('byte-identical regression (load-bearing AC)', () => {
  it('hybrid render == hardcoded buildBonusEmailBlocks output for the same bonuses + default theme', async () => {
    const legacyHtml = await renderEmailBlocks(
      buildBonusEmailBlocks({
        campaignDisplayName: 'Kacper Launch',
        bonuses: BONUSES,
        theme: HALO_EFEKT_DEFAULT,
      }),
    )

    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })

    expect(html).toBe(legacyHtml)
  })

  it('subject matches the hardcoded subject for the same brand', async () => {
    const { subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    expect(subject).toBe('Twoje bonusy od Kacper Launch')
  })
})

describe('brand with an apostrophe — SEMANTIC equivalence, NOT byte-identical', () => {
  // The byte-identical AC holds only for special-char-free copy. A brand with a
  // `'` is escaped by BOTH paths (no raw quote leaks that could break an
  // attribute) but in a DIFFERENT entity FORM: the hybrid path substitutes via
  // escapeHtml (`'` → `&#39;`), the hardcoded builder emits the brand through
  // React JSX (`'` → `&#x27;`). Assert equivalence, not byte equality.
  const BRAND_WITH_APOS = "Ala's Launch"

  it('both paths escape the apostrophe (no raw quote), differing only in entity form', async () => {
    const legacyHtml = await renderEmailBlocks(
      buildBonusEmailBlocks({
        campaignDisplayName: BRAND_WITH_APOS,
        bonuses: BONUSES,
        theme: HALO_EFEKT_DEFAULT,
      }),
    )
    const { html: hybridHtml } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: BRAND_WITH_APOS },
    })

    // Neither path leaks the raw brand (raw `'` would be an injection risk in an
    // attribute context).
    expect(legacyHtml).not.toContain(BRAND_WITH_APOS)
    expect(hybridHtml).not.toContain(BRAND_WITH_APOS)

    // Both escape the apostrophe (either valid entity form is accepted).
    expect(legacyHtml).toMatch(/Ala(&#x27;|&#39;)s Launch/)
    expect(hybridHtml).toMatch(/Ala(&#x27;|&#39;)s Launch/)

    // They are NOT byte-identical here — this is exactly why the byte-identical
    // regression is scoped to the special-char-free seed copy.
    expect(hybridHtml).not.toBe(legacyHtml)
  })
})

describe('dynamic bonus list — 0 / 1 / many (no cap, empty fallback preserved)', () => {
  async function renderWith(bonuses: Array<{ title: string | null; url: string | null }>) {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    return html
  }

  it('0 bonuses → empty-case fallback copy', async () => {
    const html = await renderWith([])
    expect(html).toContain('Bonusy pojawią się wkrótce.')
  })

  it('1 bonus → exactly that link', async () => {
    const html = await renderWith([{ title: 'Solo', url: 'https://a' }])
    expect(html).toContain('href="https://a"')
    expect(html).toContain('Solo')
  })

  it('many bonuses → all rendered, no count cap', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({
      title: `Bonus ${i}`,
      url: `https://drive.example.com/${i}`,
    }))
    const html = await renderWith(many)
    for (const b of many) {
      expect(html).toContain(`href="${b.url}"`)
      expect(html).toContain(b.title)
    }
  })
})

describe('copy variable substitution', () => {
  it('substitutes {{companyName}} in header + footer, leaves no literal token', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Przystań Inwestorów' },
    })
    expect(html).toContain('Przystań Inwestorów')
    expect(html).not.toContain('{{companyName}}')
  })

  it('mis-formatted marker (<p>{{bonus_list}}</p>) → list still renders, no literal marker leaks', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      // The marker is embedded inside a <p>, so it is NOT recognised as a
      // standalone marker block → the list falls back to before-footer.
      templateBlocks: [
        { id: 'intro', type: 'text', content: `<p>${BONUS_LIST_MARKER}</p>` },
        {
          id: 'bonus-footer',
          type: 'footer',
          text: 'Wiadomość wysłana automatycznie przez {{companyName}}.',
        },
      ],
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    // List still rendered (before-footer fallback) …
    expect(html).toContain('href="https://drive.example.com/notion"')
    // … and the literal token never leaked into the sent HTML.
    expect(html).not.toContain(BONUS_LIST_MARKER)
  })

  it('leaves an unknown token literal (n8n parity — mis-binding stays detectable)', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: [
        { id: 'x', type: 'text', content: '<p>{{unknownKey}}</p>' },
        { id: 'bonus-list-marker', type: 'text', content: BONUS_LIST_MARKER },
      ],
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'X' },
    })
    expect(html).toContain('{{unknownKey}}')
  })
})
