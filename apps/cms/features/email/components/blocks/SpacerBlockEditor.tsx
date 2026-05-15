import type { SpacerSize } from '@agency/email'
import { messages } from '@/lib/messages'
import { SegmentedControl } from '../editor/controls/SegmentedControl'
import type { SpacerBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface SpacerBlockEditorProps {
  block: SpacerBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

/**
 * SpacerBlockEditor — 4 presety wysokości (sm/md/lg/xl). Bez customHeight.
 */
export function SpacerBlockEditor({ block, onChange }: SpacerBlockEditorProps) {
  const sizeOptions: ReadonlyArray<{ value: SpacerSize; label: string }> = [
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: messages.email.inspectorSpacerHeightXl },
  ]

  return (
    <SegmentedControl<SpacerSize>
      label={messages.email.inspectorSpacerSizeLabel}
      value={block.size}
      options={sizeOptions}
      onChange={(next) => onChange({ ...block, size: next })}
    />
  )
}
