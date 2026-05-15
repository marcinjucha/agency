import type { CSSProperties } from 'react'
import { Section } from '@react-email/components'
import sanitizeHtml from 'sanitize-html'
import type { TextBlock } from './block-interfaces'

// Bezpieczna lista tagów HTML dopuszczalna w treści bloku emaila.
// Ograniczona do tagów bezpiecznych w kontekście emaila — bez skryptów, zdarzeń, iframów.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'span', 'ul', 'ol', 'li']

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
}

function sanitizeEmailContent(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

/**
 * TextBlock — v2 baked padding/typography (AAA-T-221, 2026-05-15).
 *
 * v2 spec: .em-text { padding: 12px 24px; font-size: 14px; line-height: 1.6; color: #333; }
 *
 * Padding lives on the INNER div, not on `<Section>`. `<Section>` renders as
 * `<table cellPadding="0">` and CSS `padding` on `<table>` does NOT push
 * content inward (the rendered HTML contains the property but browsers +
 * email clients ignore it — `cellPadding`/`cellSpacing` control intra-table
 * spacing instead). Padding on the inner block-level div is the only variant
 * that actually offsets content visually AND survives email clients.
 *
 * Uses dangerouslySetInnerHTML because content is HTML with variables already substituted.
 * Sanitized through sanitize-html allowlist to prevent XSS (script, img onerror, etc.).
 */
export function TextBlockComponent({
  block,
  style,
}: {
  block: TextBlock
  style?: CSSProperties
}) {
  const contentStyle: CSSProperties = {
    ...style, // textAlign + color from mixin
    padding: '12px 24px',
    fontSize: '14px',
    lineHeight: 1.6,
    color: style?.color ?? '#333333',
    // Defensive: long unbreakable strings (URLs, "asdfasdf...") wrap inside
    // the block instead of expanding the parent table beyond the container.
    // Critical inside ColumnsBlock where a 50%-wide cell must not stretch.
    // Use overflow-wrap (modern) + word-wrap (legacy alias) — NOT word-break
    // (Gmail/Outlook treat it as break-all → splits per character).
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
  }
  return (
    <Section>
      <div
        style={contentStyle}
        dangerouslySetInnerHTML={{ __html: sanitizeEmailContent(block.content) }}
      />
    </Section>
  )
}
