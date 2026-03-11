import { Section, Button } from '@react-email/components'
import type { CtaBlock } from './types'

export function CtaBlockComponent({ block }: { block: CtaBlock }) {
  return (
    <Section style={{ padding: '16px 32px', textAlign: 'center' }}>
      <Button
        href={block.url}
        style={{
          backgroundColor: block.backgroundColor,
          color: block.textColor,
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 'bold',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        {block.label}
      </Button>
    </Section>
  )
}
