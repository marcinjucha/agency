'use client'

import { List, LayoutGrid } from 'lucide-react'
import { messages } from '@/lib/messages'

type ViewMode = 'grid' | 'list'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      className={`flex items-center rounded-md border border-border bg-muted/30 p-0.5 ${className ?? ''}`}
    >
      <button
        onClick={() => onChange('list')}
        className={`rounded-md p-1.5 transition-colors ${
          value === 'list'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label={messages.common.viewList}
        aria-pressed={value === 'list'}
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`rounded-md p-1.5 transition-colors ${
          value === 'grid'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label={messages.common.viewGrid}
        aria-pressed={value === 'grid'}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
