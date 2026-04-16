

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  Skeleton,
  Card,
  Button,
  Input,
  ErrorState,
  EmptyState,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@agency/ui'
import { Image as ImageIcon, Link2, Loader2 } from 'lucide-react'
import { mediaKeys } from '../queries'
import {
  deleteMediaItemFn,
  createMediaItemFn,
  updateMediaItemFn,
  moveMediaItemFn,
  getMediaItemsFn,
  getMediaFoldersFn,
} from '../server'
import { extractVideoId, generateThumbnailUrl, buildEmbedUrl, fetchVimeoThumbnail } from '@/lib/video-utils'
import { MediaUploadZone } from './MediaUploadZone'
import { MediaTypeFilter } from './MediaTypeFilter'
import { MediaGrid } from './MediaGrid'
import { MediaPreviewDialog } from './MediaPreviewDialog'
import { MediaCardInner } from './MediaCard'
import { FolderTree } from './FolderTree'
import { FolderCreateDialog } from './FolderCreateDialog'
import { folderKeys } from '../folder-queries'
import { deleteFolderFn } from '../server'
import { buildFolderTree } from '../folder-types'
import { formatBytes } from '../utils'
import type { FolderTreeNode } from '../folder-types'
import type { MediaType, MediaItemListItem, MediaItem } from '../types'
import { messages } from '@/lib/messages'

