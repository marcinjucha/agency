import type { CSSProperties } from 'react'
import { Section } from '@react-email/components'
import type { FooterBlock } from './block-interfaces'

/**
 * FooterBlock — v2 baked padding/typography (AAA-T-221, 2026-05-15).
 *
 * v2 spec:
 *   .em-footer { padding: 18px 24px 24px; font-size: 12px; color: #777;
 *                text-align: center; line-height: 1.6; }
 *
 * Border-top divider stays (subtle visual separation from email body).
 */
export function FooterBlockComponent({
  block,
  style,
}: {
  block: FooterBlock
  style?: CSSProperties
}) {
  const textStyle: CSSProperties = {
    ...style, // textAlign + color from mixin
    padding: '18px 24px 24px',
    fontSize: '12px',
    lineHeight: 1.6,
    color: style?.color ?? '#777777',
    textAlign: style?.textAlign ?? 'center',
    margin: 0,
  }
  // Border-top stays on Section (full email width). Padding moves to inner
  // div (padding on `<table>` doesn't push content inward in HTML).
  return (
    <Section style={{ borderTop: '1px solid #e5e7eb' }}>
      <div style={textStyle}>{block.text}</div>
    </Section>
  )
}
