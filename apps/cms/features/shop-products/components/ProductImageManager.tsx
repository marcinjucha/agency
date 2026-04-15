

import { useState, useCallback } from 'react'
import { X, Plus, Star } from 'lucide-react'
import {
  Button,
  CollapsibleCard,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@agency/ui'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { messages } from '@/lib/messages'
import { createMediaProxyEditor } from '@/lib/utils/media-proxy'

interface ProductImageManagerProps {
  images: string[]
  onChange: (images: string[]) => void
  coverImageUrl: string | null
  onSetCover: (url: string) => void
}

/**
 * Image gallery manager for product images (JSONB array of URLs).
 * Uses InsertMediaModal for selecting images from the media library.
 * Since InsertMediaModal expects a Tiptap Editor for insertion,
 * we use a callback-based approach via onClose + custom selection.
 */
export function ProductImageManager({
  images,
  onChange,
  coverImageUrl,
  onSetCover,
}: ProductImageManagerProps) {
  const [mediaModalOpen, setMediaModalOpen] = useState(false)

  const handleRemoveImage = useCallback(
    (index: number) => {
      const updated = images.filter((_, i) => i !== index)
      onChange(updated)
    },
    [images, onChange]
  )

  const handleSetCover = useCallback(
    (url: string) => {
      onSetCover(url)
    },
    [onSetCover]
  )

  const editorProxy = createMediaProxyEditor((url) => onChange([...images, url]))

  const MAX_VISIBLE = 6

  return (
    <CollapsibleCard title={messages.shop.imagesLabel} defaultOpen>
      <div className="space-y-4">
        {/* Image grid */}
        {images.length > 0 && (
          <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-3 gap-2">
              {images.slice(0, MAX_VISIBLE).map((url, index) => {
                const isCover = url === coverImageUrl

                return (
                  <div
                    key={`${url}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Zdjęcie produktu ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Cover badge */}
                    {isCover && (
                      <div className="absolute left-1 top-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Główne
                      </div>
                    )}

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      {!isCover && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleSetCover(url)}
                              className="rounded-full bg-background/90 p-1.5 text-foreground transition-colors hover:bg-background"
                              aria-label={messages.shop.setAsCover}
                            >
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{messages.shop.setAsCover}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="rounded-full bg-background/90 p-1.5 text-destructive transition-colors hover:bg-background"
                            aria-label={messages.shop.removeImage}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{messages.shop.removeImage}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}

              {/* "+N more" indicator */}
              {images.length > MAX_VISIBLE && (
                <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-muted">
                  <span className="text-sm font-medium text-muted-foreground">
                    +{images.length - MAX_VISIBLE}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Add image button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setMediaModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {messages.shop.addImage}
        </Button>

        {/* Media modal — uses editor proxy to capture selected image URL */}
        <InsertMediaModal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor={editorProxy as any}
          open={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
        />
      </div>
    </CollapsibleCard>
  )
}
