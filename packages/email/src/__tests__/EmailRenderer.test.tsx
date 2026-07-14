import { describe, it, expect } from 'vitest'
import { renderEmailBlocks } from '../EmailRenderer'
import { DEFAULT_BLOCKS } from '../blocks/types'
import type { Block } from '../blocks/types'

describe('EmailRenderer', () => {
  it('renderEmailBlocks(DEFAULT_BLOCKS) produces stable HTML', async () => {
    const html = await renderEmailBlocks(DEFAULT_BLOCKS)

    expect(html).toContain('{{companyName}}')
    expect(html).toContain('{{surveyTitle}}')
    expect(html).toContain('{{clientName}}')
    expect(html).toContain('Zobacz zgłoszenie')
    expect(html).toContain('Wiadomość wygenerowana automatycznie')
    expect(html).toContain('#1a1a2e')
    expect(html).toContain('#e5e7eb')
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(100)
  })

  it('marginBottom preset "large" → 32px paddingBottom on wrapper', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>First</p>', marginBottom: 'large' },
      { id: 'b', type: 'text', content: '<p>Last</p>' },
    ]

    const html = await renderEmailBlocks(blocks)

    expect(html).toContain('padding-bottom:32px')
    expect(html).toContain('First')
    expect(html).toContain('Last')
  })

  it('marginBottom preset "compact" → 8px paddingBottom on wrapper', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>A</p>', marginBottom: 'compact' },
      { id: 'b', type: 'text', content: '<p>B</p>' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding-bottom:8px')
  })

  // --- SectionBlock (email-builder nesting, iter 1) -----------------------

  it('SectionBlock renders children recursively with preset padding + own border', async () => {
    const blocks: Block[] = [
      {
        id: 'sec',
        type: 'section',
        padding: 'lg',
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
        children: [
          { id: 'h', type: 'heading', text: 'Karta', level: 'h2', color: '#0f172a' },
          { id: 't', type: 'text', content: '<p>Wewnątrz sekcji</p>', marginBottom: 'compact' },
        ],
      },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('Karta')
    expect(html).toContain('Wewnątrz sekcji')
    // padding preset lg = 32px na wewnętrznym divie
    expect(html).toContain('padding:32px')
    // border + tło na własnym <Section> sekcji (BORDER_ON_CHILD_TYPES)
    expect(html).toContain('#f1f5f9')
    expect(html).toContain('#e2e8f0')
    // default borderRadius 'soft' dla sekcji
    expect(html).toContain('border-radius:8px')
  })

  it('SectionBlock in section (depth 2) renders nested children', async () => {
    const blocks: Block[] = [
      {
        id: 'outer',
        type: 'section',
        padding: 'none',
        children: [
          {
            id: 'inner',
            type: 'section',
            padding: 'sm',
            children: [{ id: 't', type: 'text', content: '<p>Głęboko</p>' }],
          },
        ],
      },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('Głęboko')
    expect(html).toContain('padding:12px')
  })

  // --- Baked v2 padding (AAA-T-221 2026-05-15) ---------------------------

  it('TextBlock emits baked padding 12px 24px', async () => {
    const blocks: Block[] = [{ id: 'a', type: 'text', content: '<p>Pad</p>' }]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding:12px 24px')
    expect(html).toContain('Pad')
  })

  it('HeaderBlock emits baked padding 32px 24px and 19/600 typography', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'header', companyName: 'ACME', textColor: '#ffffff', backgroundColor: '#1a1a2e' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding:32px 24px')
    expect(html).toContain('font-size:19px')
    expect(html).toContain('font-weight:600')
    expect(html).toContain('ACME')
  })

  it('CTA wrapper emits baked padding 12px 24px 24px', async () => {
    const blocks: Block[] = [
      {
        id: 'a',
        type: 'cta',
        label: 'Click',
        url: 'https://example.com',
        textColor: '#ffffff',
        backgroundColor: '#1a1a2e',
      },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding:12px 24px 24px')
    // Button inner padding baked at 12px 22px
    expect(html).toContain('padding:12px 22px')
    expect(html).toContain('font-size:14px')
    expect(html).toContain('font-weight:600')
  })

  it('FooterBlock emits baked padding 18px 24px 24px and 12px font', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'footer', text: 'Footer copy' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding:18px 24px 24px')
    expect(html).toContain('font-size:12px')
    expect(html).toContain('Footer copy')
  })

  it('ImageBlock wrapper emits baked padding 12px 24px', async () => {
    const blocks: Block[] = [
      {
        id: 'a',
        type: 'image',
        src: 'https://example.com/img.png',
        alt: 'demo',
        width: 480,
        alignment: 'center',
      },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding:12px 24px')
  })

  // --- Baked heading typography per level ---------------------------------

  it('HeadingBlock h1 → font-size:26px font-weight:700', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'heading', text: 'Big', level: 'h1', color: '#000000' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('font-size:26px')
    expect(html).toContain('font-weight:700')
    expect(html).toContain('Big')
  })

  it('HeadingBlock h2 → font-size:20px font-weight:600', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'heading', text: 'Med', level: 'h2', color: '#000000' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('font-size:20px')
    expect(html).toContain('font-weight:600')
  })

  it('HeadingBlock h3 → font-size:16px font-weight:600', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'heading', text: 'Small', level: 'h3', color: '#000000' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('font-size:16px')
    expect(html).toContain('font-weight:600')
  })

  it('HeadingBlock emits padding 24px 24px 4px and letter-spacing -0.01em', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'heading', text: 'X', level: 'h2', color: '#000000' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('padding:24px 24px 4px')
    expect(html).toContain('letter-spacing:-0.01em')
    expect(html).toContain('line-height:1.3')
  })

  // --- DividerBlock baked margin -----------------------------------------

  it('DividerBlock emits edge-to-edge margin 8px 0', async () => {
    const blocks: Block[] = [{ id: 'a', type: 'divider', color: '#cccccc' }]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('margin:8px 0')
    expect(html).toContain('#cccccc')
  })

  // --- Existing behavior ----------------------------------------------------

  it('typography textColor overrides default on heading', async () => {
    const blocks: Block[] = [
      {
        id: 'a',
        type: 'heading',
        text: 'Custom Heading',
        level: 'h2',
        color: '#000000',
        textColor: '#ff0000',
      },
    ]

    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('color:#ff0000')
    expect(html).toContain('Custom Heading')
  })

  it('borderColor set → renders 1px solid border on outer Section', async () => {
    const blocks: Block[] = [
      {
        id: 'a',
        type: 'text',
        content: '<p>Bordered</p>',
        borderColor: '#ff0000',
        borderRadius: 'soft',
      },
    ]

    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('border-width:1px')
    expect(html).toContain('border-style:solid')
    expect(html).toContain('border-color:#ff0000')
    expect(html).toContain('border-radius:8px')
    expect(html).toContain('Bordered')
  })

  it('no borderColor → no border emitted', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>No border</p>' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).not.toContain('border-width:1px')
    expect(html).toContain('No border')
  })

  it('cta block with width=full renders Button at 100% width', async () => {
    const blocks: Block[] = [
      {
        id: 'a',
        type: 'cta',
        label: 'Full CTA',
        url: '#',
        textColor: '#ffffff',
        backgroundColor: '#000000',
        width: 'full',
      },
    ]

    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('width:100%')
    expect(html).toContain('display:block')
    expect(html).toContain('Full CTA')
  })

  it('spacer xl preset → 96px height', async () => {
    const blocks: Block[] = [{ id: 'a', type: 'spacer', size: 'xl' }]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('height:96px')
  })

  it('spacer sm preset → 16px height', async () => {
    const blocks: Block[] = [{ id: 'a', type: 'spacer', size: 'sm' }]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('height:16px')
  })

  it('text block with backgroundColor renders inline bg on outer Section wrapper', async () => {
    const blocks: Block[] = [
      {
        id: 'a',
        type: 'text',
        content: '<p>BG text</p>',
        backgroundColor: '#fafafa',
      },
    ]

    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('background-color:#fafafa')
    expect(html).toContain('BG text')
  })

  it('text block without overrides uses default text typography color', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>Default text</p>' },
    ]
    const html = await renderEmailBlocks(blocks)
    // DEFAULT_BLOCK_TYPOGRAPHY.text.textColor = '#334155'
    expect(html).toContain('color:#334155')
    expect(html).toContain('Default text')
  })
})

