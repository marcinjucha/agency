import { useState, useRef, useEffect, useLayoutEffect, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ListChecks, Search, X } from 'lucide-react'
import { BLOCK_GROUPS, type CmsBlockRegistryEntry } from '../../block-registry'
import { messages } from '@/lib/messages'
import { BONUS_LIST_PICK, type AddBlockPick, type BlockType } from '../../types'

interface AddBlockPopoverProps {
  onPick: (pick: AddBlockPick) => void
  onClose: () => void
  style?: CSSProperties
  /** Block types to exclude from the picker (e.g. ['columns'] inside a ColumnsBlock — max nesting = 1). */
  exclude?: ReadonlyArray<BlockType>
  /**
   * Show the "Lista bonusów" affordance — a shortcut that inserts a pre-filled
   * text block carrying the {{bonus_list}} marker (NOT a registry block type).
   * Defaults to true; nested contexts (columns) omit it (default off there).
   */
  showBonusList?: boolean
  /**
   * Optional anchor element for PORTAL mode. When provided, the popover
   * renders into document.body with `position: fixed`, positioned below the
   * anchor element. Use this when the popover would otherwise be clipped by
   * an ancestor `overflow: hidden` (e.g. inside a CollapsibleCard's content).
   *
   * Without anchorRef: popover renders inline (caller is responsible for
   * wrapping in a positioned container).
   */
  anchorRef?: RefObject<HTMLElement | null>
}

export function AddBlockPopover({
  onPick,
  onClose,
  style,
  exclude,
  anchorRef,
  showBonusList = true,
}: AddBlockPopoverProps) {
  const [query, setQuery] = useState('')
  const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Compute fixed position from the anchor's bounding rect when in portal mode.
  // useLayoutEffect avoids a flash of unstyled popover before measurement.
  useLayoutEffect(() => {
    if (!anchorRef?.current) {
      setPortalStyle(null)
      return
    }
    const r = anchorRef.current.getBoundingClientRect()
    setPortalStyle({
      position: 'fixed',
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
      zIndex: 60,
    })
    // No resize listener — popover is short-lived (closes on outside click /
    // pick / Escape). Re-opening recomputes on the next render.
  }, [anchorRef])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      // Ignore clicks on the anchor itself (it toggles the popover).
      if (anchorRef?.current?.contains(target)) return
      onClose()
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
  }, [onClose, anchorRef])

  const ql = query.trim().toLowerCase()
  const excluded = new Set(exclude ?? [])

  function matches(entry: CmsBlockRegistryEntry): boolean {
    if (excluded.has(entry.id as BlockType)) return false
    if (!ql) return true
    return (
      entry.label.toLowerCase().includes(ql) ||
      entry.description.toLowerCase().includes(ql)
    )
  }

  const mergedStyle: CSSProperties | undefined = portalStyle ?? style

  const content = (
    <div
      ref={ref}
      style={mergedStyle}
      className="max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-50"
    >
      <div className="sticky top-0 flex items-center gap-1.5 border-b border-border bg-popover px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={messages.email.addBlockSearch}
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={messages.email.addBlockClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {BLOCK_GROUPS.map((group) => {
        const items = group.blocks.filter(matches)
        if (items.length === 0) return null
        return (
          <div key={group.id} className="py-1">
            <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            {items.map((entry) => {
              const Icon = entry.icon
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onPick(entry.id)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/40 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{entry.label}</p>
                    {entry.description && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {entry.description}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}

      {/* "Lista bonusów" — a SHORTCUT (not a registry block type) that inserts a
          text block pre-filled with the {{bonus_list}} marker, killing the typo
          risk of hand-typing it. Routed through the same onPick path via a sentinel. */}
      {showBonusList &&
        (!ql ||
          messages.email.bonusListBlockLabel.toLowerCase().includes(ql) ||
          messages.email.bonusListBlockDescription.toLowerCase().includes(ql)) && (
          <div className="py-1 border-t border-border/60">
            <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {messages.email.bonusListGroupLabel}
            </p>
            <button
              type="button"
              onClick={() => onPick(BONUS_LIST_PICK)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent transition-colors"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/40 text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {messages.email.bonusListBlockLabel}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {messages.email.bonusListBlockDescription}
                </p>
              </div>
            </button>
          </div>
        )}
    </div>
  )

  // Portal mode: render at document.body so the popover escapes any
  // ancestor `overflow: hidden` (CollapsibleCard, etc.). Triggered when
  // caller provided anchorRef — portalStyle is set in useLayoutEffect.
  if (anchorRef && portalStyle) {
    return createPortal(content, document.body)
  }

  return content
}
