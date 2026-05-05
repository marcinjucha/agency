/**
 * Inline SVG strings for the public-rendered downloadable asset card.
 *
 * These mirror the lucide-react icon paths used in the editor NodeView so
 * the public HTML output looks visually identical to what the author sees
 * in the CMS. We can't import lucide-react into the renderHTML pipeline
 * (renderHTML must be pure / sync / produce a deterministic string), so
 * we ship the path data inline.
 *
 * Stroke styling matches lucide defaults: stroke 2, round caps + joins,
 * 24x24 viewBox.
 */

import type { DownloadableAssetType } from './downloadable-asset-html'

const STROKE_PROPS =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

/** lucide FileText paths (assetType: document) */
const FILE_TEXT_PATHS = [
  '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />',
  '<path d="M14 2v4a2 2 0 0 0 2 2h4" />',
  '<path d="M10 9H8" />',
  '<path d="M16 13H8" />',
  '<path d="M16 17H8" />',
].join('')

/** lucide Music paths (assetType: audio) */
const MUSIC_PATHS = [
  '<path d="M9 18V5l12-2v13" />',
  '<circle cx="6" cy="18" r="3" />',
  '<circle cx="18" cy="16" r="3" />',
].join('')

/** lucide Image paths (assetType: image) */
const IMAGE_PATHS = [
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />',
  '<circle cx="9" cy="9" r="2" />',
  '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />',
].join('')

/** lucide Video paths (assetType: video) */
const VIDEO_PATHS = [
  '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />',
  '<rect x="2" y="6" width="14" height="12" rx="2" />',
].join('')

/** lucide Download paths — used for the action button. */
const DOWNLOAD_PATHS = [
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />',
  '<polyline points="7 10 12 15 17 10" />',
  '<line x1="12" x2="12" y1="15" y2="3" />',
].join('')

const ICON_PATHS_BY_TYPE: Record<DownloadableAssetType, string> = {
  document: FILE_TEXT_PATHS,
  audio: MUSIC_PATHS,
  image: IMAGE_PATHS,
  video: VIDEO_PATHS,
}

/**
 * Returns a complete inline SVG string for the asset type's icon.
 * Caller controls size and color via wrapping element style — the SVG itself
 * uses currentColor so it inherits text color.
 */
export function getAssetTypeIconSvg(assetType: DownloadableAssetType, size = 24): string {
  const paths = ICON_PATHS_BY_TYPE[assetType] ?? FILE_TEXT_PATHS
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ${STROKE_PROPS} aria-hidden="true">${paths}</svg>`
}

/** Inline SVG for the download action button (lucide Download). */
export function getDownloadIconSvg(size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ${STROKE_PROPS} aria-hidden="true">${DOWNLOAD_PATHS}</svg>`
}
