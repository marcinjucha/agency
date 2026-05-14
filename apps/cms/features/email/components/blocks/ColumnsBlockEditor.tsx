/**
 * ColumnsBlockEditor — edytor dwukolumnowego layoutu.
 *
 * Dwa panele (lewa/prawa kolumna), każdy z:
 *   - mini-paletą bloków (tylko non-columns, bez zagnieżdżania columns w columns)
 *   - listą zagnieżdżonych bloków edytowalnych przez BlockEditor
 *
 * Max nesting = 1: mini-paleta filtruje type !== 'columns' z CMS_BLOCK_REGISTRY.
 */

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import type { ColumnsBlock, NonColumnsBlock, Block, BlockType } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'
import { CMS_BLOCK_REGISTRY } from '../../block-registry'
import { BlockEditor } from '../BlockEditor'
import { cn } from '@agency/ui'

interface ColumnsBlockEditorProps {
  block: ColumnsBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

// Typy bloków dostępne w kolumnach — wyklucza 'columns' (max nesting = 1).
// Lazy getter (NIE top-level const): block-registry.ts importuje ColumnsBlockEditor,
// więc top-level Object.values(CMS_BLOCK_REGISTRY) tworzy TDZ ("Cannot access ... before initialization").
function getNonColumnsEntries() {
  return Object.values(CMS_BLOCK_REGISTRY).filter((entry) => entry.id !== 'columns')
}

// --- ColumnPanel: jeden panel kolumny (lewa lub prawa) ---

interface ColumnPanelProps {
  label: string
  children: NonColumnsBlock[]
  onChange: (updated: NonColumnsBlock[]) => void
  variables: TriggerVariable[]
}

function ColumnPanel({ label, children, onChange, variables }: ColumnPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function addBlock(type: BlockType) {
    const entry = CMS_BLOCK_REGISTRY[type]
    if (!entry || type === 'columns') return

    const id = crypto.randomUUID()
    const newBlock = { id, ...entry.defaultValue } as NonColumnsBlock
    onChange([...children, newBlock])
    setExpandedId(id)
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
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>

      {/* Lista zagnieżdżonych bloków */}
      {children.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-md">
          Brak bloków
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {children.map((block) => {
            const entry = CMS_BLOCK_REGISTRY[block.type]
            const Icon = entry?.icon
            const isExpanded = expandedId === block.id

            return (
              <div
                key={block.id}
                className="rounded border border-border bg-card"
              >
                {/* Nagłówek mini-bloku */}
                <div className="flex items-center h-9 gap-1 px-2">
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
                    aria-label={`Usuń ${entry?.label ?? block.type}`}
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
                    aria-label={isExpanded ? 'Zwiń' : 'Rozwiń'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Edytor bloku */}
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

      {/* Mini-paleta — tylko non-columns */}
      <div className="flex flex-wrap gap-1 pt-1">
        {getNonColumnsEntries().map((entry) => {
          const Icon = entry.icon
          return (
            <Button
              key={entry.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => addBlock(entry.id as BlockType)}
              aria-label={`Dodaj blok ${entry.label}`}
            >
              <Plus className="h-3 w-3" />
              <Icon className="h-3 w-3" />
              {entry.label}
            </Button>
          )
        })}
      </div>
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

  return (
    <div className="space-y-4">
      {/* Opcje układu */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${block.id}-gap`} className="mb-1.5 block">
            Odstęp między kolumnami
          </Label>
          <Select
            value={block.gap}
            onValueChange={(val) => onChange({ ...block, gap: val as ColumnsBlock['gap'] })}
          >
            <SelectTrigger id={`${block.id}-gap`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">S — 8px</SelectItem>
              <SelectItem value="md">M — 16px</SelectItem>
              <SelectItem value="lg">L — 32px</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${block.id}-valign`} className="mb-1.5 block">
            Wyrównanie pionowe
          </Label>
          <Select
            value={block.verticalAlign}
            onValueChange={(val) =>
              onChange({ ...block, verticalAlign: val as ColumnsBlock['verticalAlign'] })
            }
          >
            <SelectTrigger id={`${block.id}-valign`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Góra</SelectItem>
              <SelectItem value="middle">Środek</SelectItem>
              <SelectItem value="bottom">Dół</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dwa panele kolumn */}
      <div className={cn('grid grid-cols-2 gap-3')}>
        <ColumnPanel
          label="Lewa kolumna"
          children={block.leftChildren}
          onChange={updateLeft}
          variables={variables}
        />
        <ColumnPanel
          label="Prawa kolumna"
          children={block.rightChildren}
          onChange={updateRight}
          variables={variables}
        />
      </div>
    </div>
  )
}
