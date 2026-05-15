import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import { Label, Button, cn } from '@agency/ui'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Braces,
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { messages } from '@/lib/messages'
import { VariableInserterPopover, type VariableItem } from '@agency/ui'
import type { TextBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface TextBlockEditorProps {
  block: TextBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

/**
 * TextBlockEditor — WYSIWYG dla treści TextBlock.
 *
 * Reuses minimal Tiptap setup zamiast surowego Textarea/HTML.
 * Treść bloku to HTML (kompatybilna z renderer'em sanitize-html allowlist:
 * <p>, <strong>, <em>, <u>, <a>, <br>, <ul>, <ol>, <li>, <span>).
 *
 * Toolbar: Bold / Italic / Underline / Link / UL / OL — bez nagłówków
 * (HeadingBlock ma własny typ). VariableInserter wstawia {{key}} w aktualnym
 * miejscu kursora via editor.commands.insertContent().
 */
export function TextBlockEditor({ block, onChange, variables = [] }: TextBlockEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Tylko paragrafy — nagłówki należą do HeadingBlock.
        heading: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: 'Wpisz treść wiadomości…',
      }),
    ],
    content: block.content || '<p></p>',
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      onChange({ ...block, content: html })
    },
    editorProps: {
      attributes: {
        class: 'email-text-editor-content outline-none',
      },
    },
  })

  // Sync incoming content (e.g. after RHF reset()) — only when truly external.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = editor.getHTML()
    const incoming = block.content || '<p></p>'
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [editor, block.content])

  const insertVariable = (key: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(`{{${key}}}`).run()
  }

  const variableItems: VariableItem[] = variables.map((v) => ({
    key: v.key,
    label: v.label,
    description: v.description,
    category: v.category,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{messages.email.inspectorSectionContent}</Label>
        {variableItems.length > 0 ? (
          <VariableInserterPopover
            variables={variableItems}
            onInsert={insertVariable}
            searchPlaceholder={messages.variableInserter.searchPlaceholder}
            emptyMessage={messages.variableInserter.noVariables}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                aria-label={messages.variableInserter.insertVariable}
              >
                <Braces className="h-3 w-3 mr-1" />
                {messages.variableInserter.label}
              </Button>
            }
          />
        ) : null}
      </div>

      <div className="rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
        <TextEditorToolbar editor={editor} />
        <div className="min-h-[120px] px-3 py-2 text-sm">
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Możesz używać <span className="font-mono text-foreground/70">{'{{zmiennych}}'}</span>.
      </p>

      <style>{`
        .email-text-editor-content p {
          margin: 0 0 0.5rem 0;
        }
        .email-text-editor-content p:last-child {
          margin-bottom: 0;
        }
        .email-text-editor-content ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0 0 0.5rem 0;
        }
        .email-text-editor-content ol {
          list-style: decimal;
          padding-left: 1.25rem;
          margin: 0 0 0.5rem 0;
        }
        .email-text-editor-content a {
          color: var(--color-primary);
          text-decoration: underline;
        }
        .email-text-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--color-muted-foreground);
          opacity: 0.55;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}

interface TextEditorToolbarProps {
  editor: Editor | null
}

function TextEditorToolbar({ editor }: TextEditorToolbarProps) {
  if (!editor) {
    return <div className="h-8 border-b border-border bg-muted/30" />
  }

  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Pogrubienie"
      >
        <BoldIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Kursywa"
      >
        <ItalicIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Podkreślenie"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista wypunktowana"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista numerowana"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run()
            return
          }
          const url = window.prompt('URL linku:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        title="Link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}

interface ToolbarButtonProps {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
