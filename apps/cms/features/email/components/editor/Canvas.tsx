import { useState, useRef, useEffect, Fragment } from 'react'
import { Eye, Monitor, Smartphone, ChevronUp, ChevronDown, Copy, Trash2, Plus, Mail } from 'lucide-react'
import { renderBlock, resolveBlockMarginBottom } from '@agency/email'
import { CMS_BLOCK_REGISTRY } from '../../block-registry'
import { useEmailThemeMap } from '../../contexts/email-theme-context'
import { messages } from '@/lib/messages'
import type { Block, BlockType } from '../../types'
import { AddBlockPopover } from './AddBlockPopover'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CanvasProps {
  blocks: Block[]
  subject: string
  setSubject: (v: string) => void
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
  onAddAt: (type: BlockType, index: number) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  viewport: 'desktop' | 'mobile'
  setViewport: (v: 'desktop' | 'mobile') => void
  onBackdropClick: (e: React.MouseEvent) => void
  detectedKeys: string[]
}

// ---------------------------------------------------------------------------
// Canvas root
// ---------------------------------------------------------------------------

export function Canvas({
  blocks,
  subject,
  setSubject,
  selectedBlockId,
  setSelectedBlockId,
  onAddAt,
  onDelete,
  onDuplicate,
  onMove,
  viewport,
  setViewport,
  onBackdropClick,
  detectedKeys,
}: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset scroll to top on mount (fires when navigating to a different template)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  return (
    <section className="flex flex-col bg-muted/20 overflow-hidden" aria-label={messages.email.canvasTitle}>
      <CanvasToolbar viewport={viewport} setViewport={setViewport} />
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6"
        onClick={onBackdropClick}
      >
        <Envelope
          subject={subject}
          setSubject={setSubject}
          viewport={viewport}
          detectedKeys={detectedKeys}
        />
        <EmailFrame
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          setSelectedBlockId={setSelectedBlockId}
          onAddAt={onAddAt}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMove={onMove}
          viewport={viewport}
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// CanvasToolbar — desktop/mobile toggle
// ---------------------------------------------------------------------------

interface CanvasToolbarProps {
  viewport: 'desktop' | 'mobile'
  setViewport: (v: 'desktop' | 'mobile') => void
}

function CanvasToolbar({ viewport, setViewport }: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 bg-background/60 px-4 py-2 shrink-0">
      <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs font-medium text-muted-foreground">{messages.email.canvasTitle}</span>
      <div className="ml-auto flex items-center rounded-md border border-border bg-card p-0.5 gap-0.5">
        <button
          type="button"
          aria-label={messages.email.canvasViewportDesktop}
          aria-pressed={viewport === 'desktop'}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
            viewport === 'desktop'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setViewport('desktop')}
        >
          <Monitor className="h-3 w-3" aria-hidden="true" />
          <span>{messages.email.canvasViewportDesktop}</span>
        </button>
        <button
          type="button"
          aria-label={messages.email.canvasViewportMobile}
          aria-pressed={viewport === 'mobile'}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
            viewport === 'mobile'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setViewport('mobile')}
        >
          <Smartphone className="h-3 w-3" aria-hidden="true" />
          <span>{messages.email.canvasViewportMobile}</span>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Envelope — Od / Temat rows above email body
// ---------------------------------------------------------------------------

interface EnvelopeProps {
  subject: string
  setSubject: (v: string) => void
  viewport: 'desktop' | 'mobile'
  detectedKeys: string[]
}

function Envelope({ subject, setSubject, viewport, detectedKeys }: EnvelopeProps) {
  const [editSubject, setEditSubject] = useState(false)
  const [showVarPicker, setShowVarPicker] = useState(false)
  const subjectRef = useRef<HTMLInputElement>(null)
  const maxWidth = viewport === 'mobile' ? 'max-w-[390px]' : 'max-w-[640px]'

  function insertVarAtCursor(key: string) {
    const el = subjectRef.current
    if (!el) {
      setSubject(`${subject}{{${key}}}`)
      setShowVarPicker(false)
      return
    }
    const s = el.selectionStart ?? subject.length
    const e = el.selectionEnd ?? subject.length
    const ins = `{{${key}}}`
    setSubject(subject.slice(0, s) + ins + subject.slice(e))
    setShowVarPicker(false)
    setTimeout(() => {
      el.focus()
      const pos = s + ins.length
      el.setSelectionRange(pos, pos)
    }, 0)
  }

  return (
    <div className={`mx-auto ${maxWidth} rounded-lg border border-border bg-card shadow-sm mb-2 transition-all duration-200`}>
      {/* Od row */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
          {messages.email.canvasFrom}
        </span>
        <span className="text-sm text-muted-foreground">{messages.email.canvasFromAddress}</span>
      </div>

      {/* Temat row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
          {messages.email.canvasSubjectFrom}
        </span>
        {editSubject ? (
          <input
            ref={subjectRef}
            autoFocus
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => {
              // Delay so variable picker click registers before input loses focus
              setTimeout(() => setEditSubject(false), 150)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.currentTarget.blur()
              }
            }}
            placeholder={messages.email.canvasSubjectInputPlaceholder}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditSubject(true)}
            className={`flex-1 text-left text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm ${
              subject ? 'text-foreground' : 'text-muted-foreground/60'
            }`}
          >
            {subject ? renderSubjectWithVars(subject) : messages.email.canvasSubjectClickPlaceholder}
          </button>
        )}

        {/* Variable picker button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!editSubject) setEditSubject(true)
              setShowVarPicker((v) => !v)
            }}
            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={messages.email.canvasInsertVariable}
          >
            {'{{ }}'}
          </button>

          {showVarPicker && (
            <SubjectVarPicker
              keys={detectedKeys}
              onPick={insertVarAtCursor}
              onClose={() => setShowVarPicker(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubjectVarPicker — mini dropdown for inserting {{key}} into subject
// ---------------------------------------------------------------------------

interface SubjectVarPickerProps {
  keys: string[]
  onPick: (key: string) => void
  onClose: () => void
}

function SubjectVarPicker({ keys, onPick, onClose }: SubjectVarPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-border bg-popover shadow-lg">
      {keys.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-muted-foreground">
          {messages.email.canvasNoVariables}
        </p>
      ) : (
        <div className="py-1">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:bg-accent transition-colors"
            >
              <code className="rounded border border-primary/25 bg-primary/10 px-1 font-mono text-[11px] text-primary">
                {`{{${key}}}`}
              </code>
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-border/60 px-3 py-1.5">
        <button
          type="button"
          onClick={onClose}
          className="text-xs py-0.5 px-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {messages.common.close}
        </button>
      </div>
    </div>
  )
}

/**
 * Renders subject string — plain text stays as span, {{key}} becomes a styled code tag.
 * Used for display-only (not editing). No real sample values — those come in Iter 3/4.
 */
function renderSubjectWithVars(s: string): React.ReactNode {
  const parts = s.split(/({{[^}]+}})/g)
  return parts.map((part, i) => {
    const match = part.match(/^{{(.+)}}$/)
    if (match) {
      return (
        <code
          key={`${i}-${part.slice(0, 8)}`}
          className="rounded border border-primary/25 bg-primary/10 px-1 font-mono text-[11px] text-primary"
        >
          {match[1]}
        </code>
      )
    }
    return <span key={`${i}-${String(part).slice(0, 8)}`}>{part}</span>
  })
}

// ---------------------------------------------------------------------------
// EmailFrame — white email body with blocks + insert zones
// ---------------------------------------------------------------------------

interface EmailFrameProps {
  blocks: Block[]
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
  onAddAt: (type: BlockType, index: number) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  viewport: 'desktop' | 'mobile'
}

function EmailFrame({
  blocks,
  selectedBlockId,
  setSelectedBlockId,
  onAddAt,
  onDelete,
  onDuplicate,
  onMove,
  viewport,
}: EmailFrameProps) {
  const maxWidth = viewport === 'mobile' ? 'max-w-[390px]' : 'max-w-[640px]'

  return (
    <div
      className={`mx-auto ${maxWidth} rounded-lg border border-border/60 bg-white shadow-md transition-all duration-200`}
    >
      {blocks.length === 0 ? (
        <EmptyEmailState />
      ) : (
        <>
          <InsertZone index={0} onAdd={onAddAt} />
          {blocks.map((block, i) => (
            <Fragment key={block.id}>
              <BlockOnCanvas
                block={block}
                selected={selectedBlockId === block.id}
                isFirst={i === 0}
                isLast={i === blocks.length - 1}
                onSelect={() => setSelectedBlockId(block.id)}
                onDelete={() => onDelete(block.id)}
                onDuplicate={() => onDuplicate(block.id)}
                onMoveUp={() => onMove(block.id, -1)}
                onMoveDown={() => onMove(block.id, 1)}
              />
              <InsertZone index={i + 1} onAdd={onAddAt} />
            </Fragment>
          ))}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyEmailState
// ---------------------------------------------------------------------------

function EmptyEmailState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-full bg-muted/40 p-3">
        <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{messages.email.canvasEmptyTitle}</p>
      <p className="text-xs text-muted-foreground/70">{messages.email.canvasEmptyHint}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BlockOnCanvas — selectable wrapper with floating toolbar
// ---------------------------------------------------------------------------

interface BlockOnCanvasProps {
  block: Block
  selected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function BlockOnCanvas({
  block,
  selected,
  isFirst,
  isLast,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: BlockOnCanvasProps) {
  const entry = CMS_BLOCK_REGISTRY[block.type as keyof typeof CMS_BLOCK_REGISTRY]

  return (
    <div
      className={`relative transition-all cursor-pointer ${
        selected
          ? 'ring-2 ring-primary ring-inset'
          : 'hover:ring-1 hover:ring-primary/30 hover:ring-inset'
      }`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Floating toolbar — visible only when selected */}
      {selected && (
        <div className="absolute -top-9 left-0 right-0 flex items-center z-10 pointer-events-none">
          <div className="mx-auto flex items-center rounded-md border border-border bg-popover shadow-md px-1 gap-0.5 pointer-events-auto">
            <span className="px-2 text-[11px] text-muted-foreground">
              {entry?.label ?? block.type}
            </span>
            <div className="h-3 w-px bg-border/60" />
            <IconBtn
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label={messages.email.canvasMoveUp}
            >
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
            </IconBtn>
            <IconBtn
              onClick={onMoveDown}
              disabled={isLast}
              aria-label={messages.email.canvasMoveDown}
            >
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </IconBtn>
            <IconBtn onClick={onDuplicate} aria-label={messages.email.canvasDuplicate}>
              <Copy className="h-3 w-3" aria-hidden="true" />
            </IconBtn>
            <div className="h-3 w-px bg-border/60" />
            <IconBtn
              onClick={onDelete}
              aria-label={messages.email.canvasDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </IconBtn>
          </div>
        </div>
      )}
      <CanvasBlockRenderer block={block} isLast={isLast} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// IconBtn — ghost xs button for floating toolbar
// ---------------------------------------------------------------------------

interface IconBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

function IconBtn({ children, disabled, className = '', ...props }: IconBtnProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      className={`flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// CanvasBlockRenderer — renders a block using @agency/email renderBlock
// ---------------------------------------------------------------------------

function CanvasBlockRenderer({ block, isLast }: { block: Block; isLast: boolean }) {
  // Pass paddingBottom so the canvas preview shows the same vertical rhythm
  // (marginBottom preset) as the rendered email HTML. Last block gets 0 to
  // avoid trailing whitespace.
  const paddingBottom = isLast ? 0 : resolveBlockMarginBottom(block)
  // The resolved theme map (from the picked theme_id) recolours token-based
  // block colours live — same map the server bakes into html_body at save.
  const theme = useEmailThemeMap()
  const rendered = renderBlock(block, paddingBottom, theme)
  if (!rendered) {
    return (
      <div className="py-4 px-6 text-xs text-muted-foreground italic text-center">
        {messages.email.canvasBlockUnknown}: {block.type}
      </div>
    )
  }
  return rendered
}

// ---------------------------------------------------------------------------
// InsertZone — hover-revealed + button for inserting a block at index
// ---------------------------------------------------------------------------

interface InsertZoneProps {
  index: number
  onAdd: (type: BlockType, index: number) => void
}

function InsertZone({ index, onAdd }: InsertZoneProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`group relative transition-all ${open ? 'py-1' : 'py-0.5'}`}>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex-1 h-px bg-primary/30" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={messages.email.canvasInsertBlock}
          aria-expanded={open}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
        </button>
        <div className="flex-1 h-px bg-primary/30" />
      </div>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 top-full">
          <AddBlockPopover
            onPick={(type) => {
              onAdd(type, index)
              setOpen(false)
            }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
