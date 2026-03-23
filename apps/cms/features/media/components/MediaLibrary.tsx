'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton, Card } from '@agency/ui'
import { Image as ImageIcon } from 'lucide-react'
import { mediaKeys, getMediaItems } from '../queries'
import { deleteMediaItem } from '../actions'
import { ErrorState, EmptyState } from '@/components/shared'
import { MediaUploadZone } from './MediaUploadZone'
import { MediaTypeFilter } from './MediaTypeFilter'
import { MediaGrid } from './MediaGrid'
import { MediaPreviewDialog } from './MediaPreviewDialog'
import type { MediaType, MediaItemListItem, MediaItem } from '../types'

// Inline grid skeleton — matches the media grid layout
function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="px-3 py-2 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function MediaLibrary() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<MediaType | undefined>(undefined)
  const [previewItem, setPreviewItem] = useState<MediaItemListItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: mediaKeys.list({ type: typeFilter }),
    queryFn: () => getMediaItems({ type: typeFilter }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteMediaItem(id)
      if (!result.success) throw new Error(result.error ?? 'Nie udało się usunąć pliku')
      return result
    },
    onSuccess: () => {
      setDeleteError(null)
      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
    },
    onError: (error: Error) => {
      setDeleteError(error.message)
    },
  })

  function handlePreview(item: MediaItemListItem) {
    setPreviewItem(item)
    setPreviewOpen(true)
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id)
  }

  function handleUploadComplete() {
    queryClient.invalidateQueries({ queryKey: mediaKeys.all })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-foreground">Biblioteka mediów</h1>

      {/* Upload zone */}
      <MediaUploadZone onUploadComplete={handleUploadComplete} />

      {/* Type filter */}
      <MediaTypeFilter value={typeFilter} onChange={setTypeFilter} />

      {/* Delete error */}
      {deleteError && (
        <div className="rounded border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <MediaGridSkeleton />
      ) : error ? (
        <ErrorState
          title="Błąd ładowania mediów"
          message={error instanceof Error ? error.message : 'Wystąpił błąd'}
          onRetry={() => refetch()}
          variant="card"
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Brak mediów"
          description="Prześlij swoje pierwsze media używając strefy powyżej."
          variant="card"
        />
      ) : (
        <MediaGrid
          items={data}
          onPreview={handlePreview}
          onDelete={handleDelete}
        />
      )}

      {/* Preview dialog — rendered at root level.
          MediaItemListItem contains all fields used by the preview dialog;
          cast to MediaItem to satisfy the prop type. */}
      <MediaPreviewDialog
        item={previewItem as unknown as MediaItem | null}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
