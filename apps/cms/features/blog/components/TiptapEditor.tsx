'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline, Strikethrough, Heading2, Link } from 'lucide-react'
import { Button } from '@agency/ui'
import type { TiptapContent } from '../types'
import { EditorToolbar } from './EditorToolbar'
import { InsertMediaModal } from './InsertMediaModal'
import { editorExtensions } from '../extensions'
import { EMBED_DIMENSIONS } from '../extensions/constants'

interface TiptapEditorProps {
  content: TiptapContent
  onChange: (content: TiptapContent) => void
  placeholder?: string
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Zacznij pisac artykul...',
}: TiptapEditorProps) {
  const [mediaModalOpen, setMediaModalOpen] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...editorExtensions,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON() as TiptapContent)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content outline-none',
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const hasMedia = Array.from(files).some(
          (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
        )
        if (!hasMedia) return false
        event.preventDefault()
        setMediaModalOpen(true)
        return true
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            setMediaModalOpen(true)
            return true
          }
        }
        return false
      },
    },
  })

  return (
    <div className="tiptap-editor overflow-clip rounded-lg border border-border bg-background shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring">
      {/* Sticky toolbar — offset below BlogPostEditor's top bar (~61px) */}
      <div className="sticky top-[61px] z-10 bg-background">
        <EditorToolbar editor={editor} onOpenMediaModal={() => setMediaModalOpen(true)} />
      </div>

      {/* Bubble menu — appears on text selection */}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Pogrubienie"
          >
            <Bold className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Kursywa"
          >
            <Italic className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Podkreslenie"
          >
            <Underline className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Przekreslenie"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </BubbleButton>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Naglowek"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => {
              const url = window.prompt('URL:')
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }}
            active={editor.isActive('link')}
            title="Link"
          >
            <Link className="h-3.5 w-3.5" />
          </BubbleButton>
        </BubbleMenu>
      )}

      {/* Editor content area */}
      <div className="min-h-[400px] px-8 py-6">
        <EditorContent editor={editor} />
      </div>

      {/* Insert Media Modal */}
      <InsertMediaModal
        editor={editor}
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
      />

      {/* Prose styles scoped to this editor */}
      <style>{`
        .tiptap-editor-content {
          min-height: 360px;
        }

        /* Placeholder */
        .tiptap-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--color-muted-foreground, #52525b);
          opacity: 0.5;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }

        /* Typography base */
        .tiptap-editor-content {
          font-size: 1.0625rem;
          line-height: 1.75;
          color: var(--color-foreground);
        }

        /* Headings */
        .tiptap-editor-content h1 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          letter-spacing: -0.025em;
        }

        .tiptap-editor-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }

        .tiptap-editor-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }

        /* First element — no extra top margin */
        .tiptap-editor-content > :first-child {
          margin-top: 0;
        }

        /* Paragraphs */
        .tiptap-editor-content p {
          margin-bottom: 1rem;
        }

        /* Links */
        .tiptap-editor-content a {
          color: var(--color-primary);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.15s;
        }

        .tiptap-editor-content a:hover {
          opacity: 0.8;
        }

        /* Lists */
        .tiptap-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .tiptap-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .tiptap-editor-content li {
          margin-bottom: 0.375rem;
        }

        .tiptap-editor-content li p {
          margin-bottom: 0.25rem;
        }

        /* Blockquote */
        .tiptap-editor-content blockquote {
          border-left: 3px solid var(--color-border);
          padding-left: 1.25rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: var(--color-muted-foreground);
        }

        /* Code blocks */
        .tiptap-editor-content pre {
          background: var(--color-muted, #27272a);
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
          overflow-x: auto;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .tiptap-editor-content pre code {
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace;
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }

        /* Inline code */
        .tiptap-editor-content code {
          background: var(--color-muted, #27272a);
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          font-size: 0.875em;
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace;
        }

        /* Horizontal rule */
        .tiptap-editor-content hr {
          border: none;
          border-top: 1px solid var(--color-border);
          margin: 2rem 0;
        }

        /* Images */
        .tiptap-editor-content img {
          border-radius: 0.5rem;
          max-width: 100%;
          height: auto;
          margin: 1.5rem auto;
          display: block;
        }

        /* Text alignment */
        .tiptap-editor-content [style*="text-align: center"] {
          text-align: center;
        }

        .tiptap-editor-content [style*="text-align: right"] {
          text-align: right;
        }

        /* Bold / italic / underline / strikethrough */
        .tiptap-editor-content strong {
          font-weight: 600;
        }

        .tiptap-editor-content em {
          font-style: italic;
        }

        .tiptap-editor-content u {
          text-underline-offset: 3px;
        }

        .tiptap-editor-content s {
          text-decoration: line-through;
          opacity: 0.7;
        }

        .tiptap-editor-content video {
          max-width: 100%;
          border-radius: 0.5rem;
          margin: 1.5rem auto;
          display: block;
        }

        .tiptap-editor-content iframe {
          width: 100%;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          border: none;
        }

        .tiptap-editor-content iframe.youtube-embed,
        .tiptap-editor-content iframe.vimeo-embed {
          aspect-ratio: 16/9;
        }

        .tiptap-editor-content iframe.instagram-embed {
          max-width: ${EMBED_DIMENSIONS.instagram.maxWidth}px;
          min-height: ${EMBED_DIMENSIONS.instagram.minHeight}px;
          height: ${EMBED_DIMENSIONS.instagram.height}px;
          margin-left: auto;
          margin-right: auto;
          display: block;
          background: #000;
        }

        .tiptap-editor-content iframe.tiktok-embed {
          max-width: ${EMBED_DIMENSIONS.tiktok.maxWidth}px;
          min-height: ${EMBED_DIMENSIONS.tiktok.minHeight}px;
          height: ${EMBED_DIMENSIONS.tiktok.height}px;
          margin-left: auto;
          margin-right: auto;
          display: block;
          background: #000;
        }
      `}</style>
    </div>
  )
}

function BubbleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 rounded-md ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  )
}
