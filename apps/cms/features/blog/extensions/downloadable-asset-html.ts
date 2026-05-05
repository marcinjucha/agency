/**
 * Pure, deterministic HTML generator for the downloadable asset card on the
 * PUBLIC website.
 *
 * IMPORTANT — INLINE STYLES ONLY:
 * The website renders blog articles via dangerouslySetInnerHTML from
 * `blog_posts.html_body`. There is NO Tailwind context on that page for
 * content blocks, so any class-based styling (Tailwind, shadcn) silently
 * produces unstyled output. Every visual property here lives in `style="..."`
 * attributes. The single embedded <style> block at the bottom is scoped via a
 * unique attribute selector (`[data-downloadable-asset-button]`) and only
 * adds hover/focus polish — the card is fully readable without it.
 *
 * Color palette tuned for the LIGHT (cream/orange/ink) website theme:
 *   - Card background: pure white (#ffffff)
 *   - Card border:     warm light gray (#e7e1d4) — visible on both #ffffff
 *                      and #fff7ed (cream) section backgrounds without
 *                      washing out
 *   - Primary text:    near-black ink (#1f1d1a)
 *   - Secondary text:  warm muted (#6b6357)
 *   - Accent (button): orange (#f97316 → hover #ea580c) — matches the
 *                      website's existing CTA palette
 *
 * Output shape:
 *   <div data-downloadable-asset="true" ...>
 *     <div icon-cell>     [type-specific lucide SVG]
 *     <div info-cell>     [filename] / [size · TYPE]
 *     <a button-cell>     [download SVG] Pobierz
 *   </div>
 *
 * The `data-downloadable-asset="true"` root attribute lets the Tiptap
 * extension's parseHTML hook recognize this node when re-loading saved HTML.
 */

import { getAssetTypeIconSvg, getDownloadIconSvg } from './downloadable-asset-icons'

/**
 * Single source of truth for the asset-type union — derived from a frozen
 * `as const` tuple so adding a new variant is a single-line edit and the
 * type/runtime stay in lock-step. Also reused by the editor card and the
 * marker post-processor in features/blog/utils.ts.
 */
export const DOWNLOADABLE_ASSET_TYPES = ['document', 'audio', 'image', 'video'] as const
export type DownloadableAssetType = (typeof DOWNLOADABLE_ASSET_TYPES)[number]

/**
 * Coerces an unknown value to a valid DownloadableAssetType, defaulting to
 * 'document' for anything outside the union. Used wherever attrs cross a
 * type boundary (parseHTML, JSONB, marker attribute parsing).
 */
export function coerceAssetType(raw: unknown): DownloadableAssetType {
  return (DOWNLOADABLE_ASSET_TYPES as readonly string[]).includes(raw as string)
    ? (raw as DownloadableAssetType)
    : 'document'
}

/**
 * Allowlist URL schemes for the public download anchor. A malicious CMS
 * author could otherwise persist `url: "javascript:alert(document.cookie)"`
 * or `url: "data:text/html,..."` into the Tiptap node, the post-processor
 * would HTML-escape (which is scheme-blind) and emit `<a href="javascript:..."
 * download>...</a>` into html_body — a stored XSS in the public website
 * origin on click. Restricting to http/https blocks every dangerous scheme
 * (javascript, data, vbscript, file, about, ...) at the rendering boundary.
 *
 * Returns false on any non-absolute URL too — downloadable assets are S3
 * URLs, never relative.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export interface DownloadableAssetAttrs {
  mediaItemId: string
  url: string
  name: string
  mimeType: string
  sizeBytes: number | null
  assetType: DownloadableAssetType
}

const TYPE_LABEL_OVERRIDES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/aac': 'AAC',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
  'video/quicktime': 'MOV',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'image/svg+xml': 'SVG',
  'image/avif': 'AVIF',
}

/**
 * Derives a short uppercase type label (e.g. "PDF", "MP3", "JPG"):
 * 1. Prefer the MIME-type table — most accurate.
 * 2. Otherwise fall back to the filename extension.
 * 3. Otherwise use the asset type as a generic fallback ("DOC" / "AUDIO" / ...).
 */
export function deriveTypeLabel(name: string, mimeType: string, assetType: DownloadableAssetType): string {
  const fromMime = TYPE_LABEL_OVERRIDES[mimeType.toLowerCase()]
  if (fromMime) return fromMime

  const dot = name.lastIndexOf('.')
  if (dot > 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toUpperCase()
  }

  return assetType.toUpperCase()
}

/** Pure size formatter — same thresholds as features/media/utils.ts formatFileSize. */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// HTML escaping — every interpolated attr/value goes through this.
// Output goes verbatim into html_body; an un-escaped quote in a filename or
// URL would break the surrounding attribute.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// --- Inline style fragments (kept as constants so the same tokens render
//     identically in editor preview and final HTML) ---

const ROOT_STYLE = [
  'display:flex',
  'align-items:center',
  'gap:16px',
  'box-sizing:border-box',
  'width:100%',
  'max-width:640px',
  'margin:24px 0',
  'padding:16px 18px',
  'background-color:#ffffff',
  'border:1px solid #e7e1d4',
  'border-radius:12px',
  'box-shadow:0 1px 2px rgba(15,23,42,0.04)',
  'font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  'color:#1f1d1a',
  'text-decoration:none',
].join(';')

