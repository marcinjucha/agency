'use client'

import * as React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './command'

export interface VariableItem {
  key: string
  label: string
  description?: string
  category?: string
}

interface VariableInserterPopoverProps {
  variables: VariableItem[]
  onInsert: (key: string) => void
  trigger: React.ReactNode
  emptyMessage?: string
  searchPlaceholder?: string
}

export function VariableInserterPopover({
  variables,
  onInsert,
  trigger,
  emptyMessage = 'No variables',
  searchPlaceholder = 'Search...',
}: VariableInserterPopoverProps) {
  const [open, setOpen] = React.useState(false)

  // Group variables by category
  const grouped = React.useMemo(() => {
    const groups: Record<string, VariableItem[]> = {}
    for (const v of variables) {
      const cat = v.category ?? ''
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(v)
    }
    return groups
  }, [variables])

  const handleSelect = React.useCallback(
    (key: string) => {
      onInsert(key)
      setOpen(false)
    },
    [onInsert]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {Object.entries(grouped).map(([category, items]) => (
              <CommandGroup key={category} heading={category || undefined}>
                {items.map((item) => (
                  <CommandItem
                    key={item.key}
                    value={`${item.key} ${item.label} ${item.description ?? ''}`}
                    onSelect={() => handleSelect(item.key)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="font-mono text-xs">
                      {`{{${item.key}}}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                      {item.description ? ` — ${item.description}` : ''}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
