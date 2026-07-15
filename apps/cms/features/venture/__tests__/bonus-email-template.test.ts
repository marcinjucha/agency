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

  it('splices the marker and themes copy blocks INSIDE a section (nesting Iter 1)', () => {
    const withSection: Block[] = [
      { id: 'bonus-header', type: 'header', companyName: '{{companyName}}', textColor: '#ffffff' },
      {
        id: 'card',
        type: 'section',
        padding: 'md',
        children: [
          { id: 'card-text', type: 'text', content: '<p>W karcie</p>' },
          { id: 'card-marker', type: 'text', content: BONUS_LIST_MARKER },
        ],
      },
      { id: 'bonus-footer', type: 'footer', text: 'Stopka {{companyName}}' },
    ]
    const blocks = buildBonusEmailFromTemplate({
      templateBlocks: withSection,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
    })
    const card = blocks[1] as { children: Array<{ id: string; content?: string; textColor?: string }> }
    // Marker podmieniony NA MIEJSCU wewnątrz sekcji (nie doklejony przed stopką).
    expect(card.children.map((c) => c.id)).toEqual(['card-text', 'bonus-list'])
    expect(card.children[1].content).toContain('href="https://drive.example.com/notion"')
    // Dziecko sekcji tematyzowane po roli jak na najwyższym poziomie.
    expect(card.children[0].textColor).toBe(HALO_EFEKT_DEFAULT.text)
    expect(blocks.map((b) => b.id)).toEqual(['bonus-header', 'card', 'bonus-footer'])
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

// [2] TOKEN-BOUND blocks must resolve to the per-campaign RESOLVED theme at send.
// The send now passes a ThemeColorMap (built from the ResolvedTheme) to
// renderEmailBlocks — SAME as the editor preview — so a block bound to a theme
// token (textColorToken / backgroundColorToken) renders the resolved brand colour
// instead of the block default. Before the fix the send rendered with NO map, so a
// token-bound block silently fell back to the default while the editor showed the
// brand colour.
describe('token-bound blocks resolve to the resolved theme (map passed to renderer)', () => {
  // A distinctive accent so the assertion is unambiguous (not equal to any default).
  const THEMED = { ...HALO_EFEKT_DEFAULT, accent: '#abcdef' } as typeof HALO_EFEKT_DEFAULT

  const CTA_TOKEN_BLOCKS: Block[] = [
    { id: 'bonus-list-marker', type: 'text', content: BONUS_LIST_MARKER },
    // CTA background bound to the `accent` token — NO raw backgroundColor, so the
    // themed default/token ref is what resolves.
    {
      id: 'cta',
      type: 'cta',
      label: 'Zrób kopię',
      url: 'https://cta.example.com',
      textColor: '#ffffff',
      backgroundColorToken: 'accent',
    },
  ]

  it('a CTA bound to the accent token renders the resolved accent hex', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: CTA_TOKEN_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: THEMED,
      values: { companyName: 'Kacper Launch' },
    })
    // The per-campaign accent reached the delivered HTML (token resolved via the map).
    expect(html).toContain('#abcdef')
  })

  it('the accent hex is sourced FROM the resolved theme (default theme → no #abcdef)', async () => {
    // Same token-bound CTA, but the DEFAULT theme (whose accent is NOT #abcdef).
    // The distinctive hex must be absent — proving the #abcdef above came from the
    // resolved theme's accent flowing through the map, not from anything incidental.
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: CTA_TOKEN_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    expect(html).not.toContain('#abcdef')
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

// Iter 3c — per-campaign literal variable values flow into the delivered email:
// merged OVER the app-auto { companyName } with empty entries dropped, applied to
// BOTH the HTML body AND the subject. The seeded no-variable render must stay
// byte-identical to the pre-3c baseline (empty/absent campaign values).
describe('per-campaign template variable values (Iter 3c)', () => {
  // A template that references a per-campaign token in a Link href + a text body.
  const TOKEN_TEMPLATE_BLOCKS: Block[] = [
    { id: 'bonus-header', type: 'header', companyName: '{{companyName}}', textColor: '#ffffff' },
    { id: 'bonus-list-marker', type: 'text', content: BONUS_LIST_MARKER },
    { id: 'cta-link', type: 'text', content: '<p><a href="{{bonusUrl}}">Pobierz</a></p>' },
    { id: 'greeting', type: 'text', content: '<p>Cześć {{firstName}}!</p>' },
    { id: 'bonus-footer', type: 'footer', text: 'Stopka {{companyName}}' },
  ]

  it('substitutes a campaign value into a Link href (token gone, value present)', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: TOKEN_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
      templateValues: { bonusUrl: 'https://drive.example.com/x', firstName: 'Marek' },
    })
    expect(html).toContain('href="https://drive.example.com/x"')
    expect(html).toContain('Cześć Marek!')
    expect(html).not.toContain('{{bonusUrl}}')
    expect(html).not.toContain('{{firstName}}')
  })

  it('applies campaign values to the SUBJECT too (a subject token resolves)', async () => {
    const { subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: TOKEN_TEMPLATE_BLOCKS,
      subjectTemplate: 'Bonusy dla {{firstName}} od {{companyName}}',
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
      templateValues: { firstName: 'Marek' },
    })
    expect(subject).toBe('Bonusy dla Marek od Kacper Launch')
  })

  it('a campaign value for companyName OVERRIDES the app-auto brand', async () => {
    const { html, subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'App Auto Brand' },
      templateValues: { companyName: 'Campaign Override' },
    })
    expect(html).toContain('Campaign Override')
    expect(html).not.toContain('App Auto Brand')
    expect(subject).toBe('Twoje bonusy od Campaign Override')
  })

  it('an EMPTY campaign value does NOT clobber the app-auto companyName', async () => {
    const { html, subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'App Auto Brand' },
      templateValues: { companyName: '' },
    })
    expect(html).toContain('App Auto Brand')
    expect(subject).toBe('Twoje bonusy od App Auto Brand')
  })

  it('REGRESSION: empty/absent templateValues → byte-identical to the pre-3c baseline', async () => {
    // The pre-3c output: the hardcoded builder for the seeded no-variable copy.
    const legacyHtml = await renderEmailBlocks(
      buildBonusEmailBlocks({
        campaignDisplayName: 'Kacper Launch',
        bonuses: BONUSES,
        theme: HALO_EFEKT_DEFAULT,
      }),
    )
    // Absent templateValues (omitted).
    const absent = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    // Empty map + a blank override — both must be dropped so nothing changes.
    const empty = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
      templateValues: { companyName: '', firstName: '' },
    })
    expect(absent.html).toBe(legacyHtml)
    expect(empty.html).toBe(legacyHtml)
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

  // NO-LEAK backstop (INV-3) — Phase 4. venture_bonus is APP-OWNED: the send path
  // fills only companyName + the structural bonus_list marker, so ANY residual
  // `{{token}}` after substitution is guaranteed unfillable and must be stripped
  // (a seeded literal {{firstName}} once leaked to a recipient). This DELIBERATELY
  // reverses the earlier n8n-parity "leave it literal" behaviour, which only holds
  // for n8n-sent templates whose bindings are not code-knowable — not here.
  it('NO-LEAK: a stray {{unknownToken}} is stripped from the final HTML (not left literal)', async () => {
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
    expect(html).not.toContain('{{unknownKey}}')
    // Zero residual tokens of ANY name reach the recipient.
    expect(html).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
  })

  it('NO-LEAK: stray token AND a missing bonus_list marker → no {{...}} leaks, list still present', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      // A stray token, and the bonus_list marker embedded in content (not a
      // standalone block) so it escapes block-splicing → the list falls back to
      // before-footer and the literal marker would otherwise survive.
      templateBlocks: [
        { id: 'stray', type: 'text', content: '<p>{{unresolved.deep}}</p>' },
        { id: 'mis-marker', type: 'text', content: `<p>${BONUS_LIST_MARKER}</p>` },
        {
          id: 'bonus-footer',
          type: 'footer',
          text: 'Wysłano przez {{companyName}}.',
        },
      ],
      subjectTemplate: SUBJECT_TEMPLATE,
      bonuses: BONUSES,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    // No residual token of any kind (stray token AND the escaped bonus_list marker).
    expect(html).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
    expect(html).not.toContain(BONUS_LIST_MARKER)
    // The programmatic bonus list is STILL present (spliced before-footer) — the
    // no-leak strip must not remove the real content.
    expect(html).toContain('href="https://drive.example.com/notion"')
    // The filled app token survived.
    expect(html).toContain('Kacper Launch')
  })
})
