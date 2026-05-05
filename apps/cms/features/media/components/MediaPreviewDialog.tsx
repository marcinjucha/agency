

import { Image } from '@unpic/react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@agency/ui'
import { FileText, Download } from 'lucide-react'
import type { MediaItem, MediaType } from '../types'
import { extractVideoId, formatBytes, buildEmbedUrl } from '../utils'
import { messages } from '@/lib/messages'

type MediaPreviewDialogProps = {
  item: MediaItem | null
  open: boolean
  onClose: () => void
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  try {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function PreviewContent({ item }: { item: MediaItem }) {
  if (item.type === 'image') {
    return (
      <Image
        src={item.url}
        alt={item.name}
        layout="constrained"
        className="max-h-[60vh] max-w-full rounded object-contain"
      />
    )
  }

  if (item.type === 'video') {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={item.url}
        controls
        className="max-h-[60vh] max-w-full rounded"
      />
    )
  }

  if (item.type === 'youtube') {
    const parsed = extractVideoId(item.url)
    if (!parsed) return <p className="text-sm text-muted-foreground">{messages.media.previewLoadFailed}</p>
    return (
      <iframe
        src={`https://www.youtube.com/embed/${parsed.id}`}
        title={item.name}
        className="aspect-video w-full rounded"
        allowFullScreen
      />
    )
  }

  if (item.type === 'vimeo') {
    const parsed = extractVideoId(item.url)
    if (!parsed) return <p className="text-sm text-muted-foreground">{messages.media.previewLoadFailed}</p>
    return (
      <iframe
        src={`https://player.vimeo.com/video/${parsed.id}`}
        title={item.name}
        className="aspect-video w-full rounded"
        allowFullScreen
      />
    )
  }

  if (item.type === 'instagram') {
    const parsed = extractVideoId(item.url)
    if (!parsed) return <p className="text-sm text-muted-foreground">{messages.media.previewLoadFailed}</p>
    return (
      <iframe
        src={buildEmbedUrl('instagram', parsed.id)}
        title={item.name}
        className="aspect-[9/16] w-full max-w-[360px] rounded"
        allowFullScreen
      />
    )
  }

  if (item.type === 'tiktok') {
    const parsed = extractVideoId(item.url)
    if (!parsed) return <p className="text-sm text-muted-foreground">{messages.media.previewLoadFailed}</p>
    return (
      <iframe
        src={buildEmbedUrl('tiktok', parsed.id)}
        title={item.name}
        className="aspect-[9/16] w-full max-w-[360px] rounded"
        allowFullScreen
      />
    )
  }

  if (item.type === 'document') {
    // No inline preview — DOCX has no native browser support; PDF could
    // <iframe> but a clean download CTA is more honest across all doc types.
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <FileText className="h-8 w-8 text-secondary-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">{messages.media.documentNoPreview}</p>
        <Button asChild>
          <a href={item.url} download={item.name} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {messages.media.downloadFile}
          </a>
        </Button>
      </div>
    )
  }

  if (item.type === 'audio') {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          src={item.url}
          controls
          className="w-full"
          aria-label={messages.media.audioPreviewLabel}
        />
        <Button asChild variant="outline" size="sm">
          <a href={item.url} download={item.name} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {messages.media.downloadFile}
          </a>
        </Button>
      </div>
    )
  }

  return null
}

export function MediaPreviewDialog({ item, open, onClose }: MediaPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{item?.name ?? messages.media.preview}</DialogTitle>
          <DialogDescription className="sr-only">{messages.media.previewDescription}</DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            {/* Media preview */}
            <div className="flex justify-center">
              <PreviewContent item={item} />
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{messages.media.typeLabel}</span>{' '}
                {messages.media.fileTypes[item.type as MediaType] ?? item.type}
              </span>
              {formatBytes(item.size_bytes) && (
                <span>
                  <span className="font-medium text-foreground">{messages.media.sizeLabel}</span>{' '}
                  {formatBytes(item.size_bytes)}
                </span>
              )}
              {formatDate(item.created_at) && (
                <span>
                  <span className="font-medium text-foreground">{messages.media.addedLabel}</span>{' '}
                  {formatDate(item.created_at)}
                </span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
