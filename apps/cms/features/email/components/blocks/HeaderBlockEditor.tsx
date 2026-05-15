import { useRef } from 'react'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '../VariableInserter'
import type { HeaderBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

// Phase 3 (AAA-T-221, design review fix P0-1) — "Kolor tekstu" moved to
// BlockTypography mixin (Inspector "Typografia").
// Phase 4 (AAA-T-221) — "Kolor tła" moved to BlockBorder mixin (Inspector
// "Bordery i tło"). HeaderBlockEditor only owns the company name. Legacy
// `block.textColor` / `block.backgroundColor` retained on the type for
// backward compat with existing JSONB rows.
export function HeaderBlockEditor({ block, onChange, variables = [] }: HeaderBlockEditorProps) {
  const companyNameRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {/* Nazwa firmy (P2-1: label moved to messages.ts) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-company-name`}>
            {messages.email.inspectorHeaderCompanyName}
          </Label>
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
    </div>
  )
}

interface HeaderBlockEditorProps {
  block: HeaderBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}