// ---------------------------------------------------------------------------
// Client-theming (ADDITIVE) — the optional `theme` map on renderEmailBlocks.
// Load-bearing AC: no-theme output is byte-identical to today.
// ---------------------------------------------------------------------------

describe('renderEmailBlocks theme support', () => {
  // Representative block set covering every color slot (text, bg, border, header, cta, footer).
  const REPRESENTATIVE: Block[] = [
    { id: 'h', type: 'header', companyName: 'ACME', textColor: '#ffffff', backgroundColor: '#1a1a2e' },
    { id: 'hd', type: 'heading', text: 'Title', level: 'h2', color: '#1a1a2e' },
    { id: 't', type: 'text', content: '<p>Body</p>' },
    {
      id: 'c',
      type: 'cta',
      label: 'Go',
      url: 'https://example.com',
      textColor: '#ffffff',
      backgroundColor: '#1a1a2e',
    },
    { id: 'f', type: 'footer', text: 'Footer' },
  ]

  it('(a) no theme → byte-identical to omitting the theme argument entirely', async () => {
    const withUndefined = await renderEmailBlocks(REPRESENTATIVE, undefined)
    const withoutArg = await renderEmailBlocks(REPRESENTATIVE)
    expect(withUndefined).toBe(withoutArg)
  })

  it('(b) explicit textColorToken + theme → emits the token hex', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>Tokened</p>', textColorToken: 'primary' },
    ]
    const html = await renderEmailBlocks(blocks, { primary: '#aa0000' })
    expect(html).toContain('color:#aa0000')
    // The default text color must NOT survive the token override.
    expect(html).not.toContain('color:#334155')
  })

  it('(c) token ref absent from theme map → falls to raw hex → falls to default', async () => {
    // token ref set but map has no 'primary' → rung (a) skipped; raw hex wins.
    const withRaw: Block[] = [
      { id: 'a', type: 'text', content: '<p>X</p>', textColorToken: 'primary', textColor: '#123456' },
    ]
    const rawHtml = await renderEmailBlocks(withRaw, { text: '#999999' })
    expect(rawHtml).toContain('color:#123456')

    // token ref set, no raw hex, no matching default token → hardcoded default.
    const noRaw: Block[] = [
      { id: 'a', type: 'text', content: '<p>X</p>', textColorToken: 'doesNotExist' },
    ]
    const defHtml = await renderEmailBlocks(noRaw, { primary: '#aa0000' })
    expect(defHtml).toContain('color:#334155') // DEFAULT_BLOCK_TYPOGRAPHY.text
  })

  it('(d) invalid token value (hsl/var) in map → skipped, no var(/hsl( in output', async () => {
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>X</p>', textColorToken: 'text' },
    ]
    const html = await renderEmailBlocks(blocks, { text: 'hsl(210 40% 20%)' })
    expect(html).not.toContain('hsl(')
    expect(html).not.toContain('var(')
    // Falls through to the hardcoded default because the token value was invalid.
    expect(html).toContain('color:#334155')
  })

  it('(e) themed default (rung c): no explicit color + theme → uses mapped token', async () => {
    // Heading carries only the inert legacy `color`; with a theme, the mapped
    // token (heading → primary) supplies the color via rung (c).
    const blocks: Block[] = [
      { id: 'a', type: 'heading', text: 'Themed', level: 'h2', color: '#1a1a2e' },
    ]
    const html = await renderEmailBlocks(blocks, { primary: '#aa0000' })
    expect(html).toContain('color:#aa0000')
    // The hardcoded heading default (#0f172a) must not appear.
    expect(html).not.toContain('color:#0f172a')
  })

  it('(e) themed default for header/cta backgrounds via headerBackground/accent tokens', async () => {
    // Header/cta WITHOUT explicit backgroundColor → rung (c) supplies the themed bg.
    const blocks: Block[] = [
      { id: 'h', type: 'header', companyName: 'ACME', textColor: '#ffffff' },
      { id: 'c', type: 'cta', label: 'Go', url: '#', textColor: '#ffffff' },
    ]
    const html = await renderEmailBlocks(blocks, {
      headerBackground: '#112233',
      accent: '#445566',
    })
    expect(html).toContain('background-color:#112233') // header bg from headerBackground
    expect(html).toContain('background-color:#445566') // cta bg from accent
    // The block-component hardcoded fallback (#1a1a2e) must not leak in.
    expect(html).not.toContain('#1a1a2e')
  })

  it('themed default with Halo-default values renders identically to no theme (byte-identical rung c)', async () => {
    // Blocks with NO explicit colors so rung (c) is the active rung for text/heading/footer.
    const bare: Block[] = [
      { id: 'hd', type: 'heading', text: 'T', level: 'h2', color: '#1a1a2e' },
      { id: 't', type: 'text', content: '<p>B</p>' },
      { id: 'f', type: 'footer', text: 'F' },
    ]
    const noTheme = await renderEmailBlocks(bare)
    // A theme whose mapped tokens equal today's hardcoded defaults.
    const haloDefault = await renderEmailBlocks(bare, {
      primary: '#0f172a',
      text: '#334155',
      footerText: '#94a3b8',
    })
    expect(haloDefault).toBe(noTheme)
  })
})

