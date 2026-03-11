import { Section, Text } from '@react-email/components'
import type { HeaderBlock } from './types'

export function HeaderBlockComponent({ block }: { block: HeaderBlock }) {
  return (
    <Section style={{ backgroundColor: block.backgroundColor, padding: '24px 32px' }}>
      <Text style={{ color: block.textColor, fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
        {block.companyName}
      </Text>
    </Section>
  )
}
