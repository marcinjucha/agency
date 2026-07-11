import React from 'react'
import { Html, Head, Body, Container, Section } from '@react-email/components'
import { render } from '@react-email/render'
import { BLOCK_REGISTRY } from './blocks/registry'
import {
  DEFAULT_BLOCK_TYPOGRAPHY,
  DEFAULT_BLOCK_BORDER,
  DEFAULT_BLOCK_MARGIN_BOTTOM_PRESET,
  MARGIN_BOTTOM_PX,
  BORDER_RADIUS_PX,
  isBorderableBlockType,
} from './blocks/defaults'
import type { Block, BlockType } from './blocks/types'
import type {
  BlockTypography,
  BlockBorder,
  BlockStyleCommon,
  BorderableBlockType,
} from './blocks/block-interfaces'
import {
  type ThemeColorMap,
  BLOCK_TEXT_COLOR_TOKEN,
  BLOCK_BACKGROUND_COLOR_TOKEN,
  resolveThemedColor,
} from './theme'

interface EmailTemplateProps {
  blocks: Block[]
  theme?: ThemeColorMap
}

/**
 * v2 padding model (AAA-T-221, 2026-05-15):
 * Internal padding is BAKED per block type inside each block renderer — not
 * user-controllable. The renderer only emits an outer wrapper when vertical
 * rhythm (marginBottom) OR a border on the wrapper is needed. See each
 * block file for its baked padding (em-* values from claude-design v2).
 *
 * Native font stack — matches v2 design and avoids loading custom webfonts
 * (Outlook chokes on @font-face, Gmail strips <link> imports).
 */
const EMAIL_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'

/**
 * Block types that carry typography. Mirrored from DEFAULT_BLOCK_TYPOGRAPHY —
 * `divider`, `spacer`, `image`, `columns` have no text content.
 */
const TYPOGRAPHIC_BLOCK_TYPES: ReadonlySet<BlockType> = new Set([
  'header',
  'heading',
  'text',
  'cta',
  'footer',
] satisfies BlockType[])

/**
 * Buduje CSSProperties dla typografii bloku — merguje defaults + per-block overrides.
 *
 * Tylko 2 pola: textAlign + color. Pozostałe atrybuty typograficzne (font-family/
 * size/weight/line-height/letter-spacing) NIE są konfigurowalne — żyją w
 * hardcoded stylach inline poszczególnych komponentów bloku.
 */
export function computeTypographyStyle(
  block: Block,
  theme?: ThemeColorMap,
): React.CSSProperties {
  if (!TYPOGRAPHIC_BLOCK_TYPES.has(block.type as BlockType)) return {}

  const blockType = block.type as 'header' | 'heading' | 'text' | 'cta' | 'footer'
  const defaults = DEFAULT_BLOCK_TYPOGRAPHY[blockType]
  const overrides = block as Partial<BlockTypography>

  const textAlign = overrides.textAlign ?? defaults.textAlign
  // Ladder (a) token ref → (b) raw hex → (c) themed default → (d) hardcoded.
  // With no theme this collapses to `overrides.textColor ?? defaults.textColor`.
  const textColor = resolveThemedColor({
    theme,
    tokenRef: overrides.textColorToken,
    rawHex: overrides.textColor,
    defaultToken: BLOCK_TEXT_COLOR_TOKEN[block.type as BlockType],
    fallback: defaults.textColor,
  })

  return {
    textAlign,
    color: textColor,
  }
}

/**
 * Buduje CSSProperties dla bordera + tła bloku.
 *
 * - borderColor: gdy ustawiony, emituje 1px solid + ten kolor.
 * - borderRadius: semantyczne (none/soft/pill) — mapowane do px.
 * - backgroundColor: opcjonalne tło bloku.
 *
 * Dla bloków NIE-borderowalnych (divider/spacer) zwraca pusty obiekt.
 */
export function computeBorderStyle(
  block: Block,
  theme?: ThemeColorMap,
): React.CSSProperties {
  if (!isBorderableBlockType(block.type)) return {}

  const blockType = block.type as BorderableBlockType
  const defaults = DEFAULT_BLOCK_BORDER[blockType]
  const overrides = block as Partial<BlockBorder>

  const style: React.CSSProperties = {}

  // Border has NO themed default token (no canonical border token) — ladder is
  // (a) token ref → (b) raw hex only. With no theme: `overrides.borderColor`.
  const borderColor = resolveThemedColor({
    theme,
    tokenRef: overrides.borderColorToken,
    rawHex: overrides.borderColor,
  })
  // 1px solid border when a border color resolves; otherwise no border drawn.
  if (borderColor) {
    style.borderWidth = '1px'
    style.borderStyle = 'solid'
    style.borderColor = borderColor
  }

  const radius = overrides.borderRadius ?? defaults.borderRadius
  if (radius !== 'none') {
    style.borderRadius = `${BORDER_RADIUS_PX[radius]}px`
  }

  // Background ladder: (a) token ref → (b) raw hex → (c) themed default
  // (header→headerBackground, cta→accent only) → (d) none. With no theme this
  // is `overrides.backgroundColor` — byte-identical to before.
  const backgroundColor = resolveThemedColor({
    theme,
    tokenRef: overrides.backgroundColorToken,
    rawHex: overrides.backgroundColor,
    defaultToken: BLOCK_BACKGROUND_COLOR_TOKEN[block.type as BlockType],
  })
  if (backgroundColor) {
    style.backgroundColor = backgroundColor
  }

  return style
}

