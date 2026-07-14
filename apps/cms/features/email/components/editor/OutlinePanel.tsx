import { useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import { Button } from '@agency/ui'
import { CMS_BLOCK_REGISTRY } from '../../block-registry'
import { messages } from '@/lib/messages'
import type { AddBlockPick, Block } from '../../types'
import { countBlocksDeep } from '../../utils/block-tree'
import { AddBlockPopover } from './AddBlockPopover'

interface OutlinePanelProps {
  blocks: Block[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdd: (pick: AddBlockPick) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onReorder: (from: number, to: number) => void
}

export function OutlinePanel({
  blocks,
  selectedId,
  onSelect,
  onAdd,
  onReorder,
}: OutlinePanelProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overPos, setOverPos] = useState<'before' | 'after' | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  function resetDrag() {
    setDragId(null)
    setOverId(null)
    setOverPos(null)
  }

  return (
    <aside className="flex flex-col border-r border-border bg-card/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {messages.email.outlineTitle}
        </span>
        {/* Licznik WSZYSTKICH bloków (z zagnieżdżonymi dziećmi sekcji/kolumn) —
            płaski blocks.length kłamałby po wprowadzeniu sekcji. */}
        <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {countBlocksDeep(blocks)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        {blocks.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {messages.email.outlineEmpty}
          </p>
        ) : (
          blocks.map((block) => (
            <OutlineNode
              key={block.id}
              block={block}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              isDragging={dragId === block.id}
              isOver={overId === block.id}
              overPos={overPos}
              onDragStart={() => setDragId(block.id)}
              onDragOver={(pos) => {
                if (!dragId || dragId === block.id) return
                setOverId(block.id)
                setOverPos(pos)
              }}
              onDrop={() => {
                if (!dragId || dragId === block.id) {
                  resetDrag()
                  return
                }
                const from = blocks.findIndex((b) => b.id === dragId)
                let to = blocks.findIndex((b) => b.id === block.id)
                if (overPos === 'after') to += 1
                if (from < to) to -= 1
                if (from >= 0 && to >= 0 && from !== to) onReorder(from, to)
                resetDrag()
              }}
              onDragEnd={resetDrag}
            />
          ))
        )}
      </div>

      <div className="relative border-t border-border/60 p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd((v) => !v)}
          className="w-full justify-center gap-1.5"
          aria-expanded={showAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{messages.email.addBlock}</span>
        </Button>

        {showAdd && (
          <div className="absolute bottom-full left-2 right-2 mb-1.5 z-50">
            <AddBlockPopover
              onPick={(type) => {
                onAdd(type)
                setShowAdd(false)
              }}
              onClose={() => setShowAdd(false)}
            />
          </div>
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// OutlineNode — rekurencyjny węzeł drzewa: rząd bloku + (dla sekcji) wcięte
// rzędy dzieci. Drag&drop TYLKO na najwyższym poziomie (depth 0) — przenoszenie
// zagnieżdżonych rzędów / cross-parent jest poza zakresem Iter 2 (świadome
// cięcie; kolejność wewnątrz sekcji zmieniają strzałki na canvasie). Dzieci
// kolumn pozostają ukryte (jak dotychczas) — sekcje są warstwą kompozycji.
// ---------------------------------------------------------------------------

interface OutlineNodeProps {
  block: Block
  depth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  isDragging: boolean
  isOver: boolean
  overPos: 'before' | 'after' | null
  onDragStart: () => void
  onDragOver: (pos: 'before' | 'after') => void
  onDrop: () => void
  onDragEnd: () => void
}

function OutlineNode({
  block,
  depth,
  selectedId,
  onSelect,
  isDragging,
  isOver,
  overPos,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: OutlineNodeProps) {
  const sectionChildren = block.type === 'section' ? (block.children as Block[]) : []

  return (
    <>
      <OutlineRow
        block={block}
        depth={depth}
        draggable={depth === 0}
        isSelected={selectedId === block.id}
        isDragging={isDragging}
        isOver={isOver}
        overPos={overPos}
        onSelect={() => onSelect(block.id)}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      />
      {sectionChildren.map((child) => (
        <OutlineNode
          key={child.id}
          block={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          // Zagnieżdżone rzędy nie uczestniczą w top-level drag&drop.
          isDragging={false}
          isOver={false}
          overPos={null}
          onDragStart={noop}
          onDragOver={noop}
          onDrop={noop}
          onDragEnd={noop}
        />
      ))}
    </>
  )
}

function noop() {}

// ---------------------------------------------------------------------------
// OutlineRow — single block entry in the outline list
// ---------------------------------------------------------------------------

interface OutlineRowProps {
  block: Block
  depth: number
  draggable: boolean
  isSelected: boolean
  isDragging: boolean
  isOver: boolean
  overPos: 'before' | 'after' | null
  onSelect: () => void
  onDragStart: () => void
  onDragOver: (pos: 'before' | 'after') => void
  onDrop: () => void
  onDragEnd: () => void
}

// Wcięcie per poziom zagnieżdżenia — statyczne klasy (Tailwind nie widzi
// dynamicznych stringów). MAX_SECTION_DEPTH=2 → maks. depth 2 w praktyce.
const DEPTH_INDENT_CLASS: Record<number, string> = {
  0: '',
  1: 'ml-5',
  2: 'ml-10',
}

function OutlineRow({
  block,
  depth,
  draggable,
  isSelected,
  isDragging,
  isOver,
  overPos,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: OutlineRowProps) {
  const entry = CMS_BLOCK_REGISTRY[block.type]
  const Icon = entry?.icon
  const summary = entry?.getSummary(block) ?? ''
  const label = entry?.label ?? block.type

  const indicatorBefore = isOver && overPos === 'before'
  const indicatorAfter = isOver && overPos === 'after'
  const indent = DEPTH_INDENT_CLASS[depth] ?? 'ml-10'

  return (
    <div
      draggable={draggable}
      aria-level={depth + 1}
      onDragStart={(e) => {
        if (!draggable) return
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={(e) => {
        if (!draggable) return
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        const pos: 'before' | 'after' =
          e.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
        onDragOver(pos)
      }}
      onDrop={(e) => {
        if (!draggable) return
        e.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group relative mx-1.5 my-0.5 ${indent} flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-transparent hover:bg-card/60 hover:border-border/40 text-foreground'
      } ${isDragging ? 'opacity-40' : ''} ${
        indicatorBefore
          ? 'before:absolute before:left-0 before:right-0 before:-top-px before:h-0.5 before:bg-primary before:rounded-full'
          : ''
      } ${
        indicatorAfter
          ? 'after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:bg-primary after:rounded-full'
          : ''
      }`}
    >
      {draggable && (
        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50 cursor-grab" />
      )}
      {Icon && (
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            isSelected ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        {summary && (
          <p className="text-[11px] text-muted-foreground truncate">{summary}</p>
        )}
      </div>
    </div>
  )
}

