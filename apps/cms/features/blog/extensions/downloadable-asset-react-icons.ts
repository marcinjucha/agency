/**
 * Single source of truth for the React (lucide) icon used per downloadable
 * asset type — colocated with the type union (`DOWNLOADABLE_ASSET_TYPES`)
 * and the inline-SVG path map (`ICON_PATHS_BY_TYPE`) so the editor NodeView,
 * the public renderer, and the InsertDownloadableAssetModal grid all stay
 * in lock-step.
 *
 * Why this file and not the existing `downloadable-asset-icons.ts`:
 * - That file ships RAW SVG path strings used by the public renderHTML
 *   pipeline (no React, must be sync/serializable, runs on the website
 *   without Tailwind context).
 * - This file ships React components (lucide-react) used by editor + modal
 *   surfaces — entirely different runtime constraints.
 *
 * Keeping them split prevents accidental imports of `lucide-react` into
 * the renderHTML codepath (which would fail in SSR/Worker contexts where
 * `@tiptap/html` runs without a React tree).
 */

import { FileText, Image as ImageIcon, Music, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DOWNLOADABLE_ASSET_TYPES, type DownloadableAssetType } from './downloadable-asset-html'

/**
 * Typed registry — `Record<DownloadableAssetType, ...>` enforces compile-time
 * exhaustiveness. Adding a new variant in `DOWNLOADABLE_ASSET_TYPES` triggers
 * a TS error here until the icon is added.
 */
export const DOWNLOADABLE_TYPE_ICON: Record<DownloadableAssetType, LucideIcon> = {
  document: FileText,
  audio: Music,
  image: ImageIcon,
  video: Video,
}

/**
 * Defensive lookup — returns `FileText` for unknown values. Used by surfaces
 * that receive raw `MediaType` values from DB (which is `string`, not the
 * narrow `DownloadableAssetType` union) to avoid a runtime crash on a
 * stray row outside the allowlist.
 */
export function getDownloadableTypeIcon(raw: unknown): LucideIcon {
  return (DOWNLOADABLE_ASSET_TYPES as readonly string[]).includes(raw as string)
    ? DOWNLOADABLE_TYPE_ICON[raw as DownloadableAssetType]
    : FileText
}
