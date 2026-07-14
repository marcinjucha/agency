/**
 * ColumnsBlockEditor — edytor dwukolumnowego layoutu.
 *
 * Dwa panele (lewa/prawa kolumna), każdy z:
 *   - listą zagnieżdżonych bloków (compact list, expandable inline)
 *   - JEDNYM przyciskiem "+ Dodaj blok" → AddBlockPopover (jak w głównym canvasie)
 *
 * Max nesting = 1: AddBlockPopover wyklucza type 'columns'.
 *
 * Layout: kolumny w inspectorze stackują się PIONOWO (kolumna pełnej szerokości),
 * NIE side-by-side. Inspector ma ~360px szerokości — wstawienie 2 RichText editorów
 * obok siebie kompletnie się nie mieści. Stack daje każdemu edytorowi pełną
 * szerokość panelu.
 */

import { useState, useRef, type ReactNode } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from 'lucide-react'
import { Button } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { ColumnsBlock, NonColumnsBlock, Block, BlockType } from '../../types'
import { BONUS_LIST_PICK } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'
import { CMS_BLOCK_REGISTRY } from '../../block-registry'
import { BlockEditor } from '../BlockEditor'
import { AddBlockPopover } from '../editor/AddBlockPopover'
import { SegmentedControl } from '../editor/controls/SegmentedControl'

