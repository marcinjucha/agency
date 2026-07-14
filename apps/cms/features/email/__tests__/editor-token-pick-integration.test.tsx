import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useState, type ReactNode } from 'react'

// Broad lucide stub (icons across Canvas + Inspector + controls). No Proxy —
// it intercepts Vite/ESM lookups and hangs (see vitest.setup.ts note).
vi.mock('lucide-react', () => {
  const stub = () => null
  return {
    Eye: stub, Monitor: stub, Smartphone: stub, ChevronUp: stub, ChevronDown: stub,
    Copy: stub, Trash2: stub, Plus: stub, Mail: stub, FlaskConical: stub, MousePointerClick: stub,
    AlignLeft: stub, AlignCenter: stub, AlignRight: stub, RotateCcw: stub,
    // block-registry + editors
    FileText: stub, Minus: stub, Heading: stub, ImageIcon: stub,
    AlignVerticalSpaceAround: stub, Columns2: stub, Image: stub, Braces: stub,
    Type: stub, Palette: stub, GripVertical: stub, Pencil: stub, X: stub, Check: stub,
  }
})

// ThemePicker is a static import in Inspector but only rendered in Settings tab
// (not exercised here). Stub it so its server/react-query deps don't load.
vi.mock('@/features/themes/components/ThemePicker', () => ({ ThemePicker: () => null }))

// Drive Radix Select as a native <select> so jsdom can fire a selection; keep
// the rest of @agency/ui real (Button, Input, Label, cn, Popover for ColorPicker).
vi.mock('@agency/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@agency/ui')>()
  return {
    ...actual,
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children?: ReactNode }) => (
      <select data-testid="token-select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
  }
})

const { Canvas } = await import('../components/editor/Canvas')
const { Inspector } = await import('../components/editor/Inspector')
const { EmailThemeProvider } = await import('../contexts/email-theme-context')
const { resolveClientTheme } = await import('@/lib/theme')
type ThemeTokens = import('@/lib/theme').ThemeTokens
type Block = import('../types').Block

const HALO_TENANT_TOKENS: ThemeTokens = {
  text: '#1f2937',
  primary: '#c026d3',
  footerText: '#6b7280',
  headerText: '#f0f9ff',
  headerBackground: '#0b1e3a',
}
const RESOLVED = { ...resolveClientTheme({ tenantTheme: HALO_TENANT_TOKENS, clientTheme: null }) }
const MAGENTA_RGB = 'rgb(192, 38, 211)'

// Mirrors EmailTemplateEditor's updateBlock/setBlocks + the Canvas↔Inspector
// wiring, but with the REAL Inspector + REAL Canvas components.
function EditorHarness() {
  const seeded: Block = { id: 'bonus-header', type: 'header', companyName: 'Acme', textColor: '#ffffff' } as Block
  const [blocks, setBlocks] = useState<Block[]>([seeded])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('bonus-header')
  const updateBlock = (u: Block) => setBlocks((prev) => prev.map((b) => (b.id === u.id ? u : b)))

  return (
    <EmailThemeProvider theme={RESOLVED}>
      <Canvas
        blocks={blocks}
        subject="s"
        setSubject={() => {}}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        onAddAt={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onMove={() => {}}
        viewport="desktop"
        setViewport={() => {}}
        onBackdropClick={() => {}}
        detectedKeys={[]}
      />
      <Inspector
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onUpdateBlock={updateBlock}
        onDeleteBlock={() => {}}
        onDuplicateBlock={() => {}}
        label="l"
        setLabel={() => {}}
        themeId={null}
        setThemeId={() => {}}
        userEditedVariables={[]}
        setUserEditedVariables={() => {}}
        detectedKeys={[]}
        templateType="venture_bonus"
        unresolvableTokens={[]}
        onDelete={() => {}}
      />
    </EmailThemeProvider>
  )
}

describe('Bug C — full editor loop: pick header text token → live Canvas recolours', () => {
  it('picking "primary" in the Typography section turns the canvas header magenta', () => {
    const { container, getAllByTestId } = render(<EditorHarness />)

    // Scope to the Canvas preview (the swatches in the token dropdown also carry
    // magenta, so assert on the rendered header <p> inside the live canvas).
    const canvas = container.querySelector('section[aria-label="Podgląd na żywo"]') as HTMLElement
    const headerText = () => {
      const p = Array.from(canvas.querySelectorAll('p')).find((el) => el.textContent === 'Acme')
      return p?.style.color ?? ''
    }

    expect(headerText()).toBe('rgb(255, 255, 255)') // white before pick
    // Header selected by default → Typography section open → first token-select = text colour.
    fireEvent.change(getAllByTestId('token-select')[0], { target: { value: 'primary' } })

    expect(headerText()).toBe(MAGENTA_RGB) // recoloured to the primary token
  })
})
