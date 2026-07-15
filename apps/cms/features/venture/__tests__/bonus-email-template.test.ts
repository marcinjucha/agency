import { describe, it, expect } from 'vitest'
import { renderEmailBlocks, type Block } from '@agency/email'
import { buildBonusEmailBlocks } from '../mail/bonus-email'
import {
  buildBonusEmailFromTemplate,
  buildBonusEmailFromTemplateHtml,
} from '../mail/bonus-email-template'
// The `{{bonus_list}}` marker is NO LONGER a structural splice point (Iter 4b):
// the template path renders authored blocks as-is and the marker, if present in a
// legacy template, is left unresolved → stripped by stripResidualTokens. We import
// it from its canonical home (the venture builder no longer re-exports it) purely
// to build legacy-marker fixtures and assert the token is stripped, not spliced.
import { VENTURE_BONUS_MARKER as BONUS_LIST_MARKER } from '@/lib/app-sent-variables'
import { HALO_EFEKT_DEFAULT } from '@/lib/theme'

// The seed copy blocks (mirror of the seed migration). Themeless + tokenised:
//   - header / footer carry {{companyName}}
//   - a legacy text block whose content is the {{bonus_list}} marker (kept here to
//     prove it is now stripped, NOT spliced into a programmatic list)
// The builder overlays the resolved theme by role.
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

// Only used by the HARDCODED builder (`buildBonusEmailBlocks`) — the template path
// no longer accepts a bonuses input (bonus links now come from campaign variables).
const BONUSES = [
  { title: 'Szablon Notion', url: 'https://drive.example.com/notion' },
  { title: 'Checklista PDF', url: 'https://drive.example.com/pdf' },
]

