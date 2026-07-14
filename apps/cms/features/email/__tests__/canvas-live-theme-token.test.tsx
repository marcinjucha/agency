import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderBlock, resolveBlockMarginBottom } from '@agency/email'
import { resolveClientTheme } from '@/lib/theme'
import type { ThemeTokens } from '@/lib/theme'
import { EmailThemeProvider, useEmailThemeMap } from '../contexts/email-theme-context'
import type { Block } from '../types'

// ---------------------------------------------------------------------------
// Bug C — LIVE editor repro (2026-07-14).
//
// The render-path unit test (canvas-theme-token-render.test.ts) proves
// renderBlock + resolver + the Inspector merge are correct in isolation (HTML
// string via renderEmailBlocks). This test exercises the OTHER surface: the
// live Canvas renders each block by calling `renderBlock(block, pb, theme)`
// directly inside a React tree, reading `theme` from useEmailThemeMap(). The
// component below is a byte-faithful copy of Canvas.tsx's CanvasBlockRenderer
// (the exact live 3 lines) so we test the context→renderBlock wiring AND the
// re-render-on-update path the user reports broken.
// ---------------------------------------------------------------------------

const HALO_TENANT_TOKENS: ThemeTokens = {
  text: '#1f2937',
  primary: '#c026d3', // magenta — the "Podstawowy" token
  footerText: '#6b7280',
  headerText: '#f0f9ff',
  headerBackground: '#0b1e3a',
}

const RESOLVED = { ...resolveClientTheme({ tenantTheme: HALO_TENANT_TOKENS, clientTheme: null }) }
const MAGENTA = 'rgb(192, 38, 211)' // #c026d3 — jsdom serialises inline styles as rgb()

// Byte-faithful copy of Canvas.tsx CanvasBlockRenderer (lines ~510-527).
function CanvasBlockRenderer({ block, isLast }: { block: Block; isLast: boolean }) {
  const paddingBottom = isLast ? 0 : resolveBlockMarginBottom(block)
  const theme = useEmailThemeMap()
  const rendered = renderBlock(block, paddingBottom, theme)
  return rendered ?? null
}

function renderInEditor(block: Block) {
  return render(
    <EmailThemeProvider theme={RESOLVED}>
      <CanvasBlockRenderer block={block} isLast />
    </EmailThemeProvider>,
  )
}

describe('Bug C — live Canvas recolours a header carrying a theme token', () => {
  it('header TEXT token (primary) → magenta in the live DOM', () => {
    const header = {
      id: 'bonus-header',
      type: 'header',
      companyName: 'Acme',
      textColor: '#ffffff',
      textColorToken: 'primary',
    } as Block
    const { container } = renderInEditor(header)
    expect(container.innerHTML).toContain(MAGENTA)
  })

  it('header BACKGROUND token (primary) → magenta in the live DOM', () => {
    const header = {
      id: 'bonus-header',
      type: 'header',
      companyName: 'Acme',
      textColor: '#ffffff',
      backgroundColorToken: 'primary',
    } as Block
    const { container } = renderInEditor(header)
    expect(container.innerHTML).toContain(MAGENTA)
  })

  it('re-render after picking a token (Inspector merge) recolours the header', () => {
    const before = { id: 'h', type: 'header', companyName: 'Acme', textColor: '#ffffff' } as Block
    const { container, rerender } = renderInEditor(before)
    expect(container.innerHTML).not.toContain(MAGENTA)

    // Inspector wrapper merge: `{ ...selected, ...next }` with next.textColorToken set.
    const after = { ...before, textColorToken: 'primary' } as Block
    rerender(
      <EmailThemeProvider theme={RESOLVED}>
        <CanvasBlockRenderer block={after} isLast />
      </EmailThemeProvider>,
    )
    expect(container.innerHTML).toContain(MAGENTA)
  })
})
