import type { CSSProperties } from 'react'
import { Section, Link } from '@react-email/components'
import type { LinkBlock } from './block-interfaces'
import { DEFAULT_BLOCK_TYPOGRAPHY } from './defaults'

/**
 * LinkBlock — samodzielny link tekstowy (parytet React Email <Link>, Iter 3).
 *
 * Odrębny od CTA: kotwica w tekście (underline, kolor linku), nie przycisk.
 * Baked padding jak TextBlock (12px 24px) — v2 design model. Kolor idzie z
 * drabinki typografii (`style.color` — token ref > raw hex > themed default
 * 'primary' > fallback z DEFAULT_BLOCK_TYPOGRAPHY.link).
 *
 * `href` przekazywany surowo — parytet z CtaBlock: sanityzacja schematów URL
 * (safeUrlValue) dzieje się na FINALNYM HTML w ścieżce wysyłki
 * (`sanitizeHtmlUrls`), nie w komponencie.
 */
export function LinkBlockComponent({
  block,
  style,
}: {
  block: LinkBlock
  style?: CSSProperties
}) {
  const linkStyle: CSSProperties = {
    // Fallback z defaults (SSoT) — style.color i tak przychodzi rozwiązane
    // z computeTypographyStyle; literal tutaj dryfowałby od DEFAULT_BLOCK_TYPOGRAPHY.
    color: style?.color ?? DEFAULT_BLOCK_TYPOGRAPHY.link.textColor,
    fontSize: '14px',
    textDecoration: 'underline',
    display: 'inline-block',
  }
  // Padding na wewnętrznym divie (Section to <table> — padding na <table>
  // nie odpycha treści wizualnie). textAlign z mixinu pozycjonuje kotwicę.
  return (
    <Section>
      <div style={{ padding: '12px 24px', textAlign: style?.textAlign ?? 'left' }}>
        <Link href={block.url} style={linkStyle}>
          {block.label}
        </Link>
      </div>
    </Section>
  )
}
