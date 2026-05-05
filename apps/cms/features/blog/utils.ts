import { parseContent as _parseContent, generateHtmlFromContent as _generateHtml } from '../editor/utils'
import { editorExtensions } from './extensions'
import type { TiptapContent } from '../editor/types'
import { routes } from '@/lib/routes'
import {
  coerceAssetType,
  isSafeUrl,
  renderDownloadableAssetHtml,
  type DownloadableAssetAttrs,
} from './extensions/downloadable-asset-html'

export { _parseContent as parseContent }

/**
 * Blog-specific wrapper — always includes media extensions for HTML generation.
 *
 * Post-processes the html_body in two phases:
 *  1. `generateHTML` (from @tiptap/html) walks the Tiptap JSON and produces
 *     raw HTML. The downloadable-asset extension's `renderHTML` emits a
 *     LIGHTWEIGHT marker `<div data-downloadable-asset="true" data-...>`.
 *  2. `swapDownloadableAssetMarkers` finds each marker and replaces it with
 *     the full inline-styled card produced by `renderDownloadableAssetHtml`.
 *
 * Why split — see DownloadableAssetExtension.ts header comment. The pure
 * renderer in `downloadable-asset-html.ts` is the single source of truth
 * for the public card; the extension's renderHTML stays a minimal carrier
 * so byte-equivalent round-trips work through @tiptap/html.
 */
export function generateHtmlFromContent(content: TiptapContent): string {
  const raw = _generateHtml(content, editorExtensions)
  return swapDownloadableAssetMarkers(raw)
}

/**
 * Replaces every `<div data-downloadable-asset="true" ...></div>` marker
 * in `html` with the full card produced by `renderDownloadableAssetHtml`.
 *
 * Single-pass linear-time scanner: O(L) total where L = html length, with
 * a single output string-builder buffer. The previous implementation
 * `findTagStart`-walked backward from each sentinel and allocated a fresh
 * `Uint8Array(from)` per match — O(N·L) time AND O(L) memory per marker,
 * a pre-launch DoS vector for an author with permission to insert many
 * downloadable nodes into one post.
 *
 * The scanner walks forward, treating `<...>` tags atomically (quote-aware
 * so `<` and `>` inside attribute values are honored). When a tag carries
 * the sentinel, the marker is parsed and rendered; otherwise the tag is
 * emitted verbatim and the scan continues. No backward walks, no
 * per-marker allocations.
 */
function swapDownloadableAssetMarkers(html: string): string {
  const SENTINEL = 'data-downloadable-asset="true"'
  const CLOSING_TAG = '</div>'
  let out = ''
  let i = 0

  while (i < html.length) {
    const ch = html[i]
    if (ch !== '<') {
      out += ch
      i++
      continue
    }

    const tagEnd = findTagEnd(html, i + 1)
    if (tagEnd === -1) {
      // Malformed tail — emit the rest verbatim and stop.
      out += html.slice(i)
      break
    }
    const tagText = html.slice(i, tagEnd + 1) // full `<...>`

    if (tagText.includes(SENTINEL)) {
      // Skip optional immediate `</div>` so the swap replaces both the
      // opening marker and its closing pair (atom node has no children).
      const afterOpen = tagEnd + 1
      const blockEnd =
        html.slice(afterOpen, afterOpen + CLOSING_TAG.length) === CLOSING_TAG
          ? afterOpen + CLOSING_TAG.length
          : afterOpen

      const attrSlice = tagText.slice(4, -1) // strip leading `<div` and trailing `>`
      const parsed = parseDownloadableAssetMarkerAttrs(attrSlice)
      const rendered = parsed ? renderDownloadableAssetHtml(parsed) : null

      if (rendered !== null) {
        out += rendered
      } else {
        // Missing/invalid attrs OR unsafe URL scheme — leave the marker
        // intact (defensive; an inert marker div is safer than emitting a
        // card with `<a href="javascript:..." download>`).
        out += html.slice(i, blockEnd)
      }
      i = blockEnd
      continue
    }

    out += tagText
    i = tagEnd + 1
  }

  return out
}

/**
 * Returns the index of the `>` that closes the opening tag whose `<` is at
 * `from - 1`. Quote-aware: `>` inside `"..."` or `'...'` doesn't count.
 */
function findTagEnd(html: string, from: number): number {
  let inQuote: '"' | "'" | null = null
  for (let i = from; i < html.length; i++) {
    const ch = html[i]
    if (inQuote) {
      if (ch === inQuote) inQuote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch
      continue
    }
    if (ch === '>') return i
  }
  return -1
}

/**
 * Pulls each known `data-*` attribute out of the marker's attribute string.
 * Returns null if any required attribute is missing OR if the URL fails
 * the scheme allowlist — caller leaves the marker intact in that case
 * (defensive: never produce broken HTML, never produce an XSS vector).
 */
function parseDownloadableAssetMarkerAttrs(attrString: string): DownloadableAssetAttrs | null {
  const mediaItemId = readAttr(attrString, 'data-media-item-id')
  const url = readAttr(attrString, 'data-url')
  const name = readAttr(attrString, 'data-name')
  const mimeType = readAttr(attrString, 'data-mime-type')
  const sizeBytesRaw = readAttr(attrString, 'data-size-bytes')
  const assetTypeRaw = readAttr(attrString, 'data-asset-type')

  if (!mediaItemId || !url || !name) return null
  // Defense in depth: scheme allowlist check at the marker-parse boundary
  // matches the check inside renderDownloadableAssetHtml. Either guard
  // alone would be sufficient; both together make the boundary explicit.
  if (!isSafeUrl(url)) return null

  const sizeBytes = sizeBytesRaw && Number.isFinite(Number(sizeBytesRaw)) ? Number(sizeBytesRaw) : null
  const assetType = coerceAssetType(assetTypeRaw)

  return { mediaItemId, url, name, mimeType, sizeBytes, assetType }
}

/**
 * Reads a single attribute value out of a raw attribute string.
 * Handles double-quoted values + the standard HTML entity `&quot;` that
 * Tiptap emits when serializing attribute values.
 */
function readAttr(attrString: string, name: string): string {
  const re = new RegExp(`\\b${name}="([^"]*)"`)
  const match = attrString.match(re)
  if (!match) return ''
  return decodeAttrValue(match[1])
}

function decodeAttrValue(raw: string): string {
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

// --- S3 upload helper (shared by cover image + inline image upload) ---

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * NOTE: the `folder` parameter is now IGNORED by the server. Since AAA-T-110
 * iter 6, the S3 folder prefix is server-controlled per-tenant via
 * `getUploadFolderPrefix(tenantId)` in `features/media/server.ts` — the
 * authenticated tenant determines the prefix, never the client. The param
 * is kept for backward-compatible signature only; passing any value has no
 * effect on the resulting S3 key.
 */
export async function uploadImageToS3(file: File, folder = 'haloefekt/blog'): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('Plik jest za duzy. Maksymalny rozmiar to 5MB.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Dozwolone sa tylko pliki graficzne.')
  }

  const res = await fetch(routes.api.upload, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
  })
  if (!res.ok) throw new Error('Nie udalo sie wygenerowac URL do uploadu')
  const { uploadUrl, fileUrl } = await res.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('Upload nie powiodl sie')

  return fileUrl
}

export function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '')
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

import { generateSlug as _generateSlug } from '@/lib/utils/slug'
export const generateSlug = _generateSlug
