import { Img, Section } from '@react-email/components'
import type { ImageBlock } from './block-interfaces'

const ALIGNMENT_MARGIN: Record<ImageBlock['alignment'], string> = {
  left: '0 auto 0 0',
  center: '0 auto',
  right: '0 0 0 auto',
}

export function ImageBlockComponent({ block }: { block: ImageBlock }) {
  if (!block.src) {
    return null
  }

  return (
    <Section style={{ padding: '8px 32px' }}>
      <Img
        src={block.src}
        alt={block.alt}
        style={{
          width: `${block.width}px`,
          maxWidth: '100%',
          display: 'block',
          margin: ALIGNMENT_MARGIN[block.alignment],
        }}
      />
    </Section>
  )
}
