

import { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { TiptapEditor as BaseTiptapEditor } from '../../editor/components/TiptapEditor'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { baseExtensions } from '../../editor/extensions'
import type { TiptapContent } from '../../editor/types'

interface ProductTiptapEditorProps {
  content: TiptapContent
  onChange: (content: TiptapContent) => void
  placeholder?: string
}

/**
 * Shop product TiptapEditor — wraps the base editor with
 * InsertMediaModal for inline image insertion.
 * Uses baseExtensions only (no video embeds needed for product descriptions).
 */
export function ProductTiptapEditor({ content, onChange, placeholder }: ProductTiptapEditorProps) {
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)

  const handleEditorReady = useCallback((e: Editor) => {
    setEditor(e)
  }, [])

  return (
    <BaseTiptapEditor
      content={content}
      onChange={onChange}
      placeholder={placeholder}
      extensions={baseExtensions}
      onOpenMediaModal={() => setMediaModalOpen(true)}
      onEditorReady={handleEditorReady}
      mediaModal={
        <InsertMediaModal
          editor={editor}
          open={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
        />
      }
    />
  )
}
