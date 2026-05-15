import { Hr } from '@react-email/components'
import type { DividerBlock } from './block-interfaces'

/**
 * DividerBlock — edge-to-edge horizontal rule (AAA-T-221, 2026-05-15).
 *
 * Layout: `margin: 8px 0` — spans the FULL width of its container
 * (email card or column cell). Previously `margin: 8px 24px` inset 24px
 * from each side, which looked misaligned in real rendered output ("linia
 * wychodzi poza" / "ma padding"). Edge-to-edge gives a cleaner visual
 * separator. Works correctly inside ColumnsBlock too — margin 8px 0 means
 * full cell width regardless of cell size.
 *
 * Color from block.color (user-controllable), default fallback '#e5e7eb'.
 *
 * Implemented as <Hr> with border:none + backgroundColor — most email-safe
 * combination. Some clients ignore <hr> border styling; using backgroundColor
 * on a 1px-height element is more reliable.
 */
export function DividerBlockComponent({ block }: { block: DividerBlock }) {
  return (
    <Hr
      style={{
        height: '1px',
        margin: '8px 0',
        border: 'none',
        backgroundColor: block.color ?? '#e5e7eb',
      }}
    />
  )
}
