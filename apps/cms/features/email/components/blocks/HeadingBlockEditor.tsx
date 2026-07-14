import { useRef } from 'react'
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '../VariableInserter'
import type { HeadingBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface HeadingBlockEditorProps {
  block: HeadingBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

// Phase 3 (AAA-T-221, design review fix P0-1) — text color moved fully to
// BlockTypography mixin (Inspector "Typografia" section). Legacy `block.color`
// field retained in interface for backward compat with existing JSONB rows,
// but no longer exposed in this editor — renderer merges legacy + mixin so old
// data still paints correctly. Block-specific `textAlign` already moved to
// mixin earlier in Phase 3.
export function HeadingBlockEditor({ block, onChange, variables = [] }: HeadingBlockEditorProps) {
  const textRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {/* Tekst nagłówka */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-text`}>Tekst nagłówka</Label>
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
          placeholder="Wpisz treść nagłówka…"
        />
      </div>

      {/* Poziom */}
      <div>
        <Label htmlFor={`${block.id}-level`} className="mb-1.5 block">Poziom</Label>
        <Select
          value={block.level}
          onValueChange={(val) => onChange({ ...block, level: val as HeadingBlock['level'] })}
        >
          <SelectTrigger id={`${block.id}-level`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h1">H1 — Tytuł główny</SelectItem>
            <SelectItem value="h2">H2 — Podtytuł</SelectItem>
            <SelectItem value="h3">H3 — Nagłówek sekcji</SelectItem>
            <SelectItem value="eyebrow">{messages.email.inspectorHeadingLevelEyebrow}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