// --- Iter 3: Link / eyebrow / Preview (parytet React Email) ---------------

describe('LinkBlock (Iter 3)', () => {
  it('renders anchor with href, label, underline and baked padding', async () => {
    const blocks: Block[] = [
      { id: 'l', type: 'link', label: 'Zobacz więcej', url: 'https://example.com' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('Zobacz więcej')
    expect(html).toContain('text-decoration:underline')
    expect(html).toContain('padding:12px 24px')
    // default "linkowy" ciemny kolor z DEFAULT_BLOCK_TYPOGRAPHY.link
    expect(html).toContain('color:#1a1a2e')
  })

  it('typography mixin: textAlign + explicit textColor win', async () => {
    const blocks: Block[] = [
      { id: 'l', type: 'link', label: 'X', url: '#', textAlign: 'center', textColor: '#ff0000' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('text-align:center')
    expect(html).toContain('color:#ff0000')
  })

  it('themed default: link text takes the primary token when no explicit color', async () => {
    const blocks: Block[] = [{ id: 'l', type: 'link', label: 'X', url: '#' }]
    const html = await renderEmailBlocks(blocks, { primary: '#aa00bb' })
    expect(html).toContain('color:#aa00bb')
    expect(html).not.toContain('color:#1a1a2e')
  })
})

describe('HeadingBlock eyebrow (Iter 3)', () => {
  it('renders uppercase, letter-spaced, small, muted paragraph (not h-tag)', async () => {
    const blocks: Block[] = [
      { id: 'e', type: 'heading', text: 'Twoje materiały', level: 'eyebrow', color: '#1a1a2e' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('text-transform:uppercase')
    expect(html).toContain('letter-spacing:0.08em')
    expect(html).toContain('font-size:12px')
    // muted default (brak jawnego textColor/textColorToken)
    expect(html).toContain('color:#64748b')
    expect(html).toContain('Twoje materiały')
    // akapit, nie tag nagłówka
    expect(html).not.toMatch(/<h[1-3][\s>][^>]*>Twoje materiały/)
  })

  it('explicit textColor wins over the muted eyebrow default', async () => {
    const blocks: Block[] = [
      { id: 'e', type: 'heading', text: 'E', level: 'eyebrow', color: '#1a1a2e', textColor: '#ff0000' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('color:#ff0000')
    expect(html).not.toContain('color:#64748b')
  })

  it('h1/h2/h3 output unchanged (additive enum)', async () => {
    const blocks: Block[] = [
      { id: 'h', type: 'heading', text: 'Cześć!', level: 'h1', color: '#0f172a' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('font-size:26px')
    expect(html).toContain('letter-spacing:-0.01em')
    expect(html).toContain('Cześć!')
  })
})

describe('PreviewBlock (Iter 3)', () => {
  it('emits the hidden preheader text into the output HTML', async () => {
    const blocks: Block[] = [
      { id: 'p', type: 'preview', text: 'Twoje materiały czekają w środku' },
      { id: 't', type: 'text', content: '<p>Treść</p>' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html).toContain('Twoje materiały czekają w środku')
    // ukryty kontener @react-email <Preview>
    expect(html.toLowerCase()).toContain('display:none')
  })

  it('empty preview text renders nothing', async () => {
    const blocks: Block[] = [
      { id: 'p', type: 'preview', text: '   ' },
      { id: 't', type: 'text', content: '<p>Treść</p>' },
    ]
    const html = await renderEmailBlocks(blocks)
    expect(html.toLowerCase()).not.toContain('display:none')
  })
})