describe('buildBonusEmailFromTemplate (pure) — themes authored blocks AS-IS, no splice', () => {
  it('renders the authored blocks unchanged in order (a legacy marker block is NOT replaced)', () => {
    const blocks = buildBonusEmailFromTemplate({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      theme: HALO_EFEKT_DEFAULT,
    })
    // No block is added or removed — the legacy marker text block stays in place
    // (it will be rendered then stripped at the HTML stage, never spliced).
    expect(blocks.map((b) => b.id)).toEqual([
      'bonus-header',
      'bonus-heading',
      'bonus-intro',
      'bonus-list-marker',
      'bonus-inbox-note',
      'bonus-footer',
    ])
    const marker = blocks.find((b) => b.id === 'bonus-list-marker') as { content: string }
    expect(marker.content).toBe(BONUS_LIST_MARKER)
  })

  it('themes copy blocks INSIDE a section by role, without altering structure', () => {
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
      theme: HALO_EFEKT_DEFAULT,
    })
    const card = blocks[1] as {
      children: Array<{ id: string; content?: string; textColor?: string }>
    }
    // Section children unchanged in count/order (no splice into the section).
    expect(card.children.map((c) => c.id)).toEqual(['card-text', 'card-marker'])
    // Child copy still themed by role like the top level.
    expect(card.children[0].textColor).toBe(HALO_EFEKT_DEFAULT.text)
    expect(blocks.map((b) => b.id)).toEqual(['bonus-header', 'card', 'bonus-footer'])
  })

  it('overlays the resolved theme onto copy blocks by role', () => {
    const blocks = buildBonusEmailFromTemplate({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
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

describe('subject substitution', () => {
  it('subject resolves {{companyName}} for the given brand', async () => {
    const { subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    expect(subject).toBe('Twoje bonusy od Kacper Launch')
  })

  // F3 (INV-3): an UNFILLED subject token is unfillable by construction on this
  // app-owned path and must NOT ship literally in the inbox subject line. Previously
  // `substituteSubject` left it as `{{firstName}}` (e.g. the seeded default subject).
  it('strips an unfilled subject token instead of shipping it literally', async () => {
    const { subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: 'Cześć {{firstName}}, bonusy od {{companyName}}',
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    // The filled token resolved; the unfilled one was stripped (not left literal).
    expect(subject).not.toContain('{{firstName}}')
    expect(subject).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
    expect(subject).toContain('Kacper Launch')
  })

  it('strips a padded/dotted unfilled subject token too (grammar parity with the body)', async () => {
    const { subject } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: 'Od {{companyName}} {{ mystery.key }}',
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    expect(subject).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
    expect(subject).toContain('Kacper Launch')
  })
})

// [2] TOKEN-BOUND blocks must resolve to the per-campaign RESOLVED theme at send.
// The send passes a ThemeColorMap (built from the ResolvedTheme) to
// renderEmailBlocks — SAME as the editor preview — so a block bound to a theme
// token (textColorToken / backgroundColorToken) renders the resolved brand colour
// instead of the block default.
describe('token-bound blocks resolve to the resolved theme (map passed to renderer)', () => {
  // A distinctive accent so the assertion is unambiguous (not equal to any default).
  const THEMED = { ...HALO_EFEKT_DEFAULT, accent: '#abcdef' } as typeof HALO_EFEKT_DEFAULT

  const CTA_TOKEN_BLOCKS: Block[] = [
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
      theme: THEMED,
      values: { companyName: 'Kacper Launch' },
    })
    // The per-campaign accent reached the delivered HTML (token resolved via the map).
    expect(html).toContain('#abcdef')
  })

  it('the accent hex is sourced FROM the resolved theme (default theme → no #abcdef)', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: CTA_TOKEN_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    expect(html).not.toContain('#abcdef')
  })
})

describe('brand with an apostrophe — SEMANTIC equivalence, NOT byte-identical', () => {
  // A brand with a `'` is escaped by BOTH the template path and the hardcoded
  // builder (no raw quote leaks that could break an attribute) but in a DIFFERENT
  // entity FORM: the template path substitutes via escapeHtml (`'` → `&#39;`), the
  // hardcoded builder emits the brand through React JSX (`'` → `&#x27;`). Assert
  // escape equivalence (not byte equality — the paths also differ because the
  // hardcoded builder still injects the programmatic bonus list, the template does not).
  const BRAND_WITH_APOS = "Ala's Launch"

  it('both paths escape the apostrophe (no raw quote), differing only in entity form', async () => {
    const legacyHtml = await renderEmailBlocks(
      buildBonusEmailBlocks({
        campaignDisplayName: BRAND_WITH_APOS,
        bonuses: BONUSES,
        theme: HALO_EFEKT_DEFAULT,
      }),
    )
    const { html: templateHtml } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: BRAND_WITH_APOS },
    })

    // Neither path leaks the raw brand (raw `'` would be an injection risk in an
    // attribute context).
    expect(legacyHtml).not.toContain(BRAND_WITH_APOS)
    expect(templateHtml).not.toContain(BRAND_WITH_APOS)

    // Both escape the apostrophe (either valid entity form is accepted).
    expect(legacyHtml).toMatch(/Ala(&#x27;|&#39;)s Launch/)
    expect(templateHtml).toMatch(/Ala(&#x27;|&#39;)s Launch/)

    // They are NOT byte-identical.
    expect(templateHtml).not.toBe(legacyHtml)
  })
})

// Iter 3c — per-campaign literal variable values flow into the delivered email:
// merged OVER the app-auto { companyName } with empty entries dropped, applied to
// BOTH the HTML body AND the subject.
describe('per-campaign template variable values (Iter 3c)', () => {
  // A template that references a per-campaign token in a Link href + a text body.
  const TOKEN_TEMPLATE_BLOCKS: Block[] = [
    { id: 'bonus-header', type: 'header', companyName: '{{companyName}}', textColor: '#ffffff' },
    { id: 'cta-link', type: 'text', content: '<p><a href="{{bonusUrl}}">Pobierz</a></p>' },
    { id: 'greeting', type: 'text', content: '<p>Cześć {{firstName}}!</p>' },
    { id: 'bonus-footer', type: 'footer', text: 'Stopka {{companyName}}' },
  ]

  it('substitutes a campaign value into a Link href (token gone, value present)', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: TOKEN_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
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
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'App Auto Brand' },
      templateValues: { companyName: '' },
    })
    expect(html).toContain('App Auto Brand')
    expect(subject).toBe('Twoje bonusy od App Auto Brand')
  })

  it('PARITY: empty/blank templateValues produce output identical to omitting them', async () => {
    // The invariant Iter 3c guards: empty entries are dropped, so a blank campaign
    // value never clobbers an app-auto one — absent and empty maps must be equal.
    const absent = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    const empty = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
      templateValues: { companyName: '', firstName: '' },
    })
    expect(empty.html).toBe(absent.html)
    expect(empty.subject).toBe(absent.subject)
  })
})

