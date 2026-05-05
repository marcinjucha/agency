/**
 * Modal that lets a blog author pick a `is_downloadable=true` media item and
 * insert it into the editor as a `downloadableAsset` Tiptap node.
 *
 * Surface mirrors InsertMediaModal (drag-drop upload, type filter, grid)
 * but constrained to downloadable items only:
 *   - getMediaItemsFn called with `is_downloadable: true` filter
 *   - upload zone presets `is_downloadable: true` on the new media item
 *   - type filter shows only the 4 downloadable-eligible types (image/video/document/audio),
 *     and within those only types that actually exist in the user's library
 *
 * Selection contract: parent supplies `onSelect(item)` — modal does NOT touch
 * the editor. Parent owns the editor.chain().setDownloadableAsset() call so
 * this component stays decoupled from the Tiptap extension surface.
 */

import { useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Progress,
} from '@agency/ui'
import { Loader2, UploadCloud, Search, FileDown, FileText, Image as ImageIcon, Video, Music } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mediaKeys } from '@/features/media/queries'
import { createMediaItemFn, getMediaItemsFn } from '@/features/media/server'
import {
  uploadMediaToS3,
  ALLOWED_MIME_TYPES,
  formatFileSize,
  getMaxSizeForMime,
  getMediaTypeFromMime,
} from '@/features/media/utils'
import {
  DOWNLOADABLE_MEDIA_TYPES,
  type MediaItemListItem,
  type MediaType,
} from '@/features/media/types'
import { Link as RouterLink } from '@tanstack/react-router'
import { routes } from '@/lib/routes'
import { messages, templates } from '@/lib/messages'

// --- Types ---

type InsertDownloadableAssetModalProps = {
  open: boolean
  onClose: () => void
  /**
   * Called when the user selects a downloadable item — modal closes after.
   * Parent inserts the Tiptap node (we keep this component editor-agnostic).
   */
  onSelect: (item: MediaItemListItem) => void
}

// Per-type icon for the grid card and filter pills. Reuses `FileDown` as a
// neutral fallback only for unknown types (defensive — DB rows should be
// constrained to DOWNLOADABLE_MEDIA_TYPES via the is_downloadable filter, but
// the type column accepts any MediaType so we guard).
const TYPE_ICONS: Record<MediaType, typeof FileDown> = {
  image: ImageIcon,
  video: Video,
  document: FileText,
  audio: Music,
  // Embed types — won't appear under is_downloadable=true in practice. Falls
  // back to FileDown so a stray row still renders.
  youtube: FileDown,
  vimeo: FileDown,
  instagram: FileDown,
  tiktok: FileDown,
}

// --- Modal ---

