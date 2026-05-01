

import { Button } from '@agency/ui'
import { Card } from '@agency/ui'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import { BlockEditor } from './BlockEditor'
import { AVAILABLE_BLOCKS } from '../constants'
import type { Block } from '../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface BlockListProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  variables?: TriggerVariable[]
}

export function BlockList({ blocks, onChange, variables = [] }: BlockListProps) {
  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...blocks]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated)
  }

  function moveDown(index: number) {
    if (index === blocks.length - 1) return
    const updated = [...blocks]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated)
  }

  function deleteBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id))
  }

  function updateBlock(updated: Block) {
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)))
  }

  function addBlock(type: Block['type']) {
    const id = crypto.randomUUID()
    let newBlock: Block

    switch (type) {
      case 'header':
        newBlock = { id, type: 'header', companyName: '', backgroundColor: '#1a1a2e', textColor: '#ffffff' }
        break
      case 'text':
        newBlock = { id, type: 'text', content: '' }
        break
      case 'cta':
        newBlock = { id, type: 'cta', label: '', url: 'https://', backgroundColor: '#1a1a2e', textColor: '#ffffff' }
        break
      case 'divider':
        newBlock = { id, type: 'divider', color: '#e5e7eb' }
        break
      case 'footer':
        newBlock = {
          id,
          type: 'footer',
          text: 'Wiadomość wysłana automatycznie. Prosimy nie odpowiadać na ten email.',
        }
        break
    }

    onChange([...blocks, newBlock])
  }

  const blockTypeLabel = Object.fromEntries(AVAILABLE_BLOCKS.map((b) => [b.type, b.label]))

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Brak bloków. Dodaj pierwszy blok poniżej.
        </p>
      ) : (
        blocks.map((block, index) => (
          <Card key={block.id} className="p-0 overflow-hidden">
            {/* Block header row */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
              <span className="text-sm font-medium">{blockTypeLabel[block.type] ?? block.type}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  title="Przesuń w górę"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveDown(index)}
                  disabled={index === blocks.length - 1}
                  title="Przesuń w dół"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteBlock(block.id)}
                  title="Usuń blok"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Block editor body */}
            <div className="p-3">
              <BlockEditor block={block} onChange={updateBlock} variables={variables} />
            </div>
          </Card>
        ))
      )}

      {/* Add block palette */}
      <div className="flex flex-wrap gap-2 pt-1">
        {AVAILABLE_BLOCKS.map((available) => (
          <Button
            key={available.type}
            variant="outline"
            size="sm"
            onClick={() => addBlock(available.type as Block['type'])}
            className="flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            {available.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
