/**
 * Pure file-size formatter — single source of truth for both the editor
 * NodeView (`features/blog/components/DownloadableAssetCard.tsx`) and the
 * public renderer (`features/blog/extensions/downloadable-asset-html.ts`).
 *
 * Distinct from `formatBytes` in `features/media/utils.ts` which returns
 * `null` for null input and uses different boundary thresholds (no sub-1KB
 * display). Use `formatFileSize` wherever the visible '0 B' / 'X B' /
 * 'X.X KB' / 'X.X MB' representation is needed.
 *
 * Why this lives in `lib/utils/` (not in either feature folder):
 * - It is consumed by features/blog (downloadable card renderer + NodeView)
 *   AND features/media (upload modal + media library card). Cross-feature
 *   imports between sibling features create coupling — `lib/` is the
 *   neutral zone for genuinely-pure utilities (ADR-005).
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
