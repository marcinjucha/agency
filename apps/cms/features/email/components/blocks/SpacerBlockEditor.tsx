import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agency/ui'
import type { SpacerBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface SpacerBlockEditorProps {
  block: SpacerBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function SpacerBlockEditor({ block, onChange }: SpacerBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${block.id}-size`} className="mb-1.5 block">Rozmiar odstępu</Label>
        <Select
          value={block.size}
          onValueChange={(val) => onChange({ ...block, size: val as SpacerBlock['size'] })}
        >
          <SelectTrigger id={`${block.id}-size`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">S — 16px</SelectItem>
            <SelectItem value="md">M — 32px</SelectItem>
            <SelectItem value="lg">L — 64px</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
