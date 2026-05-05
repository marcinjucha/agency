/**
 * Tiptap Node extension for the downloadable-asset block.
 *
 * Two surfaces, two render strategies:
 *  1. CMS editor — `addNodeView` mounts the React `DownloadableAssetCard`
 *     (Tailwind dark theme, badge + delete button).
 *  2. Public html_body — `renderHTML` emits a LIGHTWEIGHT marker `<div>`
 *     carrying every attr as a `data-*` attribute. The blog post-processor
 *     in `features/blog/utils.ts#generateHtmlFromContent` swaps each marker
 *     for the full inline-styled HTML produced by `renderDownloadableAssetHtml`.
 *
 * Why post-process instead of emitting full HTML from renderHTML directly:
 *   - `renderDownloadableAssetHtml` returns a complete document fragment
 *     with embedded `<svg>`, a scoped `<style>` block, and ~30 deeply
 *     nested elements. Reproducing that as Tiptap's array tuple shape
 *     would be tedious and brittle (e.g. `<style>` inside renderHTML
 *     output would be parsed/re-serialized by Tiptap).
 *   - Keeping renderHTML minimal preserves byte-equivalent round-trips
 *     in `parseHTML` (load saved HTML → editor → save again).
 *   - The pure renderer (`renderDownloadableAssetHtml`) stays the single
 *     source of truth for what the public site shows.
 *
 * Schema attributes are persisted in JSONB and survive HTML round-trips
 * via `parseHTML` reading the matching `data-*` attributes.
 */

import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { DownloadableAssetCard } from '../components/DownloadableAssetCard'
import { coerceAssetType, type DownloadableAssetType } from './downloadable-asset-html'

export interface DownloadableAssetAttributes {
  mediaItemId: string
  url: string
  name: string
  mimeType: string
  sizeBytes: number | null
  assetType: DownloadableAssetType
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    downloadableAsset: {
      setDownloadableAsset: (attrs: DownloadableAssetAttributes) => ReturnType
    }
  }
}

const DEFAULT_ASSET_TYPE: DownloadableAssetType = 'document'

/**
 * Reads a string `data-*` attribute off a parsed DOM element.
 * Returns the attribute value or the supplied default when missing/empty.
 */
function readDataAttr(element: Element | string, attr: string, fallback = ''): string {
  if (typeof element === 'string') return fallback
  const value = element.getAttribute(attr)
  return value && value.length > 0 ? value : fallback
}

/**
 * Reads a numeric `data-*` attribute. Returns null when missing or unparseable —
 * the schema treats `sizeBytes: null` as "size unknown".
 */
function readNumericDataAttr(element: Element | string, attr: string): number | null {
  if (typeof element === 'string') return null
  const raw = element.getAttribute(attr)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export const DownloadableAssetExtension = Node.create({
  name: 'downloadableAsset',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      mediaItemId: {
        default: '',
        parseHTML: (element) => readDataAttr(element, 'data-media-item-id'),
        renderHTML: (attrs) => ({ 'data-media-item-id': attrs.mediaItemId ?? '' }),
      },
      url: {
        default: '',
        parseHTML: (element) => readDataAttr(element, 'data-url'),
        renderHTML: (attrs) => ({ 'data-url': attrs.url ?? '' }),
      },
      name: {
        default: '',
        parseHTML: (element) => readDataAttr(element, 'data-name'),
        renderHTML: (attrs) => ({ 'data-name': attrs.name ?? '' }),
      },
      mimeType: {
        default: '',
        parseHTML: (element) => readDataAttr(element, 'data-mime-type'),
        renderHTML: (attrs) => ({ 'data-mime-type': attrs.mimeType ?? '' }),
      },
      sizeBytes: {
        default: null as number | null,
        parseHTML: (element) => readNumericDataAttr(element, 'data-size-bytes'),
        renderHTML: (attrs) => {
          // Omit the attribute entirely when size is unknown so the marker
          // stays clean (avoids `data-size-bytes=""` in saved HTML).
          if (attrs.sizeBytes === null || attrs.sizeBytes === undefined) return {}
          return { 'data-size-bytes': String(attrs.sizeBytes) }
        },
      },
      assetType: {
        default: DEFAULT_ASSET_TYPE,
        parseHTML: (element) =>
          coerceAssetType(readDataAttr(element, 'data-asset-type', DEFAULT_ASSET_TYPE)),
        renderHTML: (attrs) => ({
          'data-asset-type': attrs.assetType ?? DEFAULT_ASSET_TYPE,
        }),
      },
    }
  },

  parseHTML() {
    // Match the marker shape emitted by renderHTML AND the fully-rendered
    // public card produced by `renderDownloadableAssetHtml` — both carry
    // `data-downloadable-asset="true"`. parseHTML reads attrs from data-*,
    // so loading either form recovers the same node attrs.
    return [{ tag: 'div[data-downloadable-asset="true"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    // Lightweight marker only. The blog post-processor swaps these for the
    // full styled HTML returned by `renderDownloadableAssetHtml`. Keeping
    // renderHTML minimal also keeps round-trips through @tiptap/html
    // deterministic — no inline `<style>`, no embedded `<svg>`.
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-downloadable-asset': 'true',
      },
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DownloadableAssetCard)
  },

  addCommands() {
    return {
      setDownloadableAsset:
        (attrs) =>
        ({ commands }) => {
          // Reject empty mediaItemId / url — would otherwise persist a node
          // whose data-media-item-id="" / data-url="" round-trips through
          // parseHTML as empty strings, then the post-processor strips the
          // marker (no required attrs) and the author silently loses content.
          if (!attrs.mediaItemId || !attrs.url) return false
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})
