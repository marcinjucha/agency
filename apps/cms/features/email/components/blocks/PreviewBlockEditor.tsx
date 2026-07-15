import { useRef } from 'react'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '../VariableInserter'
import type { PreviewBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

// PreviewBlockEditor (Iter 3) — pojedyncze pole tekstowe preheadera + hint.
// Blok renderuje się jako UKRYTY <Preview> w mailu (snippet skrzynki), więc
// edytor jest jedynym miejscem, gdzie treść jest widoczna wprost.
export function PreviewBlockEditor({ block, onChange, variables = [] }: PreviewBlockEditorProps) {
  const textRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-text`}>{messages.email.inspectorPreviewText}</Label>
          <VariableInserter
            variables={variables}
            inputRef={textRef}
            onChange={(val) => onChange({ ...block, text: val })}
            currentValue={block.text}
          />
        </div>
        <Input
          ref={textRef}
          id={`${block.id}-text`}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder={messages.email.inspectorPreviewTextPlaceholder}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {messages.email.inspectorPreviewTextHint}
        </p>
      </div>
    </div>
  )
}

interface PreviewBlockEditorProps {
  block: PreviewBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}
