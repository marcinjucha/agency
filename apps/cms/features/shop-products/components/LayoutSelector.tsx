

import { Image, FileText } from 'lucide-react'
import { cn } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { DisplayLayout } from '../types'

interface LayoutSelectorProps {
  value: DisplayLayout
  onChange: (layout: DisplayLayout) => void
}

const layouts: { value: DisplayLayout; icon: typeof Image; name: string; description: string }[] = [
  {
    value: 'gallery',
    icon: Image,
    name: messages.shop.galleryLayoutName,
    description: messages.shop.galleryLayoutDescription,
  },
  {
    value: 'editorial',
    icon: FileText,
    name: messages.shop.editorialLayoutName,
    description: messages.shop.editorialLayoutDescription,
  },
]

export function LayoutSelector({ value, onChange }: LayoutSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {layouts.map((layout) => {
        const isActive = value === layout.value
        const Icon = layout.icon

        return (
          <button
            key={layout.value}
            type="button"
            onClick={() => onChange(layout.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors',
              isActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            aria-pressed={isActive}
            aria-label={`${layout.name}: ${layout.description}`}
          >
            <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <div>
              <p className={cn('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                {layout.name}
              </p>
              <p className="text-xs text-muted-foreground">{layout.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
