import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button, Badge } from '@agency/ui'
import { BlockEditor } from './BlockEditor'
import { CMS_BLOCK_REGISTRY } from '../block-registry'
import type { Block, BlockType } from '../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'
import { cn } from '@agency/ui'

interface BlockListProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  variables?: TriggerVariable[]
}

// Streszczenie bloku delegowane do CMS_BLOCK_REGISTRY.getSummary — SSoT dla logiki opisu.

// --- Pojedynczy sortowalny blok ---

interface SortableBlockItemProps {
  block: Block
  isExpanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onUpdate: (updated: Block) => void
  variables: TriggerVariable[]
}

function SortableBlockItem({
  block,
  isExpanded,
  onToggle,
  onDelete,
  onUpdate,
  variables,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const entry = CMS_BLOCK_REGISTRY[block.type]
  const Icon = entry?.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-md border border-border bg-card transition-shadow',
        isDragging && 'shadow-lg z-50 ring-1 ring-ring'
      )}
    >
      {/* Nagłówek accordion — h-11 */}
      <div className="flex items-center h-11 gap-1 px-2">
        {/* Drag handle — widoczny przy hover */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Przeciągnij, aby zmienić kolejność"
          className="flex shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Badge z typem bloku */}
        <div className="flex items-center gap-1.5 shrink-0">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {entry?.label ?? block.type}
          </Badge>
        </div>

        {/* Summary line — truncate */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Zwiń blok' : 'Rozwiń blok'}
          className="flex-1 min-w-0 text-left px-2 text-xs text-muted-foreground truncate hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {CMS_BLOCK_REGISTRY[block.type]?.getSummary(block) ?? block.type}
        </button>

        {/* Delete button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onDelete(block.id)}
          aria-label={`Usuń blok ${entry?.label ?? block.type}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        {/* Expand toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Zwiń' : 'Rozwiń'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded: edytor bloku */}
      {isExpanded && (
        <div className="border-t border-border px-3 pb-3 pt-2.5 bg-muted/20">
          <BlockEditor block={block} onChange={onUpdate} variables={variables} />
        </div>
      )}
    </div>
  )
}

// --- BlockList ---

export function BlockList({ blocks, onChange, variables = [] }: BlockListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    onChange(arrayMove(blocks, oldIndex, newIndex))
  }

  function deleteBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function updateBlock(updated: Block) {
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)))
  }

  function addBlock(type: BlockType) {
    const entry = CMS_BLOCK_REGISTRY[type]
    if (!entry) return

    const id = crypto.randomUUID()
    const newBlock = { id, ...entry.defaultValue } as Block
    onChange([...blocks, newBlock])

    // Automatycznie rozwiń nowo dodany blok
    setExpandedId(id)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const blockIds = blocks.map((b) => b.id)

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Brak bloków. Dodaj pierwszy blok z palety po lewej.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {blocks.map((block) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  isExpanded={expandedId === block.id}
                  onToggle={() => toggleExpand(block.id)}
                  onDelete={deleteBlock}
                  onUpdate={updateBlock}
                  variables={variables}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// Eksportuj addBlock jako utility — używany przez EmailTemplateEditor do dodawania bloków z BlockPalette
export type { BlockListProps }
export { BlockList as default }
