// AVAILABLE_BLOCKS derive'owany z CMS_BLOCK_REGISTRY — SSoT dla metadanych bloków.
// DEFAULT_BLOCKS pochodzi z packages/email/src/blocks/defaults — SSoT dla business defaults.
import type { BlockType } from '@agency/email'
import { DEFAULT_BLOCKS } from '@agency/email'
import { CMS_BLOCK_REGISTRY } from './block-registry'

export const AVAILABLE_BLOCKS: { type: BlockType; label: string; description: string }[] =
  Object.values(CMS_BLOCK_REGISTRY).map((entry) => ({
    type: entry.id,
    label: entry.label,
    description: entry.description,
  }))

export { DEFAULT_BLOCKS }
