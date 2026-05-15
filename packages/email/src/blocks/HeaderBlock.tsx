import type { CSSProperties } from 'react'
import { Section, Text } from '@react-email/components'
import type { HeaderBlock } from './block-interfaces'

/**
 * HeaderBlock — v2 baked padding/typography (AAA-T-221, 2026-05-15).
 *
 * v2 spec (claude-design email v2):
 *   .em-header { padding: 32px 24px; text-align: center;
 *                font-size: 19px; font-weight: 600; letter-spacing: -0.01em; }
 *
 * Typography color comes from the BlockTypography mixin (`style.color`).
 * Legacy `block.textColor` is a backward-compat fallback for existing JSONB rows.
 *
 * Background unified via BlockBorder mixin's `backgroundColor`; legacy
 * `block.backgroundColor` is fallback for old JSONB rows. Default '#1a1a2e'
 * preserved when neither is set.
 */
export function HeaderBlockComponent({
  block,
  style,
  border,
}: {
  block: HeaderBlock
  style?: CSSProperties
  border?: CSSProperties
}) {
  // Section bg: mixin's backgroundColor (border.backgroundColor) wins over legacy
  // block.backgroundColor. Default '#1a1a2e' preserved when neither is set.
  const bgColor = border?.backgroundColor ?? block.backgroundColor ?? '#1a1a2e'
  // Border shape minus backgroundColor (background is applied separately on Section).
  const { backgroundColor: _bg, ...borderShape } = border ?? {}

  // Typography baked: 19/600, centered, -0.01em letter-spacing per v2 spec.
  // textAlign from mixin only overrides if user explicitly set it; default = center.
  const textAlign = style?.textAlign ?? 'center'
  const textStyle: CSSProperties = {
    margin: 0,
    fontSize: '19px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textAlign,
    // Mixin's color (style.color) wins; legacy block.textColor is fallback.
    color: style?.color ?? block.textColor,
  }

  // Padding lives on inner div (Section is <table> — padding on table doesn't
  // push content inward; only cellPadding/td-style do). Background + border
  // stay on the Section table so they span full email width.
  return (
    <Section
      style={{
        backgroundColor: bgColor,
        ...borderShape,
      }}
    >
      <div style={{ padding: '32px 24px', textAlign }}>
        <Text style={textStyle}>{block.companyName}</Text>
      </div>
    </Section>
  )
}
