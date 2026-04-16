

import { Image } from '@unpic/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@agency/ui'
import type { MediaItem } from '../types'
import { extractVideoId, formatBytes, buildEmbedUrl } from '../utils'

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
    if (!parsed) return <p className="text-sm text-muted-foreground">Nie można załadować podglądu.</p>
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
    if (!parsed) return <p className="text-sm text-muted-foreground">Nie można załadować podglądu.</p>
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
    if (!parsed) return <p className="text-sm text-muted-foreground">Nie można załadować podglądu.</p>
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
    if (!parsed) return <p className="text-sm text-muted-foreground">Nie można załadować podglądu.</p>
    return (
      <iframe
        src={buildEmbedUrl('tiktok', parsed.id)}
        title={item.name}
        className="aspect-[9/16] w-full max-w-[360px] rounded"
        allowFullScreen
      />
    )
  }

  return null
}

export function MediaPreviewDialog({ item, open, onClose }: MediaPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{item?.name ?? 'Podgląd'}</DialogTitle>
          <DialogDescription className="sr-only">Podgląd pliku multimedialnego</DialogDescription>
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
                <span className="font-medium text-foreground">Typ:</span>{' '}
                {item.type}
              </span>
              {formatBytes(item.size_bytes) && (
                <span>
                  <span className="font-medium text-foreground">Rozmiar:</span>{' '}
                  {formatBytes(item.size_bytes)}
                </span>
              )}
              {formatDate(item.created_at) && (
                <span>
                  <span className="font-medium text-foreground">Dodano:</span>{' '}
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
