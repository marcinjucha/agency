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

// Uses dangerouslySetInnerHTML because content is HTML with variables already substituted.
// Sanitized through sanitize-html allowlist to prevent XSS (script, img onerror, etc.).
export function TextBlockComponent({ block }: { block: TextBlock }) {
  return (
    <Section style={{ padding: '16px 32px' }}>
      <div
        style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}
        dangerouslySetInnerHTML={{ __html: sanitizeEmailContent(block.content) }}
      />
    </Section>
  )
}
