import type { CSSProperties } from 'react'
import { Section, Button } from '@react-email/components'
import type { CtaBlock } from './block-interfaces'

/**
 * CtaBlock — v2 baked padding/typography (AAA-T-221, 2026-05-15).
 *
 * v2 spec:
 *   .em-cta-wrap { padding: 12px 24px 24px; text-align: center; }
 *   .em-cta      { display: inline-block; padding: 12px 22px;
 *                  border-radius: 6px; font-size: 14px; font-weight: 600;
 *                  text-decoration: none; letter-spacing: -0.005em; }
 *
 * Border radius is supplied by computeBorderStyle via `border` prop. When user
 * selects 'none' radius, computeBorderStyle omits borderRadius → button renders
 * square. For 'soft'/'pill' radius, explicit pixel value overrides v2 default 6px.
 *
 * - `block.width === 'full'` stretches button to 100% container width;
 *   'auto' (default) keeps content-sized button.
 * - mixin's `backgroundColor` (border.backgroundColor) wins over legacy
 *   `block.backgroundColor`.
 */
export function CtaBlockComponent({
  block,
  style,
  border,
}: {
  block: CtaBlock
  style?: CSSProperties
  border?: CSSProperties
}) {
  // Section-level textAlign drives button positioning inside container.
  // v2 default = center; mixin's textAlign overrides if user set it.
  const sectionAlign = style?.textAlign ?? 'center'
  const isFullWidth = block.width === 'full'

  // Background: mixin's value (border.backgroundColor) wins over legacy block.backgroundColor.
  const bgColor = border?.backgroundColor ?? block.backgroundColor ?? '#1a1a2e'

  // Border styles minus backgroundColor (background applied separately via bgColor).
  const { backgroundColor: _bg, ...borderShape } = border ?? {}

  const buttonStyle: CSSProperties = {
    ...style,
    ...borderShape,
    backgroundColor: bgColor,
    // Mixin's color (style.color) wins; legacy block.textColor is fallback.
    color: style?.color ?? block.textColor,
    padding: '12px 22px',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '-0.005em',
    textDecoration: 'none',
    ...(isFullWidth
      ? {
          display: 'block',
          width: '100%',
          textAlign: 'center' as const,
          boxSizing: 'border-box' as const,
        }
      : { display: 'inline-block' }),
  }
  // Padding lives on inner div (Section is <table> — padding on <table>
  // doesn't push content inward visually).
  return (
    <Section>
      <div style={{ padding: '12px 24px 24px', textAlign: sectionAlign }}>
        <Button href={block.url} style={buttonStyle}>
          {block.label}
        </Button>
      </div>
    </Section>
  )
}
