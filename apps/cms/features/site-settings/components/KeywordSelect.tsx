

import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  cn,
} from '@agency/ui'
import { messages } from '@/lib/messages'

interface KeywordSelectProps {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  pool: string[]
  isLoading?: boolean
}

export function KeywordSelect({ id, value, onChange, pool, isLoading }: KeywordSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const searchNormalized = search.trim().toLowerCase()
  const filteredPool = pool.filter(
    (kw) => kw.toLowerCase().includes(searchNormalized)
  )
  const exactMatch = pool.some(
    (kw) => kw.toLowerCase() === searchNormalized
  ) || value.some(
    (kw) => kw.toLowerCase() === searchNormalized
  )
  const showCreateOption = searchNormalized.length > 0 && !exactMatch

  function handleToggle(keyword: string) {
    const normalized = keyword.trim().toLowerCase()
    if (value.includes(normalized)) {
      onChange(value.filter((kw) => kw !== normalized))
    } else {
      onChange([...value, normalized])
    }
  }

  function handleCreate() {
    const normalized = search.trim().toLowerCase()
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized])
    }
    setSearch('')
  }

  function handleRemove(keyword: string) {
    onChange(value.filter((kw) => kw !== keyword))
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label={messages.siteSettings.defaultKeywords}>
          {value.map((kw) => (
            <Badge
              key={kw}
              variant="secondary"
              className="gap-1 pr-1"
              role="listitem"
            >
              {kw}
              <button
                type="button"
                onClick={() => handleRemove(kw)}
                className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 transition-colors p-0.5"
                aria-label={`${messages.siteSettings.keywordRemove} ${kw}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-sm font-normal"
          >
            <span className="text-muted-foreground">
              {messages.siteSettings.keywordPlaceholder}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={messages.siteSettings.keywordPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {messages.siteSettings.keywordEmpty}
              </CommandEmpty>
              <CommandGroup>
                {filteredPool.map((kw) => (
                  <CommandItem
                    key={kw}
                    value={kw}
                    onSelect={() => handleToggle(kw)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value.includes(kw) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {kw}
                  </CommandItem>
                ))}
                {showCreateOption && (
                  <CommandItem onSelect={handleCreate}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    {messages.siteSettings.keywordAdd} {search.trim()}
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
