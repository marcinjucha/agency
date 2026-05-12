import { useRef } from 'react'
import { Input, Label } from '@agency/ui'
import { ColorPicker } from '@/components/ui/color-picker'
import { VariableInserter } from '../VariableInserter'
import type { CtaBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface CtaBlockEditorProps {
  block: CtaBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function CtaBlockEditor({ block, onChange, variables = [] }: CtaBlockEditorProps) {
  const labelRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {/* Tekst przycisku */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-label`}>Tekst przycisku</Label>
          <VariableInserter
            variables={variables}
            inputRef={labelRef}
            onChange={(val) => onChange({ ...block, label: val })}
            currentValue={block.label}
          />
        </div>
        <Input
          ref={labelRef}
          id={`${block.id}-label`}
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Kliknij tutaj"
        />
      </div>

      {/* URL */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-url`}>URL</Label>
          <VariableInserter
            variables={variables}
            inputRef={urlRef}
            onChange={(val) => onChange({ ...block, url: val })}
            currentValue={block.url}
          />
        </div>
        <Input
          ref={urlRef}
          id={`${block.id}-url`}
          type="url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="https://example.com lub {{responseUrl}}"
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
              label="Kolor tła przycisku CTA"
              value={block.backgroundColor}
              onChange={(color) => onChange({ ...block, backgroundColor: color })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`${block.id}-text-color`} className="text-sm">Kolor tekstu</Label>
            <ColorPicker
              id={`${block.id}-text-color`}
              label="Kolor tekstu przycisku CTA"
              value={block.textColor}
              onChange={(color) => onChange({ ...block, textColor: color })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
