import { Tabs, TabsList, TabsTrigger } from '@agency/ui'
import { ImageIcon, Download } from 'lucide-react'
import { messages } from '@/lib/messages'

export const MEDIA_MODES = {
  inline: 'inline',
  downloadable: 'downloadable',
} as const

export type MediaMode = (typeof MEDIA_MODES)[keyof typeof MEDIA_MODES]

type MediaModeTabsProps = {
  value: MediaMode
  onChange: (value: MediaMode) => void
}

/**
 * Top-level mode switcher for the Media Library.
 *
 * Two mutually-exclusive scopes:
 *  - inline: media meant to be displayed inline (is_downloadable=false)
 *  - downloadable: media meant for download (is_downloadable=true)
 *
 * This is a CONCEPTUAL switch above type/folder filters — it scopes everything
 * below (upload zone, type filter, folder grid). Visual weight is intentionally
 * heavier than the inner type-filter Tabs so users see this as the top-level
 * decision, not a chip-level filter.
 */
export function MediaModeTabs({ value, onChange }: MediaModeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as MediaMode)}>
      <TabsList
        className="h-auto bg-card border border-border p-1"
        aria-label={messages.media.libraryTitle}
      >
        <TabsTrigger
          value={MEDIA_MODES.inline}
          className="flex items-start gap-3 px-4 py-2.5 data-[state=active]:bg-background"
        >
          <ImageIcon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">{messages.media.modeAll}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              {messages.media.modeAllDescription}
            </span>
          </div>
        </TabsTrigger>
        <TabsTrigger
          value={MEDIA_MODES.downloadable}
          className="flex items-start gap-3 px-4 py-2.5 data-[state=active]:bg-background"
        >
          <Download className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">{messages.media.modeDownloadable}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              {messages.media.modeDownloadableDescription}
            </span>
          </div>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
