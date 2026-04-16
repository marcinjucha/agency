import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import type { PipelineSortOption } from '../types'

interface SortDropdownProps {
  value: PipelineSortOption
  onChange: (value: PipelineSortOption) => void
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PipelineSortOption)}>
      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label={messages.intake.sortLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{messages.intake.sortNewest}</SelectItem>
        <SelectItem value="ai_score">{messages.intake.sortAiScore}</SelectItem>
        <SelectItem value="name">{messages.intake.sortName}</SelectItem>
      </SelectContent>
    </Select>
  )
}
