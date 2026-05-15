import type { CSSProperties } from 'react'
import { Img, Section } from '@react-email/components'
import type { ImageBlock } from './block-interfaces'

const ALIGNMENT_MARGIN: Record<ImageBlock['alignment'], string> = {
  left: '0 auto 0 0',
  center: '0 auto',
  right: '0 0 0 auto',
}

/**
 * ImageBlock — v2 baked padding (AAA-T-221, 2026-05-15).
 *
 * v2 spec: .em-image-wrap { padding: 12px 24px; }
 *
 * `border` prop applies to the `<Img>` element directly. Border-radius on the
 * wrapper Section doesn't clip the image inside; must go on `<Img>` for rounded
 * photo cards to render correctly.
 *
 * Background color from the mixin applies to the inner padding strip (`<Section>`)
 * so users can color the area around an image — distinct from the image's own
 * border surface.
 */
export function ImageBlockComponent({
  block,
  border,
}: {
  block: ImageBlock
  border?: CSSProperties
}) {
  if (!block.src) {
    return null
  }

  const { backgroundColor, ...borderOnImage } = border ?? {}

  // Background stays on Section (table spans full width). Padding moves to
  // inner div (padding on <table> doesn't push children inward visually).
  //
  // Image sizing — INTRINSIC RESPONSIVE pattern (AAA-T-221, 2026-05-15):
  //   width: 100%             — fill container width
  //   max-width: ${block.width}px  — cap at user-configured size
  //   height: auto            — preserve aspect ratio
  //
  // Previously: width: ${block.width}px + maxWidth: 100%. In email clients
  // that strip `table-layout: fixed` (Gmail, Outlook), an explicit pixel
  // width forces the parent <td>/<table> to grow — collapsing a sibling
  // column to 1-char width and breaking long text per-character.
  return (
    <Section style={{ backgroundColor }}>
      <div style={{ padding: '12px 24px' }}>
        <Img
          src={block.src}
          alt={block.alt}
          style={{
            width: '100%',
            maxWidth: `${block.width}px`,
            height: 'auto',
            display: 'block',
            margin: ALIGNMENT_MARGIN[block.alignment],
            ...borderOnImage,
          }}
        />
      </div>
    </Section>
  )
}
