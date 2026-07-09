import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { Button, Label } from '@agency/ui'
import { ImageOff } from 'lucide-react'
import { mediaKeys } from '@/features/media/queries'
import { getMediaItemsFn } from '@/features/media/server'
import type { MediaItemListItem } from '@/features/media/types'
import { createMediaProxyEditor } from '@/lib/utils/media-proxy'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { messages } from '@/lib/messages'

// Campaign logo picker. Mirrors BonusMediaField but SIMPLER: the brand logo is a
// bare URL (so_campaigns.brand.logo_url) — there is no media_asset_id to resolve.
// REUSES InsertMediaModal via the createMediaProxyEditor bridge (no real Tiptap
// Editor — see apps/cms/CLAUDE.md gotcha). The proxy's setImage fires ONLY for
// image picks (video/youtube proxy methods are no-ops), so images are preferred
// for free. A parallel media picker is intentionally NOT built.

interface LogoMediaFieldProps {
  /** Currently stored logo URL (brand.logo_url). */
  value: string | null
  /** Persist the picked URL (or null to clear) in the parent form. */
  onChange: (url: string | null) => void
}

export function LogoMediaField({ value, onChange }: LogoMediaFieldProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Same query key the modal uses (all items, no filter) → shared cache. Used
  // only to recover a friendly name for the preview label; the URL itself is the
  // source of truth, so an external URL not in the library still previews fine.
  const { data: mediaItems = [] } = useQuery<MediaItemListItem[]>({
    queryKey: mediaKeys.list(undefined),
    queryFn: () => getMediaItemsFn({ data: {} }) as Promise<MediaItemListItem[]>,
  })

  const proxy = createMediaProxyEditor((pickedUrl) => {
    onChange(pickedUrl)
    setModalOpen(false)
  })

  const matched = value ? mediaItems.find((item) => item.url === value) : null
  const label = matched?.name ?? value

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{messages.venture.brandLogoUrlLabel}</Label>

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            <Image
              src={value}
              alt={label ?? ''}
              layout="constrained"
              width={48}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-foreground">{label}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            {messages.venture.changeLogo}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onChange(null)}
          >
            {messages.venture.removeLogo}
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
          aria-label={messages.venture.selectLogo}
          className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/60"
        >
          <ImageOff className="h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{messages.venture.selectLogo}</span>
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
