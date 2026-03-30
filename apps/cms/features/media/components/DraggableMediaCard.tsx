'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@agency/ui'
import { GripVertical } from 'lucide-react'
import { MediaCard } from './MediaCard'
import type { MediaItemListItem } from '../types'

type DraggableMediaCardProps = {
  item: MediaItemListItem
  onPreview: (item: MediaItemListItem) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newName: string) => void
  selectable?: boolean
}

export function DraggableMediaCard({
  item,
  onPreview,
  onDelete,
  onRename,
  selectable,
}: DraggableMediaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `media-${item.id}`,
    data: { type: 'media-item', item },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'relative',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
    >
      {/* Drag handle — visible on hover, top-left corner */}
      {!selectable && (
        <button
          type="button"
          className="absolute left-1.5 top-1.5 z-10 rounded-md bg-background/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-foreground group-hover:opacity-100 [div:hover>&]:opacity-100 cursor-grab active:cursor-grabbing"
          aria-label={`Przeciągnij ${item.name}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <MediaCard
        item={item}
        onPreview={onPreview}
        onDelete={onDelete}
        onRename={onRename}
        selectable={selectable}
      />
    </div>
  )
}