interface ColumnsBlockEditorProps {
  block: ColumnsBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

// Excluded when adding a block INSIDE a Columns block (max nesting = 1).
const EXCLUDED_NESTED_TYPES: ReadonlyArray<BlockType> = ['columns']

// --- ColumnPanel: jeden panel kolumny (lewa lub prawa) ---

interface ColumnPanelProps {
  label: string
  children: NonColumnsBlock[]
  onChange: (updated: NonColumnsBlock[]) => void
  variables: TriggerVariable[]
}

function ColumnPanel({ label, children, onChange, variables }: ColumnPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Anchor for AddBlockPopover portal mode — needed because the inspector
  // wraps each section in a CollapsibleCard with `overflow: hidden`, which
  // would otherwise clip an inline-absolute popover.
  const addBtnRef = useRef<HTMLButtonElement>(null)

  function addBlock(type: BlockType) {
    const entry = CMS_BLOCK_REGISTRY[type]
    if (!entry || type === 'columns') return

    const id = crypto.randomUUID()
    const newBlock = { id, ...entry.defaultValue } as NonColumnsBlock
    onChange([...children, newBlock])
    setExpandedId(id)
    setPickerOpen(false)
  }

  function updateBlock(updated: Block) {
    onChange(children.map((b) => (b.id === updated.id ? (updated as NonColumnsBlock) : b)))
  }

  function deleteBlock(id: string) {
    onChange(children.filter((b) => b.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <span className="text-[11px] text-muted-foreground/60">
          {children.length === 0
            ? messages.email.columnsColumnCountEmpty
            : `${children.length} ${children.length === 1 ? messages.email.columnsColumnCountOne : messages.email.columnsColumnCountMany}`}
        </span>
      </div>

      {/* Lista zagnieżdżonych bloków (compact rows, expand inline on click) */}
      {children.length === 0 ? (
        <div className="text-[11px] text-muted-foreground py-2 text-center border border-dashed border-border rounded-md bg-muted/10">
          {messages.email.columnsEmptyColumnHint}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {children.map((block) => {
            const entry = CMS_BLOCK_REGISTRY[block.type]
            const Icon = entry?.icon
            const isExpanded = expandedId === block.id

            return (
              <div key={block.id} className="rounded border border-border bg-card">
                {/* Compact row */}
                <div className="flex items-center gap-1 px-2 py-1.5">
                  {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <button
                    type="button"
                    onClick={() => toggleExpand(block.id)}
                    aria-expanded={isExpanded}
                    className="flex-1 min-w-0 text-left text-xs text-muted-foreground truncate hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                  >
                    {entry?.getSummary(block) ?? block.type}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteBlock(block.id)}
                    aria-label={`${messages.email.columnsRemoveBlockAria} ${entry?.label ?? block.type}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    onClick={() => toggleExpand(block.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? messages.email.columnsCollapseBlockAria : messages.email.columnsExpandBlockAria}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Inline editor (expanded only when this row is selected) */}
                {isExpanded && (
                  <div className="border-t border-border px-2 pb-2 pt-2 bg-muted/20">
                    <BlockEditor block={block} onChange={updateBlock} variables={variables} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Single "+ Dodaj blok" → AddBlockPopover (matches main canvas pattern).
          Portal mode (anchorRef) — escapes the CollapsibleCard's overflow:hidden. */}
      <Button
        ref={addBtnRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full text-xs gap-1.5 border-dashed"
        onClick={() => setPickerOpen((v) => !v)}
        aria-expanded={pickerOpen}
        aria-haspopup="menu"
      >
        <Plus className="h-3 w-3" />
        {messages.email.columnsAddBlock}
      </Button>
      {pickerOpen && (
        <AddBlockPopover
          // Nested columns never host the {{bonus_list}} marker (the send-path
          // splicer only scans top-level blocks) → hide the bonus-list shortcut.
          showBonusList={false}
          onPick={(pick) => {
            if (pick !== BONUS_LIST_PICK) addBlock(pick)
          }}
          onClose={() => setPickerOpen(false)}
          exclude={EXCLUDED_NESTED_TYPES}
          anchorRef={addBtnRef}
        />
      )}
    </div>
  )
}

// --- ColumnsBlockEditor ---

export function ColumnsBlockEditor({ block, onChange, variables = [] }: ColumnsBlockEditorProps) {
  function updateLeft(updated: NonColumnsBlock[]) {
    onChange({ ...block, leftChildren: updated })
  }

  function updateRight(updated: NonColumnsBlock[]) {
    onChange({ ...block, rightChildren: updated })
  }

  // SegmentedControl options for gap (between columns) — width-bars icon
  // grows with preset (8/16/32px). Label below shows pixel value.
  const gapOptions: ReadonlyArray<{ value: ColumnsBlock['gap']; label: string; icon: ReactNode }> = [
    { value: 'sm', label: '8px', icon: <GapIcon size="sm" title="8px" /> },
    { value: 'md', label: '16px', icon: <GapIcon size="md" title="16px" /> },
    { value: 'lg', label: '32px', icon: <GapIcon size="lg" title="32px" /> },
  ]

  // SegmentedControl options for vertical alignment — lucide icons that
  // visually mirror top/middle/bottom row-content alignment.
  const valignOptions: ReadonlyArray<{
    value: ColumnsBlock['verticalAlign']
    label: string
    icon: ReactNode
  }> = [
    { value: 'top', label: messages.email.columnsValignTop, icon: <AlignVerticalJustifyStart className="h-3.5 w-3.5" /> },
    { value: 'middle', label: messages.email.columnsValignMiddle, icon: <AlignVerticalJustifyCenter className="h-3.5 w-3.5" /> },
    { value: 'bottom', label: messages.email.columnsValignBottom, icon: <AlignVerticalJustifyEnd className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Inline rows — label left, compact SegmentedControl right.
          Same pattern as Figma's right-panel "Auto layout" / "Constraints"
          sections. Tighter than stacked grid-cols-2 selects, no truncated
          labels, all options visible at a glance. */}
      <div className="space-y-2.5">
        <InlineRow label={messages.email.columnsGapLabel}>
          <SegmentedControl<ColumnsBlock['gap']>
            value={block.gap}
            onChange={(val) => onChange({ ...block, gap: val })}
            options={gapOptions}
            aria-label={messages.email.columnsGapAriaLabel}
          />
        </InlineRow>
        <InlineRow label={messages.email.columnsValignLabel}>
          <SegmentedControl<ColumnsBlock['verticalAlign']>
            value={block.verticalAlign}
            onChange={(val) => onChange({ ...block, verticalAlign: val })}
            options={valignOptions}
            aria-label={messages.email.columnsValignAriaLabel}
          />
        </InlineRow>
      </div>

      {/* Kolumny — stacked vertically (panel ~360px wide, side-by-side miscompresses RichTextEditor) */}
      <div className="space-y-4">
        <ColumnPanel
          label={messages.email.columnsLeftColumn}
          children={block.leftChildren}
          onChange={updateLeft}
          variables={variables}
        />
        <ColumnPanel
          label={messages.email.columnsRightColumn}
          children={block.rightChildren}
          onChange={updateRight}
          variables={variables}
        />
      </div>
    </div>
  )
}

/**
 * InlineRow — label left, control right (Figma right-panel pattern).
 * Quieter than a full label-above-input stack; lets compact segmented
 * controls fit beside a tiny descriptor.
 */
function InlineRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/**
 * GapIcon — two short vertical bars with horizontal gap that grows with size.
 * Visual semantic for column gap preset (8/16/32 px).
 */
function GapIcon({ size, title }: { size: 'sm' | 'md' | 'lg'; title: string }) {
  const gapClass = size === 'sm' ? 'w-[2px]' : size === 'md' ? 'w-[5px]' : 'w-[9px]'
  return (
    <span
      title={title}
      aria-hidden="true"
      className="inline-flex h-3.5 w-3.5 items-center justify-center"
    >
      <span className="flex items-center">
        <span className="h-3 w-[2px] rounded-[1px] bg-current/70" />
        <span className={gapClass} />
        <span className="h-3 w-[2px] rounded-[1px] bg-current/70" />
      </span>
    </span>
  )
}