/**
 * Resolve marginBottom preset → px liczba (lub 0).
 *
 * Exported so the CMS Canvas preview can apply the same vertical rhythm as
 * the rendered email HTML. Without this, the canvas was passing `undefined`
 * to renderBlock → marginBottom only worked in the sent HTML, not in preview.
 */
export function resolveBlockMarginBottom(block: Block): number {
  const overrides = block as Partial<BlockStyleCommon>
  const preset = overrides.marginBottom ?? DEFAULT_BLOCK_MARGIN_BOTTOM_PRESET[block.type as BlockType]
  if (!preset) return 0
  return MARGIN_BOTTOM_PX[preset]
}

/**
 * Block types where border styles should apply to a CHILD element instead of
 * the outer <Section> wrapper.
 *
 *   - cta: border on the <Button> (button is the visual element users perceive)
 *   - image: borderRadius/border on <Img> (radius on wrapper doesn't clip the image)
 *   - header: header owns its own colored <Section> — pass border directly
 */
const BORDER_ON_CHILD_TYPES: ReadonlySet<BlockType> = new Set<BlockType>([
  'cta',
  'image',
  'header',
])

export function renderBlock(block: Block, paddingBottom?: number, theme?: ThemeColorMap) {
  const entry = BLOCK_REGISTRY[block.type as BlockType]
  if (!entry) {
    console.warn(`[EmailRenderer] Nieznany typ bloku: "${block.type}" — blok pominięty`)
    return null
  }
  const Component = entry.RendererComponent as (props: {
    block: Block
    style?: React.CSSProperties
    border?: React.CSSProperties
    theme?: ThemeColorMap
  }) => React.ReactElement | null
  const typographyStyle = computeTypographyStyle(block, theme)
  const borderStyle = computeBorderStyle(block, theme)
  const childOwnsBorder = BORDER_ON_CHILD_TYPES.has(block.type as BlockType)
  const rendered = (
    // `theme` is forwarded so container blocks (ColumnsBlock) can thread it into
    // their recursive renderBlock calls; leaf components simply ignore the prop.
    <Component
      block={block}
      style={typographyStyle}
      border={childOwnsBorder ? borderStyle : undefined}
      theme={theme}
    />
  )
  const hasMarginBottom = paddingBottom !== undefined && paddingBottom > 0
  const hasWrapperBorder = !childOwnsBorder && Object.keys(borderStyle).length > 0
  const blockKey = (block as { id: string }).id

  // No wrapping needed.
  if (!hasMarginBottom && !hasWrapperBorder) {
    return <React.Fragment key={blockKey}>{rendered}</React.Fragment>
  }

  // Wrapper border is applied to a <Section> (table) — `border` does work on
  // `<table>` so the rendered block gets a visible border surrounding it.
  const bordered = hasWrapperBorder
    ? <Section style={borderStyle}>{rendered}</Section>
    : rendered

  // Vertical rhythm uses a `<div>` (block-level) — NOT padding on `<Section>`.
  // `padding-bottom` on `<table>` is visually inert (browsers + email clients
  // use cellPadding/cellSpacing for intra-table spacing; on `<table>` itself
  // padding does not push the next sibling down). Plain `<div>` with
  // `paddingBottom` is the universal way that works everywhere.
  if (hasMarginBottom) {
    return (
      <div key={blockKey} style={{ paddingBottom: `${paddingBottom}px` }}>
        {bordered}
      </div>
    )
  }

  return <React.Fragment key={blockKey}>{bordered}</React.Fragment>
}

function EmailTemplate({ blocks, theme }: EmailTemplateProps) {
  return (
    <Html lang="pl">
      <Head />
      <Body
        style={{
          fontFamily: EMAIL_FONT_STACK,
          backgroundColor: '#f9fafb',
          margin: 0,
          padding: '24px 0',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            maxWidth: '600px',
            margin: '0 auto',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          {blocks.map((block, index) => {
            const isLast = index === blocks.length - 1
            const marginBottom = isLast ? 0 : resolveBlockMarginBottom(block)
            return renderBlock(block, marginBottom, theme)
          })}
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Render email blocks to HTML string.
 *
 * `theme` is OPTIONAL and ADDITIVE — a plain token-key → literal-hex map the
 * caller (the CMS app) resolves and passes in. When omitted, every color slot
 * falls straight through to raw hex / hardcoded default, producing output
 * byte-identical to the pre-theming renderer.
 */
export async function renderEmailBlocks(
  blocks: Block[],
  theme?: ThemeColorMap,
): Promise<string> {
  return render(<EmailTemplate blocks={blocks} theme={theme} />)
}
