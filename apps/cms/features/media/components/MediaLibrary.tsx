'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton, Card, Button, Input, ErrorState, EmptyState } from '@agency/ui'
import { Image as ImageIcon, Link2, Loader2 } from 'lucide-react'
import { mediaKeys, getMediaItems } from '../queries'
import { deleteMediaItem, createMediaItem, updateMediaItem } from '../actions'
import { extractVideoId, generateThumbnailUrl, buildEmbedUrl } from '@/lib/video-utils'
import { fetchVimeoThumbnail } from '@/lib/fetch-vimeo-thumbnail'
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
  const [socialUrl, setSocialUrl] = useState('')
  const [socialError, setSocialError] = useState<string | null>(null)
  const [isAddingSocial, setIsAddingSocial] = useState(false)

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

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await updateMediaItem(id, { name })
      if (!result.success) throw new Error(result.error ?? 'Nie udalo sie zmienic nazwy')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
    },
  })

  function handleRename(id: string, newName: string) {
    renameMutation.mutate({ id, name: newName })
  }

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

  async function handleAddSocialUrl() {
    if (!socialUrl.trim()) return
    setSocialError(null)

    const parsed = extractVideoId(socialUrl.trim())
    if (!parsed) {
      setSocialError('Nieprawidlowy link. Obslugiwane: YouTube, Vimeo, Instagram, TikTok.')
      return
    }

    setIsAddingSocial(true)
    try {
      let thumbnailUrl: string | null = null
      if (parsed.platform === 'youtube') {
        thumbnailUrl = generateThumbnailUrl('youtube', parsed.id)
      } else if (parsed.platform === 'vimeo') {
        thumbnailUrl = await fetchVimeoThumbnail(socialUrl.trim())
      }

      const embedUrl = buildEmbedUrl(parsed.platform, parsed.id)
      const result = await createMediaItem({
        name: `${parsed.platform}-${parsed.id}`,
        type: parsed.platform,
        url: embedUrl,
        s3_key: null,
        mime_type: null,
        size_bytes: null,
        thumbnail_url: thumbnailUrl,
      })

      if (!result.success) throw new Error(result.error ?? 'Blad zapisu')

      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      setSocialUrl('')
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : 'Nieznany blad')
    } finally {
      setIsAddingSocial(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-foreground">Biblioteka mediów</h1>

      {/* Upload zone */}
      <MediaUploadZone onUploadComplete={handleUploadComplete} />

      {/* Social media URL input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={socialUrl}
              onChange={(e) => { setSocialUrl(e.target.value); setSocialError(null) }}
              placeholder="Wklej link YouTube, Vimeo, Instagram lub TikTok"
              className="pl-9"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSocialUrl() } }}
            />
          </div>
          <Button onClick={handleAddSocialUrl} disabled={!socialUrl.trim() || isAddingSocial}>
            {isAddingSocial ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Dodawanie...</> : 'Dodaj'}
          </Button>
        </div>
        {socialError && <p className="text-xs text-destructive" role="alert">{socialError}</p>}
      </div>

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
          onRename={handleRename}
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
