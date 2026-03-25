'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Button, Input } from '@agency/ui'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Link,
  Film,
  Undo2,
  Redo2,
  X,
  Check,
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor | null
  onOpenMediaModal?: () => void
}

export function EditorToolbar({ editor, onOpenMediaModal }: EditorToolbarProps) {
  const [linkInput, setLinkInput] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: '',
  })

  const applyLink = useCallback(() => {
    if (!editor || !linkInput.url) return

    if (linkInput.url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkInput.url })
        .run()
    }
    setLinkInput({ visible: false, url: '' })
  }, [editor, linkInput.url])

  if (!editor) return null

  return (
    <div className="border-b border-border bg-muted/30">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        {/* Text formatting */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Pogrubienie"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Kursywa"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Podkreslenie"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Przekreslenie"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Headings */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Naglowek 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Naglowek 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Naglowek 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Alignment */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Wyrownaj do lewej"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Wycentruj"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Wyrownaj do prawej"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Lista punktowana"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Lista numerowana"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Block elements */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Cytat"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Blok kodu"
          >
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Linia pozioma"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Insert */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => {
              const existingUrl = editor.getAttributes('link').href ?? ''
              setLinkInput({ visible: !linkInput.visible, url: existingUrl })
            }}
            active={editor.isActive('link')}
            title="Link"
          >
            <Link className="h-4 w-4" />
          </ToolbarButton>
          {onOpenMediaModal && (
            <ToolbarButton
              onClick={onOpenMediaModal}
              title="Media"
            >
              <Film className="h-4 w-4" />
            </ToolbarButton>
          )}
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* History */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Cofnij"
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Ponow"
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>
      </div>

      {/* Link input row */}
      {linkInput.visible && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">URL:</span>
          <Input
            value={linkInput.url}
            onChange={(e) => setLinkInput((prev) => ({ ...prev, url: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') setLinkInput({ visible: false, url: '' })
            }}
            placeholder="https://..."
            className="h-7 flex-1 text-sm"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={applyLink} aria-label="Zastosuj link">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLinkInput({ visible: false, url: '' })}
            aria-label="Anuluj"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {editor.isActive('link') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                setLinkInput({ visible: false, url: '' })
              }}
            >
              Usun link
            </Button>
          )}
        </div>
      )}

    </div>
  )
}

// --- Sub-components ---

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function ToolbarSeparator() {
  return <div className="mx-1 h-6 w-px bg-border" />
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 rounded-md transition-colors ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  )
}
