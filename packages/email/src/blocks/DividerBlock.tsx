import { Hr } from '@react-email/components'
import type { DividerBlock } from './types'

export function DividerBlockComponent({ block }: { block: DividerBlock }) {
  return <Hr style={{ borderColor: block.color, margin: '8px 0' }} />
}
