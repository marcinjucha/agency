import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button, Input } from '@agency/ui'
import { ArrowLeft, Save } from 'lucide-react'
import { OutlinePanel } from './editor/OutlinePanel'
import { Canvas } from './editor/Canvas'
import { Inspector } from './editor/Inspector'
import { DeleteTemplateDialog } from './DeleteTemplateDialog'
import { DEFAULT_BLOCKS } from '../constants'
import type {
  Block,
  BlockType,
  EmailTemplate,
  EmailTemplateType,
  TemplateVariable,
} from '../types'
import { updateEmailTemplateFn, parseTemplateVariables } from '../server'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { CMS_BLOCK_REGISTRY } from '../block-registry'
import { extractTemplateVariableKeys } from '../utils/extract-variable-keys'
import { validateVariableKey } from '../utils/validate-variable-key'
import { queryKeys } from '@/lib/query-keys'

interface EmailTemplateEditorProps {
  templateType: string
  initialTemplate: EmailTemplate | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ---------------------------------------------------------------------------
// EmailTemplateEditor — full-screen 3-column editor (Outline | Canvas | Inspector)
// Iter 1/4 — topbar + Outline panel real; Canvas + Inspector are placeholders
// ---------------------------------------------------------------------------

export function EmailTemplateEditor({ templateType, initialTemplate }: EmailTemplateEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Core state
  const [label, setLabel] = useState(initialTemplate?.label ?? templateType)
  const [subject, setSubject] = useState(initialTemplate?.subject ?? '')
  const [blocks, setBlocks] = useState<Block[]>(initialTemplate?.blocks ?? DEFAULT_BLOCKS)
  const [userEditedVariables, setUserEditedVariables] = useState<TemplateVariable[]>(() =>
    parseTemplateVariables(initialTemplate?.template_variables),
  )

  // Selection — passed to Canvas and Inspector
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  // Viewport toggle for canvas preview
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')

  // Save state
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Hydrate when initialTemplate loads asynchronously
  useEffect(() => {
    if (initialTemplate) {
      setLabel(initialTemplate.label ?? templateType)
      setSubject(initialTemplate.subject ?? '')
      setBlocks(initialTemplate.blocks ?? DEFAULT_BLOCKS)
      setUserEditedVariables(parseTemplateVariables(initialTemplate.template_variables))
      setDirty(false)
    }
  }, [initialTemplate, templateType])

  // Track dirty — skip first render
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setDirty(true)
  }, [label, subject, blocks, userEditedVariables])

  // Variables model (AAA-T-221, 2026-05-15): user-managed list ONLY.
  // Previously the inspector showed an auto-merged view of detected `{{key}}`
  // tokens from content + user-edited entries. Result: user couldn't delete
  // auto-detected ones because they re-appeared on every render. Now the
  // inspector edits ONLY userEditedVariables — same source as the saved
  // template_variables JSONB. Auto-detected keys still feed the {{}} picker
  // autocomplete via `detectedKeys` (so users can insert known variables),
  // they just don't auto-populate the saved Zmienne list.
  const detectedKeys = extractTemplateVariableKeys(subject, blocks)
  const hasInvalidVariableKey = userEditedVariables.some((v, i) =>
    validateVariableKey(v.key, i, userEditedVariables) !== null,
  )

  // ---- Block operations (passed down to OutlinePanel) ----

  function updateBlock(updated: Block) {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  function addBlock(type: BlockType) {
    const entry = CMS_BLOCK_REGISTRY[type]
    if (!entry) return
    const id = crypto.randomUUID()
    const newBlock = { id, ...entry.defaultValue } as Block
    setBlocks((prev) => [...prev, newBlock])
    setSelectedBlockId(id)
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  function duplicateBlock(id: string) {
    const idx = blocks.findIndex((b) => b.id === id)
    if (idx < 0) return
    const copy = { ...blocks[idx], id: crypto.randomUUID() } as Block
    setBlocks((prev) => {
      const next = prev.slice()
      next.splice(idx + 1, 0, copy)
      return next
    })
    setSelectedBlockId(copy.id)
  }

  function reorderBlock(from: number, to: number) {
    setBlocks((prev) => {
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function insertBlockAt(type: BlockType, index: number) {
    const entry = CMS_BLOCK_REGISTRY[type]
    if (!entry) return
    const id = crypto.randomUUID()
    const newBlock = { id, ...entry.defaultValue } as Block
    setBlocks((prev) => {
      const next = prev.slice()
      next.splice(index, 0, newBlock)
      return next
    })
    setSelectedBlockId(id)
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id)
    if (idx < 0) return
    const to = idx + dir
    if (to < 0 || to >= blocks.length) return
    reorderBlock(idx, to)
  }

  function onCanvasBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setSelectedBlockId(null)
  }

  // ---- Save ----

  async function handleSave() {
    if (saveState === 'saving' || hasInvalidVariableKey) return
    setSaveState('saving')
    setErrorMessage(null)

    const cleanedVariables = userEditedVariables.filter((v) => v.key.trim().length > 0)

    try {
      const result = await updateEmailTemplateFn({
        data: {
          type: templateType as EmailTemplateType,
          data: { subject, blocks, template_variables: cleanedVariables, label },
        },
      })
      if (result && result.success) {
        setSaveState('saved')
        setDirty(false)
        void queryClient.invalidateQueries({ queryKey: queryKeys.email.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
      } else {
        setSaveState('error')
        setErrorMessage(result?.error ?? messages.email.templateSaveFailed)
      }
    } catch (err) {
      setSaveState('error')
      setErrorMessage(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  // ⌘S / Ctrl+S keyboard shortcut + Esc deselect + Backspace/Delete block delete
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
        return
      }
      if (e.key === 'Escape') {
        setSelectedBlockId(null)
        return
      }
      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        selectedBlockId &&
        !(e.target as Element)?.matches?.('input,textarea,[contenteditable]')
      ) {
        e.preventDefault()
        deleteBlock(selectedBlockId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleSave + deleteBlock read state via closure; re-run on dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState, hasInvalidVariableKey, label, subject, blocks, userEditedVariables, selectedBlockId])

  // ---- Render ----

  return (
    <div className="absolute inset-0 grid grid-rows-[52px_1fr] grid-cols-[280px_1fr_360px] bg-background">
      {/* Topbar — spans all 3 columns */}
      <header className="col-span-3 z-10 flex items-center gap-3 border-b border-border bg-background px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: routes.admin.emailTemplates })}
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-xs">{messages.nav.emailTemplates}</span>
        </Button>

        <span className="h-4 w-px bg-border" aria-hidden="true" />

        <LabelInline value={label} onChange={setLabel} />

        <SavePill saveState={saveState} dirty={dirty} />

        <code className="hidden sm:inline-block shrink-0 rounded border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {templateType}
        </code>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            {messages.email.deleteAction}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saveState === 'saving' || !dirty || hasInvalidVariableKey}
            className="gap-1.5"
            aria-label={messages.common.save}
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {saveState === 'saving' ? messages.common.saving : messages.common.save}
            </span>
            <kbd className="ml-1 hidden sm:inline-flex h-4 items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1 font-mono text-[10px] text-primary-foreground/70">
              ⌘S
            </kbd>
          </Button>
        </div>
      </header>

      {/* Outline (left) */}
      <OutlinePanel
        blocks={blocks}
        selectedId={selectedBlockId}
        onSelect={setSelectedBlockId}
        onAdd={addBlock}
        onDelete={deleteBlock}
        onDuplicate={duplicateBlock}
        onReorder={reorderBlock}
      />

      {/* Canvas (center) */}
      <Canvas
        blocks={blocks}
        subject={subject}
        setSubject={setSubject}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        onAddAt={insertBlockAt}
        onDelete={deleteBlock}
        onDuplicate={duplicateBlock}
        onMove={moveBlock}
        viewport={viewport}
        setViewport={setViewport}
        onBackdropClick={onCanvasBackdropClick}
        detectedKeys={detectedKeys}
      />

      {/* Inspector (right) */}
      <Inspector
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onUpdateBlock={updateBlock}
        onDeleteBlock={deleteBlock}
        onDuplicateBlock={duplicateBlock}
        label={label}
        setLabel={setLabel}
        userEditedVariables={userEditedVariables}
        setUserEditedVariables={setUserEditedVariables}
        detectedKeys={detectedKeys}
        templateType={templateType}
        onDelete={() => setDeleteOpen(true)}
      />

      {errorMessage && (
        <div
          role="alert"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-md"
        >
          {errorMessage}
        </div>
      )}

      <DeleteTemplateDialog
        template={initialTemplate}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate({ to: routes.admin.emailTemplates })}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LabelInline — click-to-edit label in topbar
// ---------------------------------------------------------------------------

interface LabelInlineProps {
  value: string
  onChange: (v: string) => void
}

function LabelInline({ value, onChange }: LabelInlineProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit(next: string) {
    onChange(next.trim() || value)
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        defaultValue={value}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value)
          else if (e.key === 'Escape') setEditing(false)
        }}
        className="h-7 max-w-xs text-sm font-semibold"
        maxLength={100}
        aria-label={messages.email.templateNameField}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={messages.email.labelEditHint}
      className="max-w-xs truncate rounded border border-transparent px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:border-border hover:bg-card"
    >
      {value}
    </button>
  )
}

// ---------------------------------------------------------------------------
// SavePill — small status indicator next to label
// ---------------------------------------------------------------------------

interface SavePillProps {
  saveState: SaveState
  dirty: boolean
}

function SavePill({ saveState, dirty }: SavePillProps) {
  const status = resolveSavePillStatus(saveState, dirty)
  return (
    <div className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-0.5 text-xs text-muted-foreground">
      <span
        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
        aria-label={status.ariaLabel}
      />
      <span>{status.text}</span>
    </div>
  )
}

function resolveSavePillStatus(saveState: SaveState, dirty: boolean) {
  if (saveState === 'saving') {
    return {
      text: messages.common.saving,
      dot: 'bg-amber-500 animate-pulse',
      ariaLabel: messages.common.saving,
    }
  }
  if (saveState === 'error') {
    return {
      text: messages.common.saveError,
      dot: 'bg-destructive',
      ariaLabel: messages.common.saveError,
    }
  }
  if (dirty) {
    return {
      text: messages.email.unsavedChanges,
      dot: 'bg-amber-500',
      ariaLabel: messages.email.unsavedChanges,
    }
  }
  return {
    text: messages.common.saved,
    dot: 'bg-emerald-500',
    ariaLabel: messages.common.saved,
  }
}
