import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { Button, Label } from '@agency/ui'
import { FileText, ImageOff } from 'lucide-react'
import { mediaKeys } from '@/features/media/queries'
import { getMediaItemsFn } from '@/features/media/server'
import type { MediaItemListItem } from '@/features/media/types'
import { createMediaProxyEditor } from '@/lib/utils/media-proxy'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { messages } from '@/lib/messages'

// File-bonus asset picker. REUSES InsertMediaModal via the createMediaProxyEditor
// bridge (no real Tiptap Editor needed — see apps/cms/CLAUDE.md gotcha). The modal
// forwards only the selected asset URL through the proxy; we resolve the matching
// media_items row (by url) to recover its id for so_bonuses.media_asset_id.
// A parallel media picker is intentionally NOT built.

interface BonusMediaFieldProps {
  /** Currently stored media_asset_id (so_bonuses.media_asset_id). */
  mediaAssetId: string | null
  /** Currently stored public url (so_bonuses.url). */
  url: string | null
  /** Persist both the resolved media id and its url in the parent form. */
  onChange: (mediaAssetId: string | null, url: string | null) => void
}

export function BonusMediaField({ mediaAssetId, url, onChange }: BonusMediaFieldProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Same query key the modal uses (all items, no filter) → shared cache.
  const { data: mediaItems = [] } = useQuery<MediaItemListItem[]>({
    queryKey: mediaKeys.list(undefined),
    queryFn: () => getMediaItemsFn({ data: {} }) as Promise<MediaItemListItem[]>,
  })

  // Resolve the id for the URL the proxy hands back (the modal only exposes url).
  const proxy = createMediaProxyEditor((pickedUrl) => {
    const match = mediaItems.find((item) => item.url === pickedUrl)
    onChange(match?.id ?? null, pickedUrl)
    setModalOpen(false)
  })

  // Prefer the persisted id; fall back to url match so an existing bonus still
  // renders a preview even if the id lookup misses.
  const selected =
    mediaItems.find((item) => item.id === mediaAssetId) ??
    mediaItems.find((item) => item.url === url) ??
    null

  const previewUrl = selected?.thumbnail_url ?? (selected?.type === 'image' ? selected.url : null)

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{messages.venture.bonusAssetLabel}</Label>

      {selected ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={selected.name}
                layout="constrained"
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-foreground">{selected.name}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            {messages.venture.changeAsset}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onChange(null, null)}
          >
            {messages.venture.removeAsset}
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setModalOpen(true)
            }
          }}
          aria-label={messages.venture.selectAsset}
          className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/60"
        >
          <ImageOff className="h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{messages.venture.selectAsset}</span>
        </div>
      )}

      <InsertMediaModal
        editor={proxy as never}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
