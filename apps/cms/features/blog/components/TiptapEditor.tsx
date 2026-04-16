

import { useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { TiptapEditor as BaseTiptapEditor } from '../../editor/components/TiptapEditor'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { editorExtensions } from '../extensions'
import { EMBED_DIMENSIONS } from '../extensions/constants'
import type { TiptapContent } from '../../editor/types'

interface BlogTiptapEditorProps {
  content: TiptapContent
  onChange: (content: TiptapContent) => void
  placeholder?: string
}

/**
 * Blog-specific TiptapEditor — wraps the base editor with media extensions,
 * InsertMediaModal, and embed dimension CSS.
 */
export function TiptapEditor({ content, onChange, placeholder }: BlogTiptapEditorProps) {
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
      extensions={editorExtensions}
      onOpenMediaModal={() => setMediaModalOpen(true)}
      embedDimensions={EMBED_DIMENSIONS}
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
