import type { CSSProperties } from 'react'
import { Heading } from '@react-email/components'
import type { HeadingBlock } from './block-interfaces'

/**
 * HeadingBlock — v2 baked typography per level (AAA-T-221, 2026-05-15).
 *
 * v2 spec (claude-design email v2):
 *   .em-heading      { padding: 24px 24px 4px; margin: 0;
 *                      line-height: 1.3; letter-spacing: -0.01em; }
 *   .em-heading.h1   { font-size: 26px; font-weight: 700; }
 *   .em-heading.h2   { font-size: 20px; font-weight: 600; }
 *   .em-heading.h3   { font-size: 16px; font-weight: 600; }
 *
 * Merge order:
 *   1. style (BlockTypography mixin — gives textAlign + color)
 *   2. HEADING_STYLE_BY_LEVEL[level] — baked font-size/weight (wins over mixin defaults)
 *   3. layout (padding, margin, line-height, letter-spacing) — block-internal
 *
 * Color from mixin's `style.color` wins; legacy `block.color` is fallback for
 * pre-mixin JSONB rows.
 */

const HEADING_STYLE_BY_LEVEL: Record<HeadingBlock['level'], CSSProperties> = {
  h1: { fontSize: '26px', fontWeight: 700 },
  h2: { fontSize: '20px', fontWeight: 600 },
  h3: { fontSize: '16px', fontWeight: 600 },
}

export function HeadingBlockComponent({
  block,
  style,
}: {
  block: HeadingBlock
  style?: CSSProperties
}) {
  const merged: CSSProperties = {
    ...style, // textAlign + color from mixin
    ...HEADING_STYLE_BY_LEVEL[block.level], // baked font-size/weight per level
    color: style?.color ?? block.color,
    margin: 0,
    padding: '24px 24px 4px',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  }
  return (
    <Heading as={block.level} style={merged}>
      {block.text}
    </Heading>
  )
}
