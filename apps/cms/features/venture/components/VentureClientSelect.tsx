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
  cn,
} from '@agency/ui'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { generateSlug } from '@/lib/utils/slug'
import { listClientsFn, createClientFn } from '../admin.server'

// Combobox with inline create — mirrors ShopCategorySelect. Selecting a client
// (so_clients) or creating a new one without leaving the campaign editor.

interface VentureClientSelectProps {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function VentureClientSelect({
  id,
  value,
  onChange,
  disabled = false,
}: VentureClientSelectProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const newClientInputRef = useRef<HTMLInputElement>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: queryKeys.venture.clients,
    queryFn: async () => {
      const result = await listClientsFn()
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadClientsFailed)
      return result.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const result = await createClientFn({
        data: { name, slug: generateSlug(name) },
      })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.createClientFailed)
      return result
    },
    onSuccess: (result) => {
      // Root-key invalidation — exact-key silently fails (ag-design-patterns).
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })
      if (result.data) onChange(result.data.id)
      setIsCreating(false)
      setNewClientName('')
      setOpen(false)
    },
    onError: (error) => console.error('[VentureClientSelect] create:', error),
  })

  useEffect(() => {
    if (isCreating) {
      requestAnimationFrame(() => newClientInputRef.current?.focus())
    }
  }, [isCreating])

  const selectedClient = clients.find((c) => c.id === value)

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newClientName.trim()) {
      e.preventDefault()
      createMutation.mutate(newClientName.trim())
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsCreating(false)
      setNewClientName('')
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
          disabled={disabled || isLoading}
        >
          {selectedClient ? (
            <span className="flex items-center gap-2 truncate">
              <span>{selectedClient.name}</span>
              <span className="text-xs text-muted-foreground">/{selectedClient.slug}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{messages.venture.selectClient}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={messages.venture.searchClient} />
          <CommandList>
            <CommandEmpty>{messages.venture.noClientResults}</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.id === value ? null : client.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === client.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{client.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">/{client.slug}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup>
              {isCreating ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Input
                    ref={newClientInputRef}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                    placeholder={messages.venture.newClientPlaceholder}
                    className="h-8 text-sm"
                    disabled={createMutation.isPending}
                    aria-label={messages.venture.newClient}
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
                  {messages.venture.createClientInline}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
