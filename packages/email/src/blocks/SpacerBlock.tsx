import { Section } from '@react-email/components'
import type { SpacerBlock } from './block-interfaces'
import { SPACER_HEIGHT_PX } from './defaults'

/**
 * SpacerBlock — pionowy odstęp.
 *
 * Wysokość ustalona przez `size` preset (sm/md/lg/xl) — żadnych customHeight.
 */
export function SpacerBlockComponent({ block }: { block: SpacerBlock }) {
  const height = SPACER_HEIGHT_PX[block.size] ?? 32
  return <Section style={{ height: `${height}px` }} />
}
