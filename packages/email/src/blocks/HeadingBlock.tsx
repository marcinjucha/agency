import { Heading } from '@react-email/components'
import type { HeadingBlock } from './block-interfaces'

export function HeadingBlockComponent({ block }: { block: HeadingBlock }) {
  return (
    <Heading
      as={block.level}
      style={{
        textAlign: block.textAlign,
        color: block.color,
        padding: '0 32px',
        margin: '16px 0 8px',
      }}
    >
      {block.text}
    </Heading>
  )
}
