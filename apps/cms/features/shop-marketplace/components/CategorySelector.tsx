'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@agency/ui'
import { ChevronsUpDown, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages, templates } from '@/lib/messages'
import { getMarketplaceCategories } from '../actions.categories'

interface CategorySelectorProps {
  connectionId: string
  value?: string
  valueName?: string
  onChange: (categoryId: string, categoryName: string) => void
}

/**
 * Combobox for selecting a marketplace category.
 *
 * Fetch strategy: loads all top-level categories on first open,
 * then filters client-side as user types. This matches the
 * getMarketplaceCategories API (parentId-based, not text-search based).
 * Client-side filter is safe — category lists are typically 50-300 items.
 */
export function CategorySelector({ connectionId, value, valueName, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const hasFetched = useRef(false)

  // Fetch on first open
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.marketplace.categories(connectionId),
    queryFn: async () => {
      const result = await getMarketplaceCategories(connectionId)
      if (!result.success) {
        throw new Error(result.error ?? messages.marketplace.categoryLoadingError)
      }
      return result.data?.categories ?? []
    },
    enabled: open || hasFetched.current,
    staleTime: 1000 * 60 * 5, // 5 min cache — categories don't change often
  })

  // Track that we've opened at least once (so refetch works without reopening)
  if (open && !hasFetched.current) {
    hasFetched.current = true
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter((cat) => cat.name.toLowerCase().includes(q))
  }, [data, search])

  const displayLabel = valueName ?? (value ? `ID: ${value}` : messages.marketplace.categoryPlaceholder)

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{messages.marketplace.categoryLabel}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Wybierz kategorię marketplace"
            className="w-full justify-between text-sm font-normal"
          >
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {displayLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={messages.marketplace.categorySearchPlaceholder}
              value={search}
              onValueChange={setSearch}
              aria-label="Szukaj kategorii"
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {messages.marketplace.categoryLoading}
                </div>
              )}

              {isError && !isLoading && (
                <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
                  <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                  <p className="text-sm text-destructive">
                    {messages.marketplace.categoryLoadError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    aria-label="Ponów ładowanie kategorii"
                  >
                    {messages.marketplace.categoryRetry}
                  </Button>
                </div>
              )}

              {!isLoading && !isError && (
                <>
                  {filtered.length === 0 ? (
                    <CommandEmpty>
                      {search
                        ? templates.marketplace.categoryNoResults(search)
                        : messages.marketplace.categoryEmpty}
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filtered.map((cat) => (
                        <CommandItem
                          key={cat.id}
                          value={cat.id}
                          onSelect={() => {
                            onChange(cat.id, cat.name)
                            setOpen(false)
                            setSearch('')
                          }}
                          aria-label={`Wybierz kategorię: ${cat.name}`}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              value === cat.id ? 'opacity-100' : 'opacity-0'
                            )}
                            aria-hidden="true"
                          />
                          <span className="text-sm">{cat.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
