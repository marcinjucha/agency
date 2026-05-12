import { useRef } from 'react'
import { Label, Textarea } from '@agency/ui'
import { VariableInserter } from '../VariableInserter'
import type { TextBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface TextBlockEditorProps {
  block: TextBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function TextBlockEditor({ block, onChange, variables = [] }: TextBlockEditorProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-content`}>Treść</Label>
          <VariableInserter
            variables={variables}
            inputRef={contentRef}
            onChange={(val) => onChange({ ...block, content: val })}
            currentValue={block.content}
          />
        </div>
        <Textarea
          ref={contentRef}
          id={`${block.id}-content`}
          value={block.content}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          className="min-h-[100px] font-mono text-xs"
          placeholder="Wpisz treść wiadomości. Możesz używać HTML i {{zmiennych}}."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Obsługuje podstawowy HTML i zmienne w formacie{' '}
          <span className="font-mono text-foreground/70">{'{{nazwa}}'}</span>
        </p>
      </div>
    </div>
  )
}
