import type { MediaItemListItem } from '../types'
import { MediaCard } from './MediaCard'

type MediaGridProps = {
  items: MediaItemListItem[]
  onPreview: (item: MediaItemListItem) => void
  onDelete: (id: string) => void
}

export function MediaGrid({ items, onPreview, onDelete }: MediaGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
