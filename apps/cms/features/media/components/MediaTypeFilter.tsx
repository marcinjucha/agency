import { Tabs, TabsList, TabsTrigger } from '@agency/ui'
import { DOWNLOADABLE_MEDIA_TYPES, type MediaType } from '../types'
import type { MediaMode } from './MediaModeTabs'
import { messages } from '@/lib/messages'

type MediaTypeFilterProps = {
  value: MediaType | undefined
  onChange: (value: MediaType | undefined) => void
  /** Restricts the visible type pills to those relevant for the active library mode. */
  mode?: MediaMode
}

/**
 * Type-relevance matrix per library mode.
 *  - inline: image + video + social embeds (what you'd embed in a blog post)
 *  - downloadable: pulled from DOWNLOADABLE_MEDIA_TYPES (single source of truth in types.ts) —
 *    social embeds are URLs, not files, so they cannot be downloaded
 */
const TYPES_BY_MODE: Record<MediaMode, readonly MediaType[]> = {
  inline: ['image', 'video', 'youtube', 'vimeo', 'instagram', 'tiktok'],
  downloadable: DOWNLOADABLE_MEDIA_TYPES,
}

// Pulls labels from the single source of truth in messages.media.fileTypes.
// No parallel `Record<MediaType, string>` to drift with — adding a new type
// means a single edit in messages.ts.
export function MediaTypeFilter({ value, onChange, mode = 'inline' }: MediaTypeFilterProps) {
  const tabValue = value ?? 'all'
  const visibleTypes = TYPES_BY_MODE[mode]

  return (
    <Tabs
      value={tabValue}
      onValueChange={(v) => onChange(v === 'all' ? undefined : (v as MediaType))}
    >
      <TabsList>
        <TabsTrigger value="all">{messages.media.fileTypes.all}</TabsTrigger>
        {visibleTypes.map((t) => (
          <TabsTrigger key={t} value={t}>
            {messages.media.fileTypes[t]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