export function InsertDownloadableAssetModal({
  open,
  onClose,
  onSelect,
}: InsertDownloadableAssetModalProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MediaType | undefined>(undefined)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Always fetch ALL downloadable items — type filter is applied client-side
  // so the "available types" pill set can derive itself from the full list.
  // Search is also applied client-side (small dataset; avoids extra round-trip
  // on every keystroke).
  const {
    data: allItems,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: mediaKeys.list({ is_downloadable: true }),
    queryFn: () => getMediaItemsFn({ data: { is_downloadable: true } }),
    enabled: open,
  })

  // Type pills only show types that actually exist in the user's library —
  // empty pill rows are noise. Derived in render order matching
  // DOWNLOADABLE_MEDIA_TYPES (single source of truth in features/media/types).
  const availableTypes = useMemo(() => {
    if (!allItems) return [] as MediaType[]
    const present = new Set(allItems.map((i) => i.type as MediaType))
    return DOWNLOADABLE_MEDIA_TYPES.filter((t) => present.has(t))
  }, [allItems])

  // Filtered list (search + active type pill). Search is case-insensitive on name.
  const filteredItems = useMemo(() => {
    if (!allItems) return []
    const q = search.trim().toLowerCase()
    return allItems.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false
      if (q && !item.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [allItems, search, typeFilter])

  async function handleUpload(file: File) {
    setUploadError(null)

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError(messages.media.fileTypeNotAllowed)
      return
    }
    const maxSize = getMaxSizeForMime(file.type)
    if (file.size > maxSize) {
      setUploadError(templates.media.fileTooLarge(maxSize / (1024 * 1024)))
      return
    }
    const detectedType = getMediaTypeFromMime(file.type)
    if (!detectedType) {
      setUploadError(messages.media.fileTypeNotAllowed)
      return
    }

    setUploadProgress(10)
    try {
      const { fileUrl, s3Key } = await uploadMediaToS3(file)
      setUploadProgress(80)

      const result = await createMediaItemFn({
        data: {
          name: file.name.replace(/\.[^.]+$/, ''),
          type: detectedType,
          url: fileUrl,
          s3_key: s3Key,
          mime_type: file.type,
          size_bytes: file.size,
          is_downloadable: true,
        },
      })
      if (!result.success || !result.data) {
        throw new Error(result.error ?? messages.blog.downloadModal.uploadFailed)
      }

      setUploadProgress(100)
      // Root-key invalidation — exact-key invalidation silently fails when
      // the modal's queryKey object identity differs from the upload's
      // (see ag-design-patterns: TanStack Query: Root Key Invalidation).
      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      setTimeout(() => setUploadProgress(null), 600)

      // Auto-select the just-uploaded item — saves a click and matches the
      // "upload then immediately use" mental model. createMediaItemFn returns
      // a full MediaItem; we project it down to MediaItemListItem since the
      // onSelect contract uses the list-shape (parent never needs full row).
      const created = result.data
      onSelect({
        id: created.id,
        name: created.name,
        type: created.type,
        url: created.url,
        mime_type: created.mime_type,
        size_bytes: created.size_bytes,
        thumbnail_url: created.thumbnail_url,
        folder_id: created.folder_id,
        is_downloadable: created.is_downloadable,
        created_at: created.created_at,
      })
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : messages.blog.downloadModal.uploadFailed,
      )
      setUploadProgress(null)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    // Single-file flow — modal auto-closes after upload, so multi-file would
    // close after the first file and orphan the rest. Take only the first.
    await handleUpload(files[0])
  }

  function reset() {
    setSearch('')
    setTypeFilter(undefined)
    setUploadProgress(null)
    setUploadError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>{messages.blog.downloadModal.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pb-2 pr-1">
          {/* Upload zone — files dropped here get is_downloadable=true preset */}
          <div
            role="button"
            tabIndex={0}
            aria-label={messages.media.dropOrClickAria}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragOver(false)
            }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className={[
              'flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors duration-150',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-primary/5',
              uploadProgress !== null ? 'pointer-events-none opacity-60' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <UploadCloud
              className={`h-5 w-5 shrink-0 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{messages.blog.downloadModal.uploadCta}</p>
              <p className="text-xs text-muted-foreground">{messages.media.fileLimits}</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          {uploadProgress !== null && <Progress value={uploadProgress} className="h-1.5" />}
          {uploadError && (
            <p className="text-xs text-destructive" role="alert">
              {uploadError}
            </p>
          )}

          {/* Search input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={messages.blog.downloadModal.search}
              aria-label={messages.blog.downloadModal.search}
              className="pl-9"
            />
          </div>

          {/* Type filter pills — render only types that actually exist */}
          {availableTypes.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label={messages.blog.downloadModal.filterByType}
            >
              <FilterPill
                active={typeFilter === undefined}
                onClick={() => setTypeFilter(undefined)}
                label={messages.media.fileTypes.all}
              />
              {availableTypes.map((t) => (
                <FilterPill
                  key={t}
                  active={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                  label={messages.media.fileTypes[t]}
                />
              ))}
            </div>
          )}

          {/* States */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="sr-only">{messages.blog.downloadModal.loading}</span>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-destructive">{messages.blog.downloadModal.loadFailed}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {messages.blog.downloadModal.retry}
              </Button>
            </div>
          )}

          {/* Empty state — no downloadable items in library at all */}
          {!isLoading && !isError && allItems && allItems.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <FileDown className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="max-w-md text-sm text-muted-foreground">
                {messages.blog.downloadModal.empty}
              </p>
              <Button asChild variant="outline" size="sm">
                <RouterLink to={routes.admin.media}>
                  {messages.blog.downloadModal.goToLibrary}
                </RouterLink>
              </Button>
            </div>
          )}

          {/* No results for current filter (but library is non-empty) */}
          {!isLoading &&
            !isError &&
            allItems &&
            allItems.length > 0 &&
            filteredItems.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {messages.blog.downloadModal.noResults}
              </p>
            )}

          {/* Grid */}
          {filteredItems.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <DownloadableAssetGridCard item={item} onSelect={() => onSelect(item)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — Cancel only (selection auto-closes the modal via onSelect) */}
        <div className="flex items-center justify-end border-t border-border pt-3">
          <Button variant="ghost" onClick={handleClose}>
            {messages.blog.downloadModal.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-components ---

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function DownloadableAssetGridCard({
  item,
  onSelect,
}: {
  item: MediaItemListItem
  onSelect: () => void
}) {
  const Icon = TYPE_ICONS[item.type as MediaType] ?? FileDown
  const sizeText = formatFileSize(item.size_bytes)
  const typeLabel = messages.media.fileTypes[item.type as MediaType] ?? ''

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={templates.blog.selectDownloadAriaLabel(item.name)}
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors duration-150 hover:border-primary hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {sizeText ? `${sizeText} · ${typeLabel}` : typeLabel}
        </p>
      </div>
    </button>
  )
}
