

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Button,
  cn,
} from '@agency/ui'
import { getBlogCategories } from '../queries'
import { queryKeys } from '@/lib/query-keys'
import { messages, templates } from '@/lib/messages'

interface CategoryComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
}

export function CategoryCombobox({ id, value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.blog.categories,
    queryFn: getBlogCategories,
  })

  const searchNormalized = search.trim().toLowerCase()
  const exactMatch = categories.some(
    (cat) => cat.toLowerCase() === searchNormalized
  )
  const showCreateOption = searchNormalized.length > 0 && !exactMatch

  function handleSelect(selectedValue: string) {
    onChange(selectedValue)
    setOpen(false)
    setSearch('')
  }

  function handleCreate() {
    onChange(search.trim())
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-sm font-normal"
        >
          <span className={cn(!value && 'text-muted-foreground')}>
            {value || messages.blog.categorySelectPlaceholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={messages.blog.categorySearchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              {messages.blog.noCategories}
            </CommandEmpty>
            <CommandGroup>
              {categories
                .filter((cat) =>
                  cat.toLowerCase().includes(searchNormalized)
                )
                .map((cat) => (
                  <CommandItem
                    key={cat}
                    value={cat}
                    onSelect={() => handleSelect(cat)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value === cat ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {cat}
                  </CommandItem>
                ))}
              {showCreateOption && (
                <CommandItem onSelect={handleCreate}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  {templates.blog.addCategory(search.trim())}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
