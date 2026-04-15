

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  Button,
  Input,
} from '@agency/ui'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { getShopCategories } from '@/features/shop-categories/queries'
import { createShopCategory } from '@/features/shop-categories/actions'
import { generateSlug } from '@/lib/utils/slug'

interface ShopCategorySelectProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
}

export function ShopCategorySelect({ id, value, onChange }: ShopCategorySelectProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.shopCategories.list,
    queryFn: getShopCategories,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const result = await createShopCategory({
        name,
        slug: generateSlug(name),
        description: null,
        sort_order: 0,
      })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCategories.all })
      if (result.data) {
        onChange(result.data.id)
      }
      setIsCreating(false)
      setNewCategoryName('')
      setOpen(false)
    },
  })

  useEffect(() => {
    if (isCreating) {
      // Small delay to let the DOM update before focusing
      requestAnimationFrame(() => {
        newCategoryInputRef.current?.focus()
      })
    }
  }, [isCreating])

  const selectedCategory = categories.find((cat) => cat.id === value)

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCategoryName.trim()) {
      e.preventDefault()
      createMutation.mutate(newCategoryName.trim())
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsCreating(false)
      setNewCategoryName('')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm font-normal"
          disabled={isLoading}
        >
          {selectedCategory ? (
            <span className="flex items-center gap-2 truncate">
              <span>{selectedCategory.name}</span>
              <span className="text-xs text-muted-foreground">/{selectedCategory.slug}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{messages.shop.noCategory}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={messages.shop.searchCategory} />
          <CommandList>
            <CommandEmpty>{messages.shop.noCategoryResults}</CommandEmpty>
            <CommandGroup>
              {/* "No category" option */}
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === null ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="text-muted-foreground">{messages.shop.noCategory}</span>
              </CommandItem>

              {/* Existing categories */}
              {categories.map((cat) => (
                <CommandItem
                  key={cat.id}
                  value={cat.name}
                  onSelect={() => {
                    onChange(cat.id === value ? null : cat.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === cat.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{cat.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">/{cat.slug}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Create new category inline */}
            <CommandGroup>
              {isCreating ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Input
                    ref={newCategoryInputRef}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                    placeholder={messages.shop.newCategoryPlaceholder}
                    className="h-8 text-sm"
                    disabled={createMutation.isPending}
                    aria-label={messages.shop.newCategory}
                  />
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </div>
              ) : (
                <CommandItem
                  onSelect={() => setIsCreating(true)}
                  className="text-muted-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {messages.shop.createCategoryInline}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
