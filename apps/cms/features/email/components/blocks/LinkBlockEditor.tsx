import { useRef } from 'react'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '../VariableInserter'
import type { LinkBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

// LinkBlockEditor (Iter 3) — lustrzane odbicie CtaBlockEditor bez pól
// specyficznych dla przycisku (width/kolory — link jest typograficzny, kolor
// żyje w sekcji "Tekst" Inspectora). Tekst + URL z obsługą {{zmiennych}}.
export function LinkBlockEditor({ block, onChange, variables = [] }: LinkBlockEditorProps) {
  const labelRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {/* Tekst linku */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-label`}>{messages.email.inspectorLinkLabel}</Label>
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
          placeholder={messages.email.inspectorLinkLabelPlaceholder}
        />
      </div>

      {/* URL */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-url`}>{messages.email.inspectorLinkUrl}</Label>
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
          placeholder={messages.email.inspectorLinkUrlPlaceholder}
        />
      </div>
    </div>
  )
}

interface LinkBlockEditorProps {
  block: LinkBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}
