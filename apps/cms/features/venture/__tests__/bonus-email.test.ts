import { describe, it, expect } from 'vitest'
import { renderEmailBlocks, type Block } from '@agency/email'
import {
  buildBonusEmailBlocks,
  buildBonusEmailSubject,
  buildBonusEmail,
} from '../mail/bonus-email'
import { HALO_EFEKT_DEFAULT } from '@/lib/theme'
import type { ResolvedTheme } from '@/lib/theme'

const INPUT = {
  campaignDisplayName: 'Kacper Launch',
  bonuses: [
    { title: 'Szablon Notion', url: 'https://drive.example.com/notion' },
    { title: 'Checklista PDF', url: 'https://drive.example.com/pdf' },
  ],
  theme: HALO_EFEKT_DEFAULT,
}

describe('buildBonusEmailSubject', () => {
  it('uses the campaign display name', () => {
    expect(buildBonusEmailSubject(INPUT)).toContain('Kacper Launch')
  })

  it('falls back to Halo Efekt when display name is empty', () => {
    expect(
      buildBonusEmailSubject({ campaignDisplayName: null, bonuses: [], theme: HALO_EFEKT_DEFAULT }),
    ).toContain('Halo Efekt')
  })
})

describe('buildBonusEmailBlocks (pure)', () => {
  it('renders each bonus as a "Pobierz" link with its url', () => {
    const blocks = buildBonusEmailBlocks(INPUT)
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).toContain('href="https://drive.example.com/notion"')
    expect(list.content).toContain('href="https://drive.example.com/pdf"')
    expect(list.content).toContain('Pobierz')
    expect(list.content).toContain('Szablon Notion')
  })

  it('drops bonuses without a url (cannot be delivered)', () => {
    const blocks = buildBonusEmailBlocks({
      campaignDisplayName: 'X',
      bonuses: [
        { title: 'No link', url: null },
        { title: 'Has link', url: 'https://a' },
      ],
      theme: HALO_EFEKT_DEFAULT,
    })
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).toContain('href="https://a"')
    expect(list.content).not.toContain('No link')
  })

  it('includes a "sprawdź skrzynkę" note block', () => {
    const blocks = buildBonusEmailBlocks(INPUT)
    const note = blocks.find((b) => b.id === 'bonus-inbox-note') as { content: string }
    expect(note.content.toLowerCase()).toContain('skrzynkę')
  })

  it('neutralizes a javascript: scheme in a bonus url (defense against dangerous href)', () => {
    const blocks = buildBonusEmailBlocks({
      campaignDisplayName: 'X',
      bonuses: [{ title: 'Malicious', url: 'javascript:alert(1)' }],
      theme: HALO_EFEKT_DEFAULT,
    })
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).not.toContain('javascript:')
    expect(list.content).toContain('href="#"')
  })

  it('escapes HTML in bonus titles to avoid markup injection', () => {
    const blocks = buildBonusEmailBlocks({
      campaignDisplayName: 'X',
      bonuses: [{ title: '<script>alert(1)</script>', url: 'https://a' }],
      theme: HALO_EFEKT_DEFAULT,
    })
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).not.toContain('<script>')
    expect(list.content).toContain('&lt;script&gt;')
  })
})

describe('buildBonusEmail (rendered HTML)', () => {
  it('renders subject + HTML containing the bonus links', async () => {
    const { subject, html } = await buildBonusEmail(INPUT)
    expect(subject).toContain('Kacper Launch')
    expect(html).toContain('https://drive.example.com/notion')
    expect(html).toContain('Pobierz')
  })
})

// ---------------------------------------------------------------------------
// Theme wiring (iter 2). The five live surfaces render as INLINE LITERAL HEX
// pulled from the resolved theme. The load-bearing AC is the byte-identical
// regression guard below.
// ---------------------------------------------------------------------------

// Reconstruct the PRE-CHANGE block structure from the (default-theme) new blocks:
//   - body-text / footer carried NO explicit color (inherited DEFAULT_BLOCK_TYPOGRAPHY)
//   - heading set only the inert legacy `color: '#1a1a2e'` (no textColor); the
//     renderer applied its heading typography default (#0f172a) regardless.
// header defaults already equal their old literals, so this yields today's exact
// input — rendering it must match the new default-theme render byte-for-byte.
function toPreChangeBlock(block: Block): Block {
  if (block.type === 'text' || block.type === 'footer') {
    const clone = { ...block }
    delete (clone as Record<string, unknown>).textColor
    return clone as Block
  }
  if (block.type === 'heading') {
    const clone = { ...block, color: '#1a1a2e' }
    delete (clone as Record<string, unknown>).textColor
    return clone as Block
  }
  return block
}

describe('theme wiring — byte-identical regression (load-bearing AC)', () => {
  it('renders byte-identical to the pre-change output when theme = HALO_EFEKT_DEFAULT', async () => {
    const themed = buildBonusEmailBlocks(INPUT)
    const legacy = themed.map(toPreChangeBlock)

    const themedHtml = await renderEmailBlocks(themed)
    const legacyHtml = await renderEmailBlocks(legacy)

    expect(themedHtml).toBe(legacyHtml)
  })

  it('emits the expected default inline colors', async () => {
    const html = await renderEmailBlocks(buildBonusEmailBlocks(INPUT))
    expect(html).toContain('color:#1a1a2e') // header background
    expect(html).toContain('color:#ffffff') // header text
    expect(html).toContain('color:#334155') // body text
    expect(html).toContain('color:#94a3b8') // footer
    // Heading renders theme.primary (now emitted via textColor). The default
    // primary is #0f172a — equal to the heading typography default it replaced,
    // so byte-identical holds while the heading is now genuinely themeable.
    expect(html).toContain('color:#0f172a')
  })

  it('never emits var()/hsl() (email clients cannot resolve them)', async () => {
    const html = await renderEmailBlocks(buildBonusEmailBlocks(INPUT))
    expect(html).not.toContain('var(')
    expect(html).not.toContain('hsl(')
  })
})

describe('theme wiring — client override', () => {
  const CLIENT_THEME: ResolvedTheme = {
    ...HALO_EFEKT_DEFAULT,
    primary: '#aa0000',
    headerBackground: '#112233',
    headerText: '#ddeeff',
    text: '#222222',
    footerText: '#888888',
  }

  it('renders the client hex on every live surface, heading included', async () => {
    const html = await renderEmailBlocks(buildBonusEmailBlocks({ ...INPUT, theme: CLIENT_THEME }))
    expect(html).toContain('color:#112233') // header background override
    expect(html).toContain('color:#ddeeff') // header text override
    expect(html).toContain('color:#aa0000') // heading — primary override now themeable
    expect(html).toContain('color:#222222') // body text override
    expect(html).toContain('color:#888888') // footer override
    // The frozen heading default (#0f172a) must NOT survive an override.
    expect(html).not.toContain('color:#0f172a')
  })

  it('drops the default header navy (#1a1a2e) entirely under override', async () => {
    const html = await renderEmailBlocks(buildBonusEmailBlocks({ ...INPUT, theme: CLIENT_THEME }))
    // #1a1a2e was ONLY the header background (the heading block.color is dead),
    // so an override must remove it from the rendered HTML completely.
    // (#ffffff is NOT asserted absent — the email Container legitimately reuses it.)
    expect(html).not.toContain('#1a1a2e')
  })

  it('never emits var()/hsl() under a client override either', async () => {
    const html = await renderEmailBlocks(buildBonusEmailBlocks({ ...INPUT, theme: CLIENT_THEME }))
    expect(html).not.toContain('var(')
    expect(html).not.toContain('hsl(')
  })
})