describe('copy variable substitution + no-leak backstop', () => {
  it('substitutes {{companyName}} in header + footer, leaves no literal token', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: SEED_BONUS_TEMPLATE_BLOCKS,
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Przystań Inwestorów' },
    })
    expect(html).toContain('Przystań Inwestorów')
    expect(html).not.toContain('{{companyName}}')
  })

  // Iter 4b core AC: the TEMPLATE path no longer injects a programmatic bonus list.
  // A legacy `{{bonus_list}}` marker is left unresolved → stripped (the intended
  // migration). No links, no empty-case fallback copy — nothing is spliced in.
  it('leaves a legacy {{bonus_list}} token unrendered (stripped), injecting NO programmatic list', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: [
        { id: 'intro', type: 'text', content: '<p>Cześć</p>' },
        { id: 'legacy-marker', type: 'text', content: BONUS_LIST_MARKER },
        {
          id: 'bonus-footer',
          type: 'footer',
          text: 'Wiadomość wysłana automatycznie przez {{companyName}}.',
        },
      ],
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    // The legacy marker token is stripped — never rendered literally, never spliced.
    expect(html).not.toContain(BONUS_LIST_MARKER)
    expect(html).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
    // No programmatic bonus list injected — neither links nor the hardcoded
    // builder's empty-case fallback copy.
    expect(html).not.toContain('Bonusy pojawią się wkrótce.')
    expect(html).not.toContain('href=')
    // Surrounding authored copy still rendered; the filled app token survived.
    expect(html).toContain('Cześć')
    expect(html).toContain('Kacper Launch')
  })

  // NO-LEAK backstop (INV-3). venture_bonus is APP-OWNED: the send path fills only
  // companyName + per-campaign variables, so ANY residual `{{token}}` after
  // substitution is guaranteed unfillable and must be stripped (a seeded literal
  // {{firstName}} once leaked to a recipient).
  it('NO-LEAK: a stray {{unknownToken}} is stripped from the final HTML (not left literal)', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: [
        { id: 'x', type: 'text', content: '<p>{{unknownKey}}</p>' },
        { id: 'bonus-footer', type: 'footer', text: 'Stopka {{companyName}}' },
      ],
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'X' },
    })
    expect(html).not.toContain('{{unknownKey}}')
    // Zero residual tokens of ANY name reach the recipient.
    expect(html).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
  })

  it('NO-LEAK: a stray token AND a legacy bonus_list marker both stripped; filled token survives', async () => {
    const { html } = await buildBonusEmailFromTemplateHtml({
      templateBlocks: [
        { id: 'stray', type: 'text', content: '<p>{{unresolved.deep}}</p>' },
        { id: 'legacy-marker', type: 'text', content: BONUS_LIST_MARKER },
        {
          id: 'bonus-footer',
          type: 'footer',
          text: 'Wysłano przez {{companyName}}.',
        },
      ],
      subjectTemplate: SUBJECT_TEMPLATE,
      theme: HALO_EFEKT_DEFAULT,
      values: { companyName: 'Kacper Launch' },
    })
    // No residual token of any kind (stray token AND the legacy bonus_list marker).
    expect(html).not.toMatch(/\{\{\s*[\w.]+\s*\}\}/)
    expect(html).not.toContain(BONUS_LIST_MARKER)
    // The filled app token survived.
    expect(html).toContain('Kacper Launch')
  })
})
