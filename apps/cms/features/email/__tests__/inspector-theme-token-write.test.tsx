import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'

// Extend the global lucide-react stub with the icons the inspector controls use
// (TypographySection: Align*; BorderSection: RotateCcw). Global setup mock lacks them.
vi.mock('lucide-react', () => {
  const stub = () => null
  return {
    AlignLeft: stub, AlignCenter: stub, AlignRight: stub, RotateCcw: stub,
    ChevronDown: stub, Minus: stub, Plus: stub,
  }
})

// Drive the Radix Select as a native <select> so jsdom can fire a selection.
// Everything else in @agency/ui stays real (Label, Button, cn, Popover — the
// last needed by ColorPicker, which renders until a token is picked).
vi.mock('@agency/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@agency/ui')>()
  return {
    ...actual,
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string
      onValueChange?: (v: string) => void
      children?: ReactNode
    }) => (
      <select
        data-testid="theme-token-select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  }
})

const { renderBlock, resolveBlockMarginBottom } = await import('@agency/email')
const { resolveClientTheme } = await import('@/lib/theme')
type ThemeTokens = import('@/lib/theme').ThemeTokens
const { EmailThemeProvider, useEmailThemeMap } = await import('../contexts/email-theme-context')
const { TypographySection } = await import('../components/editor/controls/TypographySection')
const { BorderSection } = await import('../components/editor/controls/BorderSection')
const { DEFAULT_BLOCK_TYPOGRAPHY, DEFAULT_BLOCK_BORDER } = await import('@agency/email')
type Block = import('../types').Block

const HALO_TENANT_TOKENS: ThemeTokens = {
  text: '#1f2937',
  primary: '#c026d3',
  footerText: '#6b7280',
  headerText: '#f0f9ff',
  headerBackground: '#0b1e3a',
}
const RESOLVED = { ...resolveClientTheme({ tenantTheme: HALO_TENANT_TOKENS, clientTheme: null }) }
const MAGENTA_RGB = 'rgb(192, 38, 211)' // #c026d3 as jsdom serialises inline styles

// Faithful copy of Canvas.tsx CanvasBlockRenderer (the live render surface).
function CanvasBlockRenderer({ block }: { block: Block }) {
  const theme = useEmailThemeMap()
  return renderBlock(block, resolveBlockMarginBottom(block), theme) ?? null
}

/**
 * Faithful copy of Inspector.tsx TypographySectionWrapper: builds `current`
 * from `selected` and merges `{ ...selected, ...next }` on change.
 */
function typographyWrapper(selected: Block, onUpdateBlock: (b: Block) => void) {
  const defaults = DEFAULT_BLOCK_TYPOGRAPHY[selected.type as 'header' | 'heading' | 'text' | 'cta' | 'footer']
  const current = {
    textAlign: (selected as Record<string, unknown>).textAlign,
    textColor: (selected as Record<string, unknown>).textColor,
    textColorToken: (selected as Record<string, unknown>).textColorToken,
  }
  return (
    <TypographySection
      value={current as never}
      defaults={defaults}
      onChange={(next) => onUpdateBlock({ ...selected, ...next } as Block)}
    />
  )
}

/** Faithful copy of Inspector.tsx BorderSectionWrapper. */
function borderWrapper(selected: Block, onUpdateBlock: (b: Block) => void) {
  const blockType = selected.type as keyof typeof DEFAULT_BLOCK_BORDER
  const defaults = DEFAULT_BLOCK_BORDER[blockType]
  const current = {
    borderColor: (selected as Record<string, unknown>).borderColor,
    borderRadius: (selected as Record<string, unknown>).borderRadius,
    backgroundColor: (selected as Record<string, unknown>).backgroundColor,
    borderColorToken: (selected as Record<string, unknown>).borderColorToken,
    backgroundColorToken: (selected as Record<string, unknown>).backgroundColorToken,
  }
  return (
    <BorderSection
      blockType={blockType as never}
      value={current as never}
      defaults={defaults as never}
      onChange={(next) => onUpdateBlock({ ...selected, ...next } as Block)}
    />
  )
}

describe('Bug C — picking a theme token in the Inspector recolours the live Canvas', () => {
  it('header TEXT: picking "primary" writes the token AND the Canvas turns magenta', () => {
    const seeded = { id: 'bonus-header', type: 'header', companyName: 'Acme', textColor: '#ffffff' } as Block
    let updated: Block = seeded

    const { getAllByTestId } = render(typographyWrapper(seeded, (b) => { updated = b }))
    // TypographySection has exactly one ThemeTokenSelect (text colour).
    fireEvent.change(getAllByTestId('theme-token-select')[0], { target: { value: 'primary' } })

    // The written block must carry the token the renderer reads.
    expect((updated as Record<string, unknown>).textColorToken).toBe('primary')

    // And rendered through the live Canvas path it must be magenta.
    const { container } = render(
      <EmailThemeProvider theme={RESOLVED}>
        <CanvasBlockRenderer block={updated} />
      </EmailThemeProvider>,
    )
    expect(container.innerHTML).toContain(MAGENTA_RGB)
  })

  it('header BACKGROUND: picking "primary" writes the token AND the Canvas bg turns magenta', () => {
    const seeded = { id: 'bonus-header', type: 'header', companyName: 'Acme', textColor: '#ffffff' } as Block
    let updated: Block = seeded

    // BorderSection has two ThemeTokenSelects: [0]=border colour, [1]=background.
    const { getAllByTestId } = render(borderWrapper(seeded, (b) => { updated = b }))
    fireEvent.change(getAllByTestId('theme-token-select')[1], { target: { value: 'primary' } })

    expect((updated as Record<string, unknown>).backgroundColorToken).toBe('primary')

    const { container } = render(
      <EmailThemeProvider theme={RESOLVED}>
        <CanvasBlockRenderer block={updated} />
      </EmailThemeProvider>,
    )
    expect(container.innerHTML).toContain(MAGENTA_RGB)
  })
})
