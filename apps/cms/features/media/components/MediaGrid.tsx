'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Badge,
  Card,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Button,
  Input,
} from '@agency/ui'
import { Trash2, Video, Play, Image as ImageIcon, Edit2 } from 'lucide-react'
import type { MediaItemListItem } from '../types'
import { formatBytes } from '../utils'

type MediaGridProps = {
  items: MediaItemListItem[]
  onPreview: (item: MediaItemListItem) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newName: string) => void
  onSelect?: (item: MediaItemListItem) => void
  draggable?: boolean
}

function TypeLabel({ type }: { type: MediaItemListItem['type'] }) {
  if (type === 'image') return <Badge>Obraz</Badge>
  if (type === 'video') return <Badge variant="secondary">Wideo</Badge>
  if (type === 'youtube')
    return <Badge variant="outline" className="text-orange-400 border-orange-400/50">YouTube</Badge>
  if (type === 'instagram') return <Badge variant="outline">Instagram</Badge>
  if (type === 'tiktok') return <Badge variant="outline">TikTok</Badge>
  return <Badge variant="outline">Vimeo</Badge>
}

function CardThumbnail({
  item,
  onClick,
}: {
  item: MediaItemListItem
  onClick: () => void
}) {
  const base =
    'relative aspect-[16/7] w-full overflow-hidden bg-muted cursor-pointer group'

  if (item.type === 'image') {
    return (
      <button type="button" className={base} onClick={onClick} aria-label={`Podgląd: ${item.name}`}>
        <img
          src={item.url}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </button>
    )
  }

  if (item.type === 'youtube' && item.thumbnail_url) {
    return (
      <button type="button" className={base} onClick={onClick} aria-label={`Podgląd: ${item.name}`}>
        <img
          src={item.thumbnail_url}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-5 w-5 text-white drop-shadow-md" aria-hidden="true" />
        </div>
      </button>
    )
  }

  const PlaceholderIcon = item.type === 'video' ? Video : item.type === 'image' ? ImageIcon : Play

  return (
    <button type="button" className={base} onClick={onClick} aria-label={`Podgląd: ${item.name}`}>
      <div className="flex h-full w-full items-center justify-center bg-muted/60">
        <PlaceholderIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
      </div>
    </button>
  )
}

type MediaGridRowProps = {
  item: MediaItemListItem
  onPreview: (item: MediaItemListItem) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newName: string) => void
  selectable?: boolean
  draggable?: boolean
}

function MediaGridRow({ item, onPreview, onDelete, onRename, selectable }: MediaGridRowProps) {
  const size = formatBytes(item.size_bytes)
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(item.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitRename() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== item.name && onRename) {
      onRename(item.id, trimmed)
    } else {
      setNameValue(item.name)
    }
    setEditing(false)
  }

  return (
    <Card className="group overflow-hidden">
      {/* Thumbnail — aspect-square, full card width */}
      <CardThumbnail item={item} onClick={() => onPreview(item)} />

      {/* File info below thumbnail */}
      <div className="p-2.5">
        {/* Filename row: inline edit or static + pencil */}
        {editing ? (
          <Input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitRename() }
              if (e.key === 'Escape') { setNameValue(item.name); setEditing(false) }
            }}
            className="h-6 px-1 py-0 text-sm font-medium"
            aria-label="Zmień nazwę pliku"
          />
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            <p
              className={`line-clamp-2 text-sm font-medium leading-snug text-foreground flex-1 min-w-0${!selectable && onRename ? ' cursor-pointer hover:text-foreground/80' : ''}`}
              onClick={!selectable && onRename ? () => setEditing(true) : undefined}
              role={!selectable && onRename ? 'button' : undefined}
              tabIndex={!selectable && onRename ? 0 : undefined}
              title={!selectable && onRename ? 'Kliknij, aby zmienić nazwę' : undefined}
              onKeyDown={!selectable && onRename ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true) } } : undefined}
            >
              {item.name}
            </p>
            {!selectable && onRename && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Zmień nazwę"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              >
                <Edit2 className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TypeLabel type={item.type} />
            {size && (
              <span className="text-xs text-muted-foreground">{size}</span>
            )}
          </div>

          {/* Delete button */}
          {!selectable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  aria-label={`Usuń ${item.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć plik?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ten plik może być używany w postach. Na pewno chcesz go usunąć?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(item.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  )
}

export function MediaGrid({ items, onPreview, onDelete, onRename, onSelect, draggable }: MediaGridProps) {
  const selectable = !!onSelect

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <MediaGridRow
          key={item.id}
          item={item}
          onPreview={selectable ? () => onSelect!(item) : onPreview}
          onDelete={onDelete}
          onRename={onRename}
          selectable={selectable}
          draggable={draggable && !selectable}
        />
      ))}
    </div>
  )
}
