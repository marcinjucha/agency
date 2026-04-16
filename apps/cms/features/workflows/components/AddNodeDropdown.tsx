

import { useState } from 'react'
import { Button, Popover, PopoverTrigger, PopoverContent } from '@agency/ui'
import { Plus } from 'lucide-react'
import { messages } from '@/lib/messages'
import { NODE_TYPE_CONFIGS } from './nodes/node-registry'

interface AddNodeDropdownProps {
  onAddNode: (stepType: string) => void
  hasTrigger: boolean
}

const ITEMS = Object.entries(NODE_TYPE_CONFIGS).map(([type, config]) => ({
  type,
  label: config.label,
  icon: config.icon,
  isTrigger: config.isTrigger ?? false,
}))

export function AddNodeDropdown({ onAddNode, hasTrigger }: AddNodeDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute top-4 left-4 z-10">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {messages.workflows.editor.addNode}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-1">
          {ITEMS.map((item) => {
            if (item.isTrigger && hasTrigger) return null
            return (
              <button
                key={item.type}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors text-foreground"
                onClick={() => {
                  onAddNode(item.type)
                  setOpen(false)
                }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}
