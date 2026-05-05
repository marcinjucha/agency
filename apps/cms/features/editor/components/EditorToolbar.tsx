

import { useCallback, useState } from 'react'
import { HexAlphaColorPicker } from 'react-colorful'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@agency/ui'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Baseline,
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
  FileDown,
  Undo2,
  Redo2,
  X,
  Check,
} from 'lucide-react'
import { messages } from '@/lib/messages'

interface EditorToolbarProps {
  editor: Editor | null
  onOpenMediaModal?: () => void
  /**
   * Optional — when provided, renders a "Wstaw plik do pobrania" button next
   * to the media insert button. Blog editor uses this to open the
   * InsertDownloadableAssetModal. Other consumers (legal-pages, shop-products)
   * omit it; the button is hidden when not wired.
   */
  onOpenDownloadModal?: () => void
  /** Tooltip/aria label for the download button (consumer-supplied so message keys stay app-side). */
  downloadModalLabel?: string
}

export function EditorToolbar({
  editor,
  onOpenMediaModal,
  onOpenDownloadModal,
  downloadModalLabel,
}: EditorToolbarProps) {
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
            title="Podkreślenie"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Przekreślenie"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <HighlightPicker editor={editor} />
          <TextColorPicker editor={editor} />
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Headings */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Nagłówek 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Nagłówek 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Nagłówek 3"
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
            title="Wyrównaj do lewej"
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
            title="Wyrównaj do prawej"
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
          {onOpenDownloadModal && (
            <ToolbarButton
              onClick={onOpenDownloadModal}
              title={downloadModalLabel ?? messages.editor.toolbar.insertDownloadFallback}
            >
              <FileDown className="h-4 w-4" />
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
            title="Ponów"
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
              Usuń link
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

// --- Highlight color picker ---

// Highlight presets reference theme tokens via CSS custom properties so each
// site (CMS / website / shops) resolves its own brand colors from globals.css.
// `color` is written into the <mark> inline style — browser resolves var() at render.
// `previewColor` is higher-opacity for the swatch UI so users can distinguish colors.
const HIGHLIGHT_PRESETS = [
  {
    name: 'Primary',
    color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)',
    previewColor: 'color-mix(in srgb, var(--color-primary) 85%, transparent)',
  },
  {
    name: 'Secondary',
    color: 'color-mix(in srgb, var(--color-secondary) 45%, transparent)',
    previewColor: 'color-mix(in srgb, var(--color-secondary) 85%, transparent)',
  },
  {
    name: 'Accent',
    color: 'color-mix(in srgb, var(--color-accent) 45%, transparent)',
    previewColor: 'color-mix(in srgb, var(--color-accent) 85%, transparent)',
  },
  {
    name: 'Destructive',
    color: 'color-mix(in srgb, var(--color-destructive) 45%, transparent)',
    previewColor: 'color-mix(in srgb, var(--color-destructive) 85%, transparent)',
  },
] as const

// Text color presets — same design tokens as highlight, applied at full opacity
// since they color the glyphs directly (vs background tint for highlight).
const TEXT_COLOR_PRESETS = [
  { name: 'Primary', color: 'var(--color-primary)' },
  { name: 'Secondary', color: 'var(--color-secondary)' },
  { name: 'Accent', color: 'var(--color-accent)' },
  { name: 'Destructive', color: 'var(--color-destructive)' },
] as const

const DEFAULT_CUSTOM_COLOR = '#f97316cc' // orange-500 at 80% alpha

function HighlightPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM_COLOR)

  // Subscribe to editor transactions so isActive stays in sync after
  // setHighlight/unsetHighlight (plain .isActive on the editor prop does not
  // trigger re-renders on its own).
  const isActive = useEditorState({
    editor,
    selector: ({ editor }) => editor.isActive('highlight'),
  })

  function applyPreset(color: string) {
    editor.chain().focus().setHighlight({ color }).run()
    setOpen(false)
  }

  function removeHighlight() {
    editor.chain().focus().unsetHighlight().run()
    setOpen(false)
  }

  function handleCustomChange(next: string) {
    setCustomColor(next)
    // Skip .focus() — each mousemove on the picker would steal focus from the
    // Popover and trigger onInteractOutside, closing the picker mid-drag.
    // Tiptap preserves the selection even when editor lacks DOM focus, so
    // the mark applies to the original selection range.
    editor.chain().setHighlight({ color: next }).run()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-md transition-colors ${
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Wyróżnienie"
          aria-label="Wyróżnienie"
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-xs font-medium text-muted-foreground">Kolor wyróżnienia</p>
          <div className="flex items-center gap-2 px-1">
            {HIGHLIGHT_PRESETS.map((preset) => {
              const isCurrentColor =
                editor.isActive('highlight', { color: preset.color })
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset.color)}
                  title={preset.name}
                  aria-label={`Wyróżnienie: ${preset.name}`}
                  className="relative flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    background: preset.previewColor,
                    border: isCurrentColor
                      ? '2px solid white'
                      : '2px solid transparent',
                    outline: isCurrentColor
                      ? '2px solid hsl(var(--ring, 222.2 80% 62%))'
                      : 'none',
                    outlineOffset: '1px',
                  }}
                />
              )
            })}
            {/* Custom color toggle — reveals inline react-colorful picker below */}
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              title="Własny kolor"
              aria-label="Własny kolor wyróżnienia"
              aria-expanded={customOpen}
              className={`flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                customOpen ? 'border-2 border-white outline-1 outline-offset-1' : 'border-2 border-transparent'
              }`}
              style={{
                background:
                  'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              }}
            />
          </div>
          {customOpen && (
            <div className="mt-1 px-1">
              <HexAlphaColorPicker
                color={customColor}
                onChange={handleCustomChange}
                style={{ width: 180, height: 140 }}
              />
              <p className="mt-1 text-center font-mono text-[10px] uppercase text-muted-foreground">
                {customColor}
              </p>
            </div>
          )}
          {isActive && (
            <button
              type="button"
              onClick={removeHighlight}
              className="mt-0.5 px-1 text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Usuń wyróżnienie"
            >
              Usuń wyróżnienie
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// --- Text color picker ---

const DEFAULT_TEXT_CUSTOM_COLOR = '#f97316'

function TextColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customColor, setCustomColor] = useState(DEFAULT_TEXT_CUSTOM_COLOR)

  const isActive = useEditorState({
    editor,
    selector: ({ editor }) => editor.isActive('textStyle'),
  })
  const currentColor = useEditorState({
    editor,
    selector: ({ editor }) => editor.getAttributes('textStyle').color ?? null,
  })

  function applyPreset(color: string) {
    editor.chain().focus().setColor(color).run()
    setOpen(false)
  }

  function removeColor() {
    editor.chain().focus().unsetColor().run()
    setOpen(false)
  }

  function handleCustomChange(next: string) {
    setCustomColor(next)
    // Skip .focus() so drag inside picker does not steal focus and close Popover.
    editor.chain().setColor(next).run()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-md transition-colors ${
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Kolor tekstu"
          aria-label="Kolor tekstu"
        >
          <Baseline className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-xs font-medium text-muted-foreground">Kolor tekstu</p>
          <div className="flex items-center gap-2 px-1">
            {TEXT_COLOR_PRESETS.map((preset) => {
              const isCurrentColor = currentColor === preset.color
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset.color)}
                  title={preset.name}
                  aria-label={`Kolor tekstu: ${preset.name}`}
                  className="relative flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    background: preset.color,
                    border: isCurrentColor
                      ? '2px solid white'
                      : '2px solid transparent',
                    outline: isCurrentColor
                      ? '2px solid hsl(var(--ring, 222.2 80% 62%))'
                      : 'none',
                    outlineOffset: '1px',
                  }}
                />
              )
            })}
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              title="Własny kolor"
              aria-label="Własny kolor tekstu"
              aria-expanded={customOpen}
              className={`flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                customOpen ? 'border-2 border-white outline-1 outline-offset-1' : 'border-2 border-transparent'
              }`}
              style={{
                background:
                  'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              }}
            />
          </div>
          {customOpen && (
            <div className="mt-1 px-1">
              <HexAlphaColorPicker
                color={customColor}
                onChange={handleCustomChange}
                style={{ width: 180, height: 140 }}
              />
              <p className="mt-1 text-center font-mono text-[10px] uppercase text-muted-foreground">
                {customColor}
              </p>
            </div>
          )}
          {isActive && (
            <button
              type="button"
              onClick={removeColor}
              className="mt-0.5 px-1 text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Usuń kolor tekstu"
            >
              Usuń kolor tekstu
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
