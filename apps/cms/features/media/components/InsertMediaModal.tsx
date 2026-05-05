
import { useRef, useState } from 'react'
import { Image } from '@unpic/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Folder } from 'lucide-react'
import { Link2, Loader2, UploadCloud } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mediaKeys } from '@/features/media/queries'
import { folderKeys } from '@/features/media/folder-queries'
import { buildFolderTree } from '@/features/media/folder-types'
import { createMediaItemFn, getMediaItemsFn, getMediaFoldersFn } from '@/features/media/server'
import {
  uploadMediaToS3,
  ALLOWED_MIME_TYPES,
  IMAGE_MAX_SIZE,
  VIDEO_MAX_SIZE,
} from '@/features/media/utils'
import { extractVideoId, generateThumbnailUrl, buildEmbedUrl, fetchVimeoThumbnail } from '@/lib/video-utils'
import { MediaTypeFilter } from '@/features/media/components/MediaTypeFilter'
import type { MediaType, MediaItemListItem } from '@/features/media/types'
import type { Editor } from '@tiptap/react'
import { messages, templates } from '@/lib/messages'

// --- Types ---

type InsertMediaModalProps = {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

// --- Registries ---

// Single source of truth for fallback abbreviation text shown when a media
// item has no thumbnail (embed types without a thumbnail URL).
const MEDIA_TYPE_ABBREVIATIONS: Record<MediaType, string> = {
  image: 'IMG',
  video: 'VID',
  youtube: 'YT',
  vimeo: 'VM',
  instagram: 'IG',
  tiktok: 'TT',
  document: 'DOC',
  audio: 'AUD',
}

// Document and audio are downloadable-only assets — no Tiptap insert handler.
// If a downloadable asset is selected via this modal, insertion is a no-op.
// Insertion of downloadable links is handled by a separate flow (see blog
// downloadable assets — AAA-T-110 iter 2+).
const MEDIA_INSERT_HANDLERS: Record<MediaType, (editor: Editor, url: string) => void> = {
  image: (editor, url) => editor.chain().focus().setImage({ src: url }).run(),
  video: (editor, url) => editor.chain().focus().setVideo({ src: url }).run(),
  youtube: (editor, url) => editor.chain().focus().setYouTube({ src: url }).run(),
  vimeo: (editor, url) => editor.chain().focus().setVimeo({ src: url }).run(),
  instagram: (editor, url) => editor.chain().focus().setInstagram({ src: url }).run(),
  tiktok: (editor, url) => editor.chain().focus().setTikTok({ src: url }).run(),
  document: () => undefined,
  audio: () => undefined,
}

// --- Helpers ---

function insertMediaIntoEditor(
  editor: Editor,
  item: { type: MediaType; url: string }
) {
  MEDIA_INSERT_HANDLERS[item.type](editor, item.url)
}

// --- Embed Tab (YouTube/Vimeo URL only) ---

function EmbedTab({
  editor,
  onInserted,
}: {
  editor: Editor | null
  onInserted: () => void
}) {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null)
  const [isInsertingUrl, setIsInsertingUrl] = useState(false)
  const queryClient = useQueryClient()

  async function handleVideoUrlInsert() {
    if (!videoUrl.trim()) return
    setVideoUrlError(null)

    const parsed = extractVideoId(videoUrl.trim())
    if (!parsed) {
      setVideoUrlError(messages.media.invalidEmbedLink)
      return
    }

    setIsInsertingUrl(true)
    try {
      let thumbnailUrl: string | null = null
      if (parsed.platform === 'youtube') {
        thumbnailUrl = generateThumbnailUrl('youtube', parsed.id)
      } else {
        thumbnailUrl = await fetchVimeoThumbnail(videoUrl.trim())
      }

      const embedUrl = buildEmbedUrl(parsed.platform, parsed.id)

      const result = await createMediaItemFn({
        data: {
          name: `${parsed.platform}-${parsed.id}`,
          type: parsed.platform,
          url: embedUrl,
          s3_key: null,
          mime_type: null,
          size_bytes: null,
          thumbnail_url: thumbnailUrl,
        },
      })

      if (!result.success)
        throw new Error(result.error ?? messages.media.dbSaveFailed)

      queryClient.invalidateQueries({ queryKey: mediaKeys.all })

      if (editor) {
        insertMediaIntoEditor(editor, { type: parsed.platform, url: embedUrl })
        onInserted()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.media.unknownError
      setVideoUrlError(message)
    } finally {
      setIsInsertingUrl(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {messages.media.embedDescription}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value)
              setVideoUrlError(null)
            }}
            placeholder="https://youtube.com/watch?v=... / vimeo.com/... / instagram.com/reel/... / tiktok.com/..."
            className="pl-9"
            aria-label="Link do YouTube, Vimeo, Instagram lub TikTok"
            aria-invalid={!!videoUrlError}
            aria-describedby={videoUrlError ? 'video-url-error' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleVideoUrlInsert()
              }
            }}
          />
        </div>
        <Button
          onClick={handleVideoUrlInsert}
          disabled={!videoUrl.trim() || isInsertingUrl}
        >
          {isInsertingUrl ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {messages.media.inserting}
            </>
          ) : (
            messages.common.insert
          )}
        </Button>
      </div>
      {videoUrlError && (
        <p
          id="video-url-error"
          className="text-xs text-destructive"
          role="alert"
        >
          {videoUrlError}
        </p>
      )}
    </div>
  )
}

