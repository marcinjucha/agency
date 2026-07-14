import type { SectionPadding } from '@agency/email'
import { messages } from '@/lib/messages'
import { SegmentedControl } from '../editor/controls/SegmentedControl'
import type { SectionBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface SectionBlockEditorProps {
  block: SectionBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

/**
 * SectionBlockEditor — minimalny edytor treści sekcji: tylko preset paddingu
 * (none/sm/md/lg). Dzieci sekcji są zarządzane na kanwie / w panelu Struktura
 * (Iter 2) — tu tylko podpowiedź. Padding ma default ('md') i nigdy nie jest
 * "czyszczony", więc zwykły spread wystarcza (bez applySectionPatch).
 */
export function SectionBlockEditor({ block, onChange }: SectionBlockEditorProps) {
  const paddingOptions: ReadonlyArray<{ value: SectionPadding; label: string }> = [
    { value: 'none', label: messages.email.inspectorSectionPaddingNone },
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
  ]

  return (
    <div className="space-y-3">
      <SegmentedControl<SectionPadding>
        label={messages.email.inspectorSectionPaddingLabel}
        value={block.padding ?? 'md'}
        options={paddingOptions}
        onChange={(next) => onChange({ ...block, padding: next })}
      />
      <p className="text-xs text-muted-foreground">
        {messages.email.inspectorSectionChildrenHint}
      </p>
    </div>
  )
}
