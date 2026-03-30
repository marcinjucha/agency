import type { MediaItemListItem } from '../types'
import { MediaCard } from './MediaCard'
import { DraggableMediaCard } from './DraggableMediaCard'

type MediaGridProps = {
  items: MediaItemListItem[]
  onPreview: (item: MediaItemListItem) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newName: string) => void
  onSelect?: (item: MediaItemListItem) => void
  draggable?: boolean
}

export function MediaGrid({ items, onPreview, onDelete, onRename, onSelect, draggable }: MediaGridProps) {
  const selectable = !!onSelect
  const CardComponent = draggable && !selectable ? DraggableMediaCard : MediaCard

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <CardComponent
          key={item.id}
          item={item}
          onPreview={selectable ? () => onSelect(item) : onPreview}
          onDelete={onDelete}
          onRename={onRename}
          selectable={selectable}
        />
      ))}
    </div>
  )
}
