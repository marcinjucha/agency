import { useRef } from 'react'
import { Input, Label } from '@agency/ui'
import { ColorPicker } from '@/components/ui/color-picker'
import { VariableInserter } from '../VariableInserter'
import type { HeaderBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface HeaderBlockEditorProps {
  block: HeaderBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function HeaderBlockEditor({ block, onChange, variables = [] }: HeaderBlockEditorProps) {
  const companyNameRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {/* Nazwa firmy */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-company-name`}>Nazwa firmy</Label>
          <VariableInserter
            variables={variables}
            inputRef={companyNameRef}
            onChange={(val) => onChange({ ...block, companyName: val })}
            currentValue={block.companyName}
          />
        </div>
        <Input
          ref={companyNameRef}
          id={`${block.id}-company-name`}
          value={block.companyName}
          onChange={(e) => onChange({ ...block, companyName: e.target.value })}
          placeholder="{{companyName}}"
        />
      </div>

      {/* Sekcja Styl */}
      <div className="pt-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Styl</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${block.id}-bg-color`} className="text-sm">Kolor tła</Label>
            <ColorPicker
              id={`${block.id}-bg-color`}
              label="Kolor tła nagłówka"
              value={block.backgroundColor}
              onChange={(color) => onChange({ ...block, backgroundColor: color })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`${block.id}-text-color`} className="text-sm">Kolor tekstu</Label>
            <ColorPicker
              id={`${block.id}-text-color`}
              label="Kolor tekstu nagłówka"
              value={block.textColor}
              onChange={(color) => onChange({ ...block, textColor: color })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
