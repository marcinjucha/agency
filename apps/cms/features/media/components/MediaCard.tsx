'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Badge,
  Card,
  Input,
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
} from '@agency/ui'
import { Trash2, Video, Play, Image as ImageIcon } from 'lucide-react'
import type { MediaItemListItem } from '../types'
import { formatBytes } from '../utils'

type MediaCardProps = {
  item: MediaItemListItem
  onPreview: (item: MediaItemListItem) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newName: string) => void
  selectable?: boolean
}

function TypeBadge({ type }: { type: MediaItemListItem['type'] }) {
  if (type === 'image') return <Badge>Obraz</Badge>
  if (type === 'video') return <Badge variant="secondary">Wideo</Badge>
  if (type === 'youtube')
    return (
      <Badge variant="outline" className="text-orange-400 border-orange-400/50">
        YouTube
      </Badge>
    )
  if (type === 'instagram') return <Badge variant="outline">Instagram</Badge>
  if (type === 'tiktok') return <Badge variant="outline">TikTok</Badge>
  return <Badge variant="outline">Vimeo</Badge>
}

function Thumbnail({
  item,
  onClick,
}: {
  item: MediaItemListItem
  onClick: () => void
}) {
  const base =
    'relative aspect-square w-full overflow-hidden bg-muted cursor-pointer group'

  if (item.type === 'image') {
    return (
      <button
        type="button"
        className={base}
        onClick={onClick}
        aria-label={`Podgląd: ${item.name}`}
      >
        <img
          src={item.url}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20" />
      </button>
    )
  }

  if (item.type === 'youtube' && item.thumbnail_url) {
    return (
      <button
        type="button"
        className={base}
        onClick={onClick}
        aria-label={`Podgląd: ${item.name}`}
      >
        <img
          src={item.thumbnail_url}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors duration-200 group-hover:bg-black/40">
          <Play className="h-10 w-10 text-white drop-shadow-md" aria-hidden="true" />
        </div>
      </button>
    )
  }

  // vimeo, video, or youtube without thumbnail — placeholder
  const PlaceholderIcon = item.type === 'video' ? Video : Play

  return (
    <button
      type="button"
      className={base}
      onClick={onClick}
      aria-label={`Podgląd: ${item.name}`}
    >
      <div className="flex h-full w-full items-center justify-center bg-muted/60 transition-colors duration-200 group-hover:bg-muted/80">
        <PlaceholderIcon
          className="h-10 w-10 text-muted-foreground/50"
          aria-hidden="true"
        />
      </div>
    </button>
  )
}

function InlineName({
  name,
  onRename,
}: {
  name: string
  onRename?: (newName: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!onRename || !editing) {
    return (
      <p
        className="truncate text-sm font-medium text-foreground"
        role={onRename ? 'button' : undefined}
        tabIndex={onRename ? 0 : undefined}
        title={onRename ? 'Kliknij, aby zmienić nazwę' : undefined}
        onClick={() => onRename && setEditing(true)}
        onKeyDown={(e) => {
          if (onRename && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setEditing(true)
          }
        }}
      >
        {name}
      </p>
    )
  }

  function commit() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) {
      onRename!(trimmed)
    } else {
      setValue(name)
    }
    setEditing(false)
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { setValue(name); setEditing(false) }
      }}
      className="h-6 px-1 py-0 text-sm font-medium"
      aria-label="Zmień nazwę pliku"
    />
  )
}

export function MediaCard({ item, onPreview, onDelete, onRename, selectable }: MediaCardProps) {
  const size = formatBytes(item.size_bytes)

  return (
    <MediaCardInner
      item={item}
      size={size}
      onPreview={onPreview}
      onDelete={onDelete}
      onRename={onRename}
      selectable={selectable}
    />
  )
}

/** Inner card content — also used by DragOverlay */
export function MediaCardInner({
  item,
  size,
  onPreview,
  onDelete,
  onRename,
  selectable,
  isDragOverlay,
}: MediaCardProps & { size: string | null; isDragOverlay?: boolean }) {
  return (
    <Card
      className={[
        'group overflow-hidden flex flex-col',
        isDragOverlay ? 'opacity-80 shadow-lg ring-2 ring-accent/50 rotate-2' : '',
      ].join(' ')}
    >
      {/* Thumbnail */}
      <div className="relative">
        <Thumbnail item={item} onClick={() => onPreview(item)} />
        {/* Type badge — top-right overlay */}
        <div className="absolute right-2 top-2 pointer-events-none">
          <TypeBadge type={item.type} />
        </div>
        {/* Selection overlay — shown when in selectable mode */}
        {selectable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/40 pointer-events-none">
            <span className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Wybierz
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <InlineName
            name={item.name}
            onRename={!selectable && onRename ? (newName) => onRename(item.id, newName) : undefined}
          />
          {size && (
            <p className="text-xs text-muted-foreground">{size}</p>
          )}
        </div>

        {!selectable && !isDragOverlay && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
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
    </Card>
  )
}
