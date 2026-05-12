import { Section } from '@react-email/components'
import type { SpacerBlock } from './block-interfaces'

const SIZE_MAP: Record<SpacerBlock['size'], number> = {
  sm: 16,
  md: 32,
  lg: 64,
}

export function SpacerBlockComponent({ block }: { block: SpacerBlock }) {
  return (
    <Section style={{ height: `${SIZE_MAP[block.size]}px` }} />
  )
}
