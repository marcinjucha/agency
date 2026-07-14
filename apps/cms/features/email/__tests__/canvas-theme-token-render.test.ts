import { describe, it, expect } from 'vitest'
import { renderEmailBlocks, type Block } from '@agency/email'
import { resolveClientTheme } from '@/lib/theme'
import type { ThemeTokens } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Bug C investigation (2026-07-14): "picking a theme token doesn't recolour the
// editor preview". The Canvas preview renders each block via `renderBlock(block,
// pb, theme)` with the SAME resolved map the ThemeTokenSelect swatches use. These
// tests reproduce the full CMS render path end-to-end:
//   1. resolve the tenant theme map exactly as resolveEmailThemeMap does
//      (resolveClientTheme with the staging "Halo Efekt — motyw" tokens),
//   2. apply the Inspector's block merge (`{ ...selected, ...next }`) for picking
//      a token on the header (text + background) and heading,
//   3. render via renderEmailBlocks (same renderer the Canvas uses),
//   4. assert the picked token's hex appears in the output.
// If these pass, the render pipeline is proven correct — any remaining "doesn't
// recolour" is a React runtime/state issue, not the render path.
// ---------------------------------------------------------------------------

// Staging so_themes "Halo Efekt — motyw" tokens (verified via REST 2026-07-14).
const HALO_TENANT_TOKENS: ThemeTokens = {
  text: '#1f2937',
  primary: '#c026d3', // magenta — the "Podstawowy" token
  footerText: '#6b7280',
  headerText: '#f0f9ff',
  headerBackground: '#0b1e3a',
}

// The map the editor context (useEmailThemeMap) exposes = resolveEmailThemeMap →
// resolveClientTheme(tenantTheme). Backfills missing tokens from HALO default.
const RESOLVED = { ...resolveClientTheme({ tenantTheme: HALO_TENANT_TOKENS, clientTheme: null }) }

const MAGENTA = '#c026d3'

// Inspector's TypographySection/BorderSection → wrapper merge: token set, paired
// raw hex deleted from `next`, then `{ ...selected, ...next }`.
function pickTextColorToken(block: Block, token: string): Block {
  const next: Record<string, unknown> = { textColorToken: token }
  return { ...block, ...next } as Block
}
function pickBackgroundColorToken(block: Block, token: string): Block {
  const next: Record<string, unknown> = { backgroundColorToken: token }
  return { ...block, ...next } as Block
}

describe('Bug C — theme token recolours the rendered block (full render path)', () => {
  it('header TEXT token (primary) → magenta in output', async () => {
    const header = pickTextColorToken(
      { id: 'h', type: 'header', companyName: 'Acme', textColor: '#ffffff' } as Block,
      'primary',
    )
    const html = await renderEmailBlocks([header], RESOLVED)
    expect(html.toLowerCase()).toContain(MAGENTA)
  })

  it('header BACKGROUND token (primary) → magenta in output', async () => {
    const header = pickBackgroundColorToken(
      { id: 'h', type: 'header', companyName: 'Acme', textColor: '#ffffff' } as Block,
      'primary',
    )
    const html = await renderEmailBlocks([header], RESOLVED)
    expect(html.toLowerCase()).toContain(MAGENTA)
  })

  it('heading TEXT token (primary) → magenta in output', async () => {
    const heading = pickTextColorToken(
      { id: 'h', type: 'heading', text: 'Hi', level: 'h2', color: '#1a1a2e' } as Block,
      'primary',
    )
    const html = await renderEmailBlocks([heading], RESOLVED)
    expect(html.toLowerCase()).toContain(MAGENTA)
  })

  it('text block TEXT token (primary) → magenta in output', async () => {
    const text = pickTextColorToken(
      { id: 't', type: 'text', content: '<p>Hello</p>' } as Block,
      'primary',
    )
    const html = await renderEmailBlocks([text], RESOLVED)
    expect(html.toLowerCase()).toContain(MAGENTA)
  })
})