const ICON_CELL_STYLE = [
  'flex:0 0 auto',
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'width:48px',
  'height:48px',
  'border-radius:10px',
  'background-color:#fff3e8', // pale peach — evokes orange brand without shouting
  'color:#c2410c',             // darker orange, AA on the peach bg
].join(';')

const INFO_CELL_STYLE = ['flex:1 1 auto', 'min-width:0', 'display:flex', 'flex-direction:column', 'gap:4px'].join(';')

const NAME_STYLE = [
  'font-size:15px',
  'font-weight:600',
  'line-height:1.35',
  'color:#1f1d1a',
  'overflow:hidden',
  'text-overflow:ellipsis',
  'white-space:nowrap',
  'word-break:break-all',
].join(';')

const META_ROW_STYLE = ['display:flex', 'align-items:center', 'gap:8px', 'font-size:13px', 'color:#6b6357'].join(';')

const TYPE_CHIP_STYLE = [
  'display:inline-flex',
  'align-items:center',
  'padding:1px 8px',
  'background-color:#f5efe4',
  'color:#6b6357',
  'border-radius:999px',
  'font-size:11px',
  'font-weight:600',
  'letter-spacing:0.04em',
  'text-transform:uppercase',
].join(';')

const SIZE_DOT_STYLE = ['color:#a8a195'].join(';')

const BUTTON_STYLE = [
  'flex:0 0 auto',
  'display:inline-flex',
  'align-items:center',
  'gap:6px',
  'padding:8px 14px',
  'background-color:#f97316',
  'color:#ffffff',
  'border-radius:8px',
  'font-size:14px',
  'font-weight:600',
  'line-height:1',
  'text-decoration:none',
  'transition:background-color 150ms ease, transform 150ms ease',
  'white-space:nowrap',
].join(';')

// Small scoped <style> for hover/focus that inline `style=""` cannot express.
// Attribute-scoped so it doesn't bleed into other content.
const HOVER_STYLE_BLOCK = `<style>
[data-downloadable-asset-button]:hover{background-color:#ea580c !important;transform:translateY(-1px);}
[data-downloadable-asset-button]:focus-visible{outline:2px solid #c2410c;outline-offset:2px;}
[data-downloadable-asset-card]:hover{border-color:#d6cdb8 !important;box-shadow:0 4px 12px rgba(15,23,42,0.06) !important;}
</style>`

/**
 * Returns the complete HTML string for a downloadable asset card, or `null`
 * when the asset URL fails the scheme allowlist (see `isSafeUrl`). Callers
 * (the marker post-processor) treat null as "leave the marker intact" — the
 * marker is invisible on the public site, which is the correct fail-safe
 * outcome for an XSS-laden URL.
 *
 * Pure: same input → same output, no DOM access, no globals.
 * Deterministic: order of inline-style fragments is fixed, so identical
 * attrs always serialize byte-identically (important for snapshot diffs).
 */
export function renderDownloadableAssetHtml(attrs: DownloadableAssetAttrs): string | null {
  if (!isSafeUrl(attrs.url)) return null

  const safeName = escapeHtml(attrs.name)
  const safeUrl = escapeHtml(attrs.url)
  const safeMediaId = escapeHtml(attrs.mediaItemId)
  const typeLabel = escapeHtml(deriveTypeLabel(attrs.name, attrs.mimeType, attrs.assetType))
  const sizeText = formatFileSize(attrs.sizeBytes)

  const iconSvg = getAssetTypeIconSvg(attrs.assetType, 24)
  const downloadSvg = getDownloadIconSvg(16)

  // Filename = the visible affordance for "this is a file"; stays as plain
  // text. Size + uppercase type chip live on the meta row below.
  const metaParts: string[] = [`<span style="${TYPE_CHIP_STYLE}">${typeLabel}</span>`]
  if (sizeText) {
    metaParts.push(`<span style="${SIZE_DOT_STYLE}" aria-hidden="true">·</span>`)
    metaParts.push(`<span>${escapeHtml(sizeText)}</span>`)
  }

  return [
    `<div data-downloadable-asset="true"`,
    ` data-downloadable-asset-card`,
    ` data-media-item-id="${safeMediaId}"`,
    ` data-asset-type="${escapeHtml(attrs.assetType)}"`,
    ` style="${ROOT_STYLE}">`,
    `<div style="${ICON_CELL_STYLE}" aria-hidden="true">${iconSvg}</div>`,
    `<div style="${INFO_CELL_STYLE}">`,
    `<div style="${NAME_STYLE}" title="${safeName}">${safeName}</div>`,
    `<div style="${META_ROW_STYLE}">${metaParts.join('')}</div>`,
    `</div>`,
    `<a href="${safeUrl}" download="${safeName}"`,
    ` data-downloadable-asset-button`,
    ` style="${BUTTON_STYLE}"`,
    ` aria-label="Pobierz plik ${safeName}">`,
    `${downloadSvg}<span>Pobierz</span>`,
    `</a>`,
    `</div>`,
    HOVER_STYLE_BLOCK,
  ].join('')
}
