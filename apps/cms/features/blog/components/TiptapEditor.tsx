'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExtension from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import type { TiptapContent } from '../types'
import { EditorToolbar } from './EditorToolbar'

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
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full mx-auto' },
      }),
      Placeholder.configure({ placeholder }),
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON() as TiptapContent)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content outline-none',
      },
    },
  })

  return (
    <div className="tiptap-editor overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10">
        <EditorToolbar editor={editor} />
      </div>

      {/* Editor content area */}
      <div className="min-h-[400px] px-8 py-6">
        <EditorContent editor={editor} />
      </div>

      {/* Prose styles scoped to this editor */}
      <style>{`
        .tiptap-editor-content {
          min-height: 360px;
        }

        /* Placeholder */
        .tiptap-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted-foreground, #a1a1aa);
          opacity: 0.5;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }

        /* Typography base */
        .tiptap-editor-content {
          font-size: 1.0625rem;
          line-height: 1.75;
          color: var(--foreground);
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
          color: var(--primary);
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
          border-left: 3px solid var(--border);
          padding-left: 1.25rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: var(--muted-foreground);
        }

        /* Code blocks */
        .tiptap-editor-content pre {
          background: var(--muted, #f4f4f5);
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
          background: var(--muted, #f4f4f5);
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          font-size: 0.875em;
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace;
        }

        /* Horizontal rule */
        .tiptap-editor-content hr {
          border: none;
          border-top: 1px solid var(--border);
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
      `}</style>
    </div>
  )
}
