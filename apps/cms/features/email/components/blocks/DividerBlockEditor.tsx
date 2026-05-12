import { Label } from '@agency/ui'
import { ColorPicker } from '@/components/ui/color-picker'
import type { DividerBlock, Block } from '../../types'

interface DividerBlockEditorProps {
  block: DividerBlock
  onChange: (updated: Block) => void
}

export function DividerBlockEditor({ block, onChange }: DividerBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${block.id}-color`}>Kolor linii</Label>
        <ColorPicker
          id={`${block.id}-color`}
          label="Kolor linii rozdzielającej"
          value={block.color}
          onChange={(color) => onChange({ ...block, color })}
        />
      </div>
    </div>
  )
}
