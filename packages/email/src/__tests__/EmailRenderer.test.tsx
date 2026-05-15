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
