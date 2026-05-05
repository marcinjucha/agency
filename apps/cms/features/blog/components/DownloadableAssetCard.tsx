/**
 * Editor NodeView for the downloadable-asset Tiptap node.
 *
 * Two surfaces, one visual contract:
 *  1. This component renders inside the CMS Tiptap editor (DARK theme,
 *     Tailwind context available).
 *  2. `renderDownloadableAssetHtml` (sibling file) renders the same card
 *     into the public HTML body of a blog post (LIGHT theme, NO Tailwind).
 *
 * Both surfaces show the same information in the same layout so authors
 * see what readers will see — but the colors differ because the dark CMS
 * editor and the cream/orange website have different visual languages.
 *
 * Authoring affordances unique to this component:
 *  - Small "Plik do pobrania" badge in the top-left so the author knows
 *    this is a special block, not a regular paragraph.
 *  - Delete button (X) in the top-right, wired to `deleteNode()` so the
 *    author can remove the block without manually selecting+pressing Del.
 *  - The `<a download>` link is intentionally left clickable in the
 *    editor — clicking does trigger a download, which is fine: it's the
 *    same action the reader will take, and it lets the author verify
 *    the file works.
 */

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Download, FileText, Image as ImageIcon, Music, Video, X } from 'lucide-react'
import { Button } from '@agency/ui'
import { messages } from '@/lib/messages'
import {
  coerceAssetType,
  deriveTypeLabel,
  formatFileSize,
  isSafeUrl,
  type DownloadableAssetAttrs,
  type DownloadableAssetType,
} from '../extensions/downloadable-asset-html'

const ASSET_TYPE_ICON: Record<DownloadableAssetType, typeof FileText> = {
  document: FileText,
  audio: Music,
  image: ImageIcon,
  video: Video,
}

/**
 * Reads the node attributes off the Tiptap node prop.
 *
 * We re-read them here instead of typing `props.node.attrs` directly so a
 * future schema migration (renaming `assetType` etc.) only needs to touch
 * one place.
 */
function readAttrs(node: NodeViewProps['node']): DownloadableAssetAttrs {
  const attrs = node.attrs as Partial<DownloadableAssetAttrs>
  return {
    mediaItemId: attrs.mediaItemId ?? '',
    url: attrs.url ?? '',
    name: attrs.name ?? '',
    mimeType: attrs.mimeType ?? '',
    sizeBytes: attrs.sizeBytes ?? null,
    // Shared coerce — keeps the asset-type allowlist in lock-step with
    // parseHTML and the marker post-processor. Adding a new variant means
    // editing DOWNLOADABLE_ASSET_TYPES in one place.
    assetType: coerceAssetType(attrs.assetType),
  }
}

export function DownloadableAssetCard(props: NodeViewProps) {
  const attrs = readAttrs(props.node)
  const Icon = ASSET_TYPE_ICON[attrs.assetType] ?? FileText
  const typeLabel = deriveTypeLabel(attrs.name, attrs.mimeType, attrs.assetType)
  const sizeText = formatFileSize(attrs.sizeBytes)
  // Defense in depth: even though save-time validation rejects unsafe
  // URLs (FIX 1 + FIX 2), legacy posts that loaded before the guard was
  // in place may still carry javascript:/data: URLs. Disable the click
  // surface for any non-http(s) URL so the author can never accidentally
  // trigger XSS in the CMS origin.
  const urlIsSafe = isSafeUrl(attrs.url)

  return (
    <NodeViewWrapper
      data-downloadable-asset-editor
      // `not-prose` keeps Tailwind Typography from styling the card's interior
      // (would otherwise underline the link, color the heading, etc.).
      className="not-prose group relative my-6 block"
    >
      {/* Author hint badge — flagged as decorative for SR (the structure already
          conveys "this is a download block" via the icon + button text). */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-3 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm"
      >
        {messages.blog.downloadable.editorBadge}
      </span>

      {/* Delete button — only visible on hover/focus to keep the editor view
          clean during normal authoring. focus-within so keyboard users see it
          when tabbing through the card. */}
      <button
        type="button"
        onClick={() => props.deleteNode()}
        aria-label={messages.blog.downloadable.removeBlock}
        className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-border/80">
        {/* Icon cell — square, accent-tinted. Mirrors the public card's pale
            peach swatch but uses the dark theme's primary token. */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        {/* Info column — min-w-0 lets `truncate` actually engage inside flex. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="truncate text-sm font-semibold text-foreground" title={attrs.name}>
            {attrs.name || messages.blog.downloadable.unnamedFile}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {typeLabel}
            </span>
            {sizeText ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{sizeText}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Download CTA — Button from @agency/ui guarantees focus-visible ring.
            When the URL is safe (http/https) we render an `<a download>` so
            the author can verify the file. When it's NOT safe (legacy posts
            with javascript:/data: URLs) we render a disabled <button> so
            clicking doesn't fire a navigation. The element shape stays the
            same so layout doesn't shift. */}
        {urlIsSafe ? (
          <Button asChild size="sm" className="flex-shrink-0">
            <a
              href={attrs.url}
              download={attrs.name}
              // contentEditable={false} stops Tiptap from putting the cursor
              // inside the link when the author clicks near it. Same trick used
              // by atom NodeViews across the codebase.
              contentEditable={false}
              aria-label={`${messages.blog.downloadable.downloadButton} ${attrs.name}`.trim()}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {messages.blog.downloadable.downloadButton}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="flex-shrink-0"
            disabled
            contentEditable={false}
            aria-label={`${messages.blog.downloadable.downloadButton} ${attrs.name}`.trim()}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {messages.blog.downloadable.downloadButton}
          </Button>
        )}
      </div>
    </NodeViewWrapper>
  )
}
