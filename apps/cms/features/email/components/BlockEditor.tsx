import { CMS_BLOCK_REGISTRY } from '../block-registry'
import type { Block } from '../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface BlockEditorProps {
  block: Block
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

/**
 * Registry-driven dispatcher bloków emaila.
 * Zamiast switch(block.type) używa CMS_BLOCK_REGISTRY do wyszukania
 * odpowiedniego EditorComponent dla danego typu bloku.
 *
 * Dodanie nowego typu bloku = dodanie wpisu do CMS_BLOCK_REGISTRY,
 * bez modyfikacji tego pliku.
 */
export function BlockEditor({ block, onChange, variables = [] }: BlockEditorProps) {
  const entry = CMS_BLOCK_REGISTRY[block.type]

  if (!entry) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        Nieznany typ bloku: <span className="font-mono">{block.type}</span>
      </div>
    )
  }

  const { EditorComponent } = entry

  return <EditorComponent block={block} onChange={onChange} variables={variables} />
}
