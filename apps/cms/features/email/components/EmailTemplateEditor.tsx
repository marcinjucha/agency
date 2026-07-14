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
  AddBlockPick,
  Block,
  EmailTemplate,
  EmailTemplateType,
  TemplateVariable,
} from '../types'
import { BONUS_LIST_PICK } from '../types'
import { VENTURE_BONUS_MARKER } from '@/lib/app-sent-variables'
import { updateEmailTemplateFn, parseTemplateVariables } from '../server'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { CMS_BLOCK_REGISTRY } from '../block-registry'
import { extractTemplateVariableKeys } from '../utils/extract-variable-keys'
import { validateVariableKey } from '../utils/validate-variable-key'
import { collectUnresolvableTokens } from '../utils/resolve-variable-source'
import { queryKeys } from '@/lib/query-keys'
import {
  updateBlockDeep,
  deleteBlockDeep,
  duplicateBlockDeep,
  moveBlockDeep,
  insertBlockDeep,
  findBlockDeep,
} from '../utils/block-tree'
import { resolveClientTheme } from '@/lib/theme'
import type { ThemeWithUsage } from '@/features/themes/types'
import { useResolvedEmailTheme } from '../hooks/use-resolved-email-theme'
import { EmailThemeProvider } from '../contexts/email-theme-context'

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
  // Per-template theme override — null = inherit the tenant default. Mirrors the
  // `label` pattern (local state, hydrated from initialTemplate, sent on save).
  const [themeId, setThemeId] = useState<string | null>(initialTemplate?.theme_id ?? null)
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
  // Non-blocking save-time advisory (APP-OWNED unresolvable tokens). role="status",
  // auto-dismissed on the same timeout as saveState — NOT an error, never blocks.
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Hydrate when initialTemplate loads asynchronously
  useEffect(() => {
    if (initialTemplate) {
      setLabel(initialTemplate.label ?? templateType)
      setSubject(initialTemplate.subject ?? '')
      setThemeId(initialTemplate.theme_id ?? null)
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
  }, [label, subject, themeId, blocks, userEditedVariables])

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

  // Content tokens that will reach the recipient LITERALLY (APP-OWNED types only —
  // always [] for n8n/custom). Single computed set feeding two render sites: the
  // persistent Zmienne-tab note (via Inspector) and the save-time overlay echo.
  // Display + advisory ONLY — never blocks save (the `hasInvalidVariableKey`
  // malformed-syntax gate is the only legitimate block).
  const unresolvableTokens = collectUnresolvableTokens(
    detectedKeys,
    templateType,
    userEditedVariables.map((v) => v.key),
  )

  // ---- Block operations (passed down to OutlinePanel / Canvas / Inspector) ----
  // Iter 2: wszystkie operacje przeszły na GŁĘBOKIE odpowiedniki z block-tree.ts,
  // więc działają na blokach zagnieżdżonych w sekcjach tak samo jak na top-level.

  function updateBlock(updated: Block) {
    setBlocks((prev) => updateBlockDeep(prev, updated))
  }

  // Build a new block from a pick. The BONUS_LIST_PICK sentinel is NOT a registry
  // type — it yields a text block pre-filled with the {{bonus_list}} marker (import
  // the constant, never hand-type it). Returns null for an unknown block type.
  function buildBlockFromPick(pick: AddBlockPick): Block | null {
    if (pick === BONUS_LIST_PICK) {
      return {
        id: crypto.randomUUID(),
        ...CMS_BLOCK_REGISTRY.text.defaultValue,
        content: VENTURE_BONUS_MARKER,
      } as Block
    }
    const entry = CMS_BLOCK_REGISTRY[pick]
    if (!entry) return null
    return { id: crypto.randomUUID(), ...entry.defaultValue } as Block
  }

  function addBlock(pick: AddBlockPick) {
    // Append na końcu najwyższego poziomu (parentId = null). Funkcyjny updater —
    // `prev.length` zamiast `blocks.length` z closure, żeby batching nie
    // wstawił bloku pod złym indeksem.
    const newBlock = buildBlockFromPick(pick)
    if (!newBlock) return
    setBlocks((prev) => insertBlockDeep(prev, newBlock, null, prev.length))
    setSelectedBlockId(newBlock.id)
  }

  function deleteBlock(id: string) {
    const next = deleteBlockDeep(blocks, id)
    setBlocks(next)
    // Czyścimy selekcję gdy zaznaczony blok zniknął (także jako dziecko
    // usuniętej sekcji — dlatego sprawdzamy po fakcie, na nowym drzewie).
    if (selectedBlockId && !findBlockDeep(next, selectedBlockId)) {
      setSelectedBlockId(null)
    }
  }

  function duplicateBlock(id: string) {
    const { blocks: next, newId } = duplicateBlockDeep(blocks, id)
    if (!newId) return
    setBlocks(next)
    setSelectedBlockId(newId)
  }

  // Reorder po indeksach TOP-LEVEL — konsument to drag&drop w OutlinePanel,
  // który celowo działa tylko na najwyższym poziomie (zagnieżdżone rzędy nie
  // są draggable; kolejność wewnątrz sekcji zmieniają strzałki na canvasie).
  function reorderBlock(from: number, to: number) {
    setBlocks((prev) => {
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function insertBlockAt(pick: AddBlockPick, index: number, parentId: string | null = null) {
    const newBlock = buildBlockFromPick(pick)
    if (!newBlock) return
    setBlocks((prev) => insertBlockDeep(prev, newBlock, parentId, index))
    setSelectedBlockId(newBlock.id)
  }

  function moveBlock(id: string, dir: -1 | 1) {
    // moveBlockDeep jest sibling-scoped — ruch poza granicę tablicy = no-op.
    setBlocks((prev) => moveBlockDeep(prev, id, dir))
  }

  function onCanvasBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) setSelectedBlockId(null)
  }

  // ---- Theme pick (optimistic recolour) ----

  // Resolved theme map for the PICKED theme_id — recolours the live Canvas +
  // per-block token swatches. Keyed by themeId, so it refetches on pick; the
  // seed below makes the recolour INSTANT for a named theme (no round-trip).
  const resolvedTheme = useResolvedEmailTheme(themeId)

  function handleThemeChange(nextId: string | null) {
    setThemeId(nextId)
    // Optimistic: seed the resolved-theme cache for the new key from the theme's
    // own tokens (already in the ThemePicker's `themes.all` cache) so swatches +
    // Canvas recolour immediately. Server stays source of truth at save. For
    // inherit (null) we can't resolve the tenant default client-side — the query
    // fetches it (brief delay, acceptable).
    if (!nextId) return
    const themes = queryClient.getQueryData<ThemeWithUsage[]>(queryKeys.themes.all)
    const picked = themes?.find((theme) => theme.id === nextId)
    if (!picked) return
    // Mirror the SERVER email path exactly (resolveEmailThemeMap →
    // resolveClientTheme with the theme as tenantTheme) so optimistic colours
    // match the saved html_body.
    const map = { ...resolveClientTheme({ tenantTheme: picked.tokens, clientTheme: null }) }
    queryClient.setQueryData([...queryKeys.email.resolvedTheme, nextId], map)
  }

  // ---- Save ----

  async function handleSave() {
    if (saveState === 'saving' || hasInvalidVariableKey) return
    setSaveState('saving')
    setErrorMessage(null)
    setSaveWarning(null)

    const cleanedVariables = userEditedVariables.filter((v) => v.key.trim().length > 0)

    try {
      const result = await updateEmailTemplateFn({
        data: {
          type: templateType as EmailTemplateType,
          data: { subject, blocks, template_variables: cleanedVariables, label, theme_id: themeId },
        },
      })
      if (result && result.success) {
        setSaveState('saved')
        setDirty(false)
        // Non-blocking echo of the unresolvable-token advisory (save succeeded).
        if (unresolvableTokens.length > 0) {
          setSaveWarning(
            `${messages.email.unresolvableSaveWarning} ${unresolvableTokens.map((t) => `{{${t}}}`).join(', ')}`,
          )
        }
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
      setTimeout(() => {
        setSaveState('idle')
        setSaveWarning(null)
      }, 2500)
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
  }, [saveState, hasInvalidVariableKey, label, subject, themeId, blocks, userEditedVariables, selectedBlockId])

  // ---- Render ----

  return (
    <EmailThemeProvider theme={resolvedTheme}>
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
        templateType={templateType}
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
        themeId={themeId}
        setThemeId={handleThemeChange}
        userEditedVariables={userEditedVariables}
        setUserEditedVariables={setUserEditedVariables}
        detectedKeys={detectedKeys}
        templateType={templateType}
        unresolvableTokens={unresolvableTokens}
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

      {!errorMessage && saveWarning && (
        <div
          role="status"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300 shadow-md"
        >
          {saveWarning}
        </div>
      )}

      <DeleteTemplateDialog
        template={initialTemplate}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate({ to: routes.admin.emailTemplates })}
      />
    </div>
    </EmailThemeProvider>
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
