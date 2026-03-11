import { Section, Text } from '@react-email/components'
import type { FooterBlock } from './types'

export function FooterBlockComponent({ block }: { block: FooterBlock }) {
  return (
    <Section style={{ padding: '16px 32px', borderTop: '1px solid #e5e7eb' }}>
      <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
        {block.text}
      </Text>
    </Section>
  )
}
