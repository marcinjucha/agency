import { Section } from '@react-email/components'
import type { TextBlock } from './types'

// Uses dangerouslySetInnerHTML because content is HTML with variables already substituted
export function TextBlockComponent({ block }: { block: TextBlock }) {
  return (
    <Section style={{ padding: '16px 32px' }}>
      <div
        style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    </Section>
  )
}
