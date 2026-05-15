import { useRef } from 'react'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import { VariableInserter } from '../VariableInserter'
import { SegmentedControl } from '../editor/controls/SegmentedControl'
import type { CtaBlock, Block } from '../../types'
import type { CtaWidth } from '@agency/email'
import type { TriggerVariable } from '@/lib/trigger-schemas'

// Phase 3 (AAA-T-221, design review fix P0-1) — "Kolor tekstu" moved to
// BlockTypography mixin (Inspector "Typografia").
// Phase 4 (AAA-T-221) — "Kolor tła" moved to BlockBorder mixin (Inspector
// "Bordery i tło"). CtaBlockEditor now only owns the CTA-specific fields:
// label, URL, and the new width toggle. `block.textColor` and
// `block.backgroundColor` retained on the type for backward compat with
// existing JSONB rows; renderer falls through to them when mixin is absent.
export function CtaBlockEditor({ block, onChange, variables = [] }: CtaBlockEditorProps) {
  const labelRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  const widthOptions: ReadonlyArray<{ value: CtaWidth; label: string }> = [
    { value: 'auto', label: messages.email.inspectorCtaWidthAuto },
    { value: 'full', label: messages.email.inspectorCtaWidthFull },
  ]

  return (
    <div className="space-y-3">
      {/* Tekst przycisku (P2-1: label/placeholder moved to messages.ts) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-label`}>{messages.email.inspectorCtaLabel}</Label>
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
          placeholder={messages.email.inspectorCtaLabelPlaceholder}
        />
      </div>

      {/* URL */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={`${block.id}-url`}>{messages.email.inspectorCtaUrl}</Label>
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
          placeholder={messages.email.inspectorCtaUrlPlaceholder}
        />
      </div>

      {/*
        Width — auto / full. P2-4 verified: Inspector default 'auto' matches
        renderer behavior (CtaBlock.tsx treats `block.width === 'full'` as the
        full-width trigger; any other value, including undefined, renders as
        inline-block auto width).
      */}
      <SegmentedControl<CtaWidth>
        label={messages.email.inspectorCtaWidth}
        value={(block.width ?? 'auto') as CtaWidth}
        options={widthOptions}
        onChange={(next) => onChange({ ...block, width: next })}
      />
    </div>
  )
}

interface CtaBlockEditorProps {
  block: CtaBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}
