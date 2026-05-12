import { useRef } from 'react'
import { Label, Textarea } from '@agency/ui'
import { VariableInserter } from '../VariableInserter'
import type { FooterBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface FooterBlockEditorProps {
  block: FooterBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function FooterBlockEditor({ block, onChange, variables = [] }: FooterBlockEditorProps) {
  const textRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-text`}>Tekst stopki</Label>
          <VariableInserter
            variables={variables}
            inputRef={textRef}
            onChange={(val) => onChange({ ...block, text: val })}
            currentValue={block.text}
          />
        </div>
        <Textarea
          ref={textRef}
          id={`${block.id}-text`}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          className="min-h-[80px] text-xs"
          placeholder="Wiadomość wysłana automatycznie. Prosimy nie odpowiadać na ten email."
        />
      </div>
    </div>
  )
}
