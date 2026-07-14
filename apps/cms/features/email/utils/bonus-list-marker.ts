import { VENTURE_BONUS_MARKER } from '@/lib/app-sent-variables'
import type { Block } from '../types'

// ---------------------------------------------------------------------------
// Bonus-list marker detection (pure, dependency-light).
//
// A `text` block whose trimmed `content` equals the structural `{{bonus_list}}`
// marker is NOT a real block type — it is an ordinary text block that the venture
// send path splices the programmatically-built bonus list into. The email editor
// content-detects it to render a friendly canvas chip instead of the raw token.
//
// Mirrors the send-path predicate (`isMarkerBlock` in bonus-email-template.ts) and
// the server's `hasBonusListMarker` (admin-handlers.server.ts) — all three test the
// SAME `VENTURE_BONUS_MARKER` constant so they cannot drift. Kept free of the block
// registry (which pulls in editor components) so it stays trivially unit-testable.
// ---------------------------------------------------------------------------

/** True when `block` is a text block whose trimmed content is exactly the marker. */
export function isBonusListMarkerBlock(block: Block): boolean {
  return block.type === 'text' && block.content.trim() === VENTURE_BONUS_MARKER
}