// Inline grid skeleton -- matches the media grid layout
function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          {/* Image area — matches aspect-[16/7] used in MediaGrid */}
          <Skeleton className="aspect-[16/7] w-full" />
          {/* Footer — matches p-2.5 in MediaGridRow */}
          <div className="p-2.5 space-y-1.5">
            {/* Name row: text + pencil icon placeholder */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-3 shrink-0" />
            </div>
            {/* Bottom row: type badge + size + delete icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-7 w-7 shrink-0" />
            </div>
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

  // Folder state
  // undefined = all media, null = unsorted, string = specific folder
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderDialogParentId, setFolderDialogParentId] = useState<string | undefined>()
  const [folderToRename, setFolderToRename] = useState<FolderTreeNode | undefined>()
  const [folderToDelete, setFolderToDelete] = useState<FolderTreeNode | null>(null)

  // Folder data
  const { data: folders } = useQuery({
    queryKey: folderKeys.list,
    queryFn: () => getMediaFoldersFn(),
  })

  const folderTree = folders ? buildFolderTree(folders) : []

  // Media items -- filtered by folder_id
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: mediaKeys.list({ type: typeFilter, folder_id: selectedFolderId }),
    queryFn: () => getMediaItemsFn({ data: { type: typeFilter, folder_id: selectedFolderId } }),
  })

  // All items query (for total count in sidebar)
  const { data: allItems } = useQuery({
    queryKey: mediaKeys.list({ type: typeFilter }),
    queryFn: () => getMediaItemsFn({ data: { type: typeFilter } }),
  })

  // Unsorted items query (for unsorted count in sidebar)
  const { data: unsortedItems } = useQuery({
    queryKey: mediaKeys.list({ type: typeFilter, folder_id: null }),
    queryFn: () => getMediaItemsFn({ data: { type: typeFilter, folder_id: null } }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteMediaItemFn({ data: { id } })
      if (!result.success) throw new Error(result.error ?? messages.media.deleteFailed)
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

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFolderFn({ data: { id } })
      if (!result.success) throw new Error(result.error ?? messages.media.deleteFolderFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      // If deleted folder was selected, go back to all
      setSelectedFolderId(undefined)
      setFolderToDelete(null)
    },
  })

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await updateMediaItemFn({ data: { id, data: { name } } })
      if (!result.success) throw new Error(result.error ?? messages.media.renameFailed)
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

  // Folder handlers
  function handleCreateFolder(parentId?: string) {
    setFolderToRename(undefined)
    setFolderDialogParentId(parentId)
    setFolderDialogOpen(true)
  }

  function handleRenameFolder(folder: FolderTreeNode) {
    setFolderDialogParentId(undefined)
    setFolderToRename(folder)
    setFolderDialogOpen(true)
  }

  function handleDeleteFolder(folder: FolderTreeNode) {
    setFolderToDelete(folder)
  }

  function handleCloseFolderDialog() {
    setFolderDialogOpen(false)
    setFolderToRename(undefined)
    setFolderDialogParentId(undefined)
  }

  // --- Drag-and-drop ---
  const [draggedItem, setDraggedItem] = useState<MediaItemListItem | null>(null)

  // Require 8px movement before starting drag — prevents accidental drags on click
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const sensors = useSensors(pointerSensor)

  const moveMutation = useMutation({
    mutationFn: async ({ itemId, folderId }: { itemId: string; folderId: string | null }) => {
      const result = await moveMediaItemFn({ data: { itemId, folderId } })
      if (!result.success) throw new Error(result.error ?? messages.media.moveFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      queryClient.invalidateQueries({ queryKey: folderKeys.all })
    },
  })

  function handleDragStart(event: DragStartEvent) {
    const { item } = event.active.data.current as { type: string; item: MediaItemListItem }
    setDraggedItem(item)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedItem(null)

    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as { type: string; item: MediaItemListItem }
    const overData = over.data.current as { type: string; folderId: string | null } | undefined

    // Only handle drops on folder targets
    if (!overData || overData.type !== 'folder') return

    const itemId = activeData.item.id
    const targetFolderId = overData.folderId

    // Don't move if already in that folder
    if (activeData.item.folder_id === targetFolderId) return

    moveMutation.mutate({ itemId, folderId: targetFolderId })
  }

  function handleDragCancel() {
    setDraggedItem(null)
  }

  async function handleAddSocialUrl() {
    if (!socialUrl.trim()) return
    setSocialError(null)

    const parsed = extractVideoId(socialUrl.trim())
    if (!parsed) {
      setSocialError(messages.media.invalidSocialLink)
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
      const result = await createMediaItemFn({
        data: {
          name: `${parsed.platform}-${parsed.id}`,
          type: parsed.platform,
          url: embedUrl,
          s3_key: null,
          mime_type: null,
          size_bytes: null,
          thumbnail_url: thumbnailUrl,
          folder_id: typeof selectedFolderId === 'string' ? selectedFolderId : null,
        },
      })

      if (!result.success) throw new Error(result.error ?? messages.media.saveFailed)

      queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      setSocialUrl('')
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : messages.media.unknownError)
    } finally {
      setIsAddingSocial(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {/* Page header */}
        <h1 className="text-2xl font-bold text-foreground">{messages.media.libraryTitle}</h1>

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
                placeholder={messages.media.socialPlaceholder}
                className="pl-9"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSocialUrl() } }}
              />
            </div>
            <Button onClick={handleAddSocialUrl} disabled={!socialUrl.trim() || isAddingSocial}>
              {isAddingSocial ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{messages.media.adding}</> : messages.media.addButton}
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

        {/* Two-column layout: sidebar + content */}
        <div className="flex gap-6">
          {/* Folder sidebar -- hidden on small screens */}
          <div className="hidden lg:block">
            <FolderTree
              tree={folderTree}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              totalCount={allItems?.length}
              unsortedCount={unsortedItems?.length}
            />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <MediaGridSkeleton />
            ) : error ? (
              <ErrorState
                title={messages.media.loadFailed}
                message={error instanceof Error ? error.message : messages.common.errorOccurred}
                onRetry={() => refetch()}
                variant="card"
              />
            ) : !data || data.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title={messages.media.noMedia}
                description={messages.media.noMediaDescription}
                variant="card"
              />
            ) : (
              <MediaGrid
                items={data}
                onPreview={handlePreview}
                onDelete={handleDelete}
                onRename={handleRename}
                draggable
              />
            )}
          </div>
        </div>

        {/* Preview dialog */}
        <MediaPreviewDialog
          item={previewItem as unknown as MediaItem | null}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />

        {/* Folder create/rename dialog */}
        <FolderCreateDialog
          open={folderDialogOpen}
          onClose={handleCloseFolderDialog}
          parentId={folderDialogParentId}
          existingFolder={folderToRename}
        />

        {/* Folder delete confirmation */}
        <AlertDialog
          open={!!folderToDelete}
          onOpenChange={(v) => { if (!v) setFolderToDelete(null) }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{messages.media.deleteFolder}</AlertDialogTitle>
              <AlertDialogDescription>
                {messages.media.confirmDeleteFolder}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (folderToDelete) {
                    deleteFolderMutation.mutate(folderToDelete.id)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteFolderMutation.isPending ? messages.common.loading : messages.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Drag overlay — floating preview card that follows cursor */}
      <DragOverlay dropAnimation={null}>
        {draggedItem ? (
          <div className="w-40">
            <MediaCardInner
              item={draggedItem}
              size={formatBytes(draggedItem.size_bytes)}
              onPreview={() => {}}
              onDelete={() => {}}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
