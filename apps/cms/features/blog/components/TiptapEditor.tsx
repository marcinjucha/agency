

import { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { TiptapEditor as BaseTiptapEditor } from '../../editor/components/TiptapEditor'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { InsertDownloadableAssetModal } from './InsertDownloadableAssetModal'
import { editorExtensions } from '../extensions'
import { EMBED_DIMENSIONS } from '../extensions/constants'
import { coerceAssetType } from '../extensions/downloadable-asset-html'
import { getMediaTypeFromMime } from '@/features/media/utils'
import type { MediaItemListItem } from '@/features/media/types'
import type { TiptapContent } from '../../editor/types'
import { messages } from '@/lib/messages'

interface BlogTiptapEditorProps {
  content: TiptapContent
  onChange: (content: TiptapContent) => void
  placeholder?: string
}

/**
 * Blog-specific TiptapEditor — wraps the base editor with media extensions,
 * InsertMediaModal, InsertDownloadableAssetModal, and embed dimension CSS.
 *
 * The download modal (AAA-T-110 iter 4) lets authors pick a downloadable
 * media item and inserts it as a `downloadableAsset` Tiptap node. The modal
 * is editor-agnostic — selection routes back here so we can call
 * editor.chain().setDownloadableAsset() from a single place.
 */
export function TiptapEditor({ content, onChange, placeholder }: BlogTiptapEditorProps) {
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)

  const handleEditorReady = useCallback((e: Editor) => {
    setEditor(e)
  }, [])

  const handleSelectDownloadable = useCallback(
    (item: MediaItemListItem) => {
      if (!editor) return
      // Map the media row's MediaType (8 values incl. embed types) onto the
      // narrower DownloadableAssetType (4 values). For non-mappable types we
      // fall back through coerceAssetType → 'document', so the inserted node
      // still renders even on data drift (e.g. legacy rows without a clean type).
      const detectedType = getMediaTypeFromMime(item.mime_type ?? '')
      const assetType = coerceAssetType(detectedType ?? item.type)

      editor
        .chain()
        .focus()
        .setDownloadableAsset({
          mediaItemId: item.id,
          url: item.url,
          name: item.name,
          mimeType: item.mime_type ?? '',
          sizeBytes: item.size_bytes,
          assetType,
        })
        .run()

      setDownloadModalOpen(false)
    },
    [editor],
  )

  return (
    <BaseTiptapEditor
      content={content}
      onChange={onChange}
      placeholder={placeholder}
      extensions={editorExtensions}
      onOpenMediaModal={() => setMediaModalOpen(true)}
      onOpenDownloadModal={() => setDownloadModalOpen(true)}
      downloadModalLabel={messages.blog.toolbar.insertDownload}
      embedDimensions={EMBED_DIMENSIONS}
      onEditorReady={handleEditorReady}
      mediaModal={
        <InsertMediaModal
          editor={editor}
          open={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
        />
      }
      downloadModal={
        <InsertDownloadableAssetModal
          open={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          onSelect={handleSelectDownloadable}
        />
      }
    />
  )
}