// --- Library Tab ---

function LibraryTab({
  editor,
  onInserted,
  middleSlot,
}: {
  editor: Editor | null
  onInserted: () => void
  middleSlot?: React.ReactNode
}) {
  const [typeFilter, setTypeFilter] = useState<MediaType | undefined>(undefined)
  const [folderFilter, setFolderFilter] = useState<string | null | undefined>(undefined)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: mediaKeys.list({ type: typeFilter, folder_id: folderFilter }),
    queryFn: () => getMediaItemsFn({ data: { type: typeFilter, folder_id: folderFilter } }),
  })

  const { data: folders } = useQuery({
    queryKey: folderKeys.list,
    queryFn: () => getMediaFoldersFn(),
  })

  const folderTree = folders ? buildFolderTree(folders) : []

  async function handleUpload(file: File) {
    setUploadError(null)

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError(messages.media.fileTypeNotAllowed)
      return
    }
    const maxSize = file.type.startsWith('video/') ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE
    if (file.size > maxSize) {
      setUploadError(templates.media.fileTooLarge(maxSize / (1024 * 1024)))
      return
    }

    setUploadProgress(10)
    try {
      const { fileUrl, s3Key } = await uploadMediaToS3(file)
      setUploadProgress(80)

      const result = await createMediaItemFn({
        data: {
          name: file.name.replace(/\.[^.]+$/, ''),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: fileUrl,
          s3_key: s3Key,
          mime_type: file.type,
          size_bytes: file.size,
        },
      })
      if (!result.success) throw new Error(result.error ?? messages.media.saveFailed)

      setUploadProgress(100)
      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      setTimeout(() => setUploadProgress(null), 800)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : messages.media.unknownError)
      setUploadProgress(null)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      await handleUpload(file)
    }
  }

  function handleSelect(item: MediaItemListItem) {
    if (!editor) return
    insertMediaIntoEditor(editor, { type: item.type as MediaType, url: item.url })
    onInserted()
  }

  return (
    <div className="space-y-4">
      {/* Compact upload zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={messages.media.dropOrClickAria}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
        className={[
          'flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors duration-150',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-primary/5',
          uploadProgress !== null ? 'pointer-events-none opacity-60' : '',
        ].filter(Boolean).join(' ')}
      >
        <UploadCloud className={`h-5 w-5 shrink-0 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{messages.media.dragOrClickUpload}</p>
          <p className="text-xs text-muted-foreground">{messages.media.fileLimits}</p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_MIME_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />
      {uploadProgress !== null && <Progress value={uploadProgress} className="h-1.5" />}
      {uploadError && <p className="text-xs text-destructive" role="alert">{uploadError}</p>}

      {middleSlot}

      <div className="flex items-center gap-2">
        {folders && folders.length > 0 && (
          <Select
            value={folderFilter === undefined ? 'all' : folderFilter === null ? 'root' : folderFilter}
            onValueChange={(v) => setFolderFilter(v === 'all' ? undefined : v === 'root' ? null : v)}
          >
            <SelectTrigger className="w-[180px]">
              <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Wszystkie media" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{messages.media.allMedia}</SelectItem>
              <SelectItem value="root">{messages.media.unsorted}</SelectItem>
              {folderTree.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <MediaTypeFilter value={typeFilter} onChange={setTypeFilter} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {messages.media.noMediaInLibrary}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {messages.media.uploadToAdd}
          </p>
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="group overflow-hidden rounded-lg border border-border bg-card text-left transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={templates.media.insertItemAriaLabel(item.name)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {item.type === 'image' ? (
                  <Image
                    src={item.url}
                    alt={item.name}
                    layout="fullWidth"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : item.thumbnail_url ? (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.name}
                    layout="fullWidth"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-2xl text-muted-foreground/50">
                      {MEDIA_TYPE_ABBREVIATIONS[item.type as MediaType] ?? 'VID'}
                    </span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
                  <span className="text-sm font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {messages.common.insert}
                  </span>
                </div>
              </div>
              {/* Name */}
              <div className="px-2 py-1.5">
                <p className="truncate text-xs text-muted-foreground">
                  {item.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Main Modal ---

export function InsertMediaModal({
  editor,
  open,
  onClose,
}: InsertMediaModalProps) {
  function handleInserted() {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{messages.media.insertMedia}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 pb-2">
          <LibraryTab
            editor={editor}
            onInserted={handleInserted}
            middleSlot={<EmbedTab editor={editor} onInserted={handleInserted} />}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
