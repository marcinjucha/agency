import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Skeleton,
  ErrorState,
  EmptyState,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import { Users, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { generateSlug } from '@/lib/utils/slug'
import {
  listClientsFn,
  createClientFn,
  updateClientFn,
  deleteClientFn,
} from '../admin'
import type { Client } from '../types'

// Inline CRUD (name + slug) — mirrors shop-categories CategoryManager list view.

type EditingRow = { type: 'none' } | { type: 'new' } | { type: 'edit'; id: string }

interface RowFormData {
  name: string
  slug: string
}

const emptyRow: RowFormData = { name: '', slug: '' }

export function VentureClientList() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditingRow>({ type: 'none' })
  const [formData, setFormData] = useState<RowFormData>(emptyRow)
  const [autoSlug, setAutoSlug] = useState(true)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const {
    data: clients,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.venture.clients,
    queryFn: async () => {
      const result = await listClientsFn()
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadClientsFailed)
      return result.data ?? []
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })

  const createMutation = useMutation({
    mutationFn: async (data: RowFormData) => {
      const result = await createClientFn({ data })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.createClientFailed)
      return result
    },
    onSuccess: () => {
      invalidate()
      cancelEditing()
    },
    onError: (e) => console.error('[VentureClientList] create:', e),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RowFormData }) => {
      const result = await updateClientFn({ data: { id, data } })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.updateClientFailed)
      return result
    },
    onSuccess: () => {
      invalidate()
      cancelEditing()
    },
    onError: (e) => console.error('[VentureClientList] update:', e),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteClientFn({ data: { id } })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.deleteClientFailed)
      return result
    },
    onSuccess: invalidate,
    onError: (e) => console.error('[VentureClientList] delete:', e),
  })

  useEffect(() => {
    if (editing.type !== 'none') {
      requestAnimationFrame(() => nameInputRef.current?.focus())
    }
  }, [editing.type])

  function startNew() {
    setFormData(emptyRow)
    setAutoSlug(true)
    setEditing({ type: 'new' })
  }

  function startEdit(client: Client) {
    setFormData({ name: client.name, slug: client.slug })
    setAutoSlug(false)
    setEditing({ type: 'edit', id: client.id })
  }

  function cancelEditing() {
    setEditing({ type: 'none' })
    setFormData(emptyRow)
    setAutoSlug(true)
  }

  function handleNameChange(value: string) {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: autoSlug ? generateSlug(value) : prev.slug,
    }))
  }

  function handleSlugChange(value: string) {
    setAutoSlug(false)
    setFormData((prev) => ({ ...prev, slug: value }))
  }

  function handleSave() {
    const payload: RowFormData = { name: formData.name, slug: formData.slug }
    if (editing.type === 'new') createMutation.mutate(payload)
    else if (editing.type === 'edit') updateMutation.mutate({ id: editing.id, data: payload })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isLoading) return <VentureClientListSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.venture.loadClientsFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  const hasClients = clients && clients.length > 0
  const showEmptyState = !hasClients && editing.type !== 'new'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.venture.clientsTitle}</h1>
        <Button onClick={startNew} disabled={editing.type === 'new'}>
          <Plus className="mr-2 h-4 w-4" />
          {messages.venture.newClient}
        </Button>
      </div>

      {showEmptyState ? (
        <EmptyState
          icon={Users}
          title={messages.venture.noClients}
          description={messages.venture.noClientsDescription}
          variant="card"
          action={
            <Button onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.venture.newClient}
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="flex-1">{messages.venture.clientNameLabel}</div>
            <div className="w-48">{messages.venture.clientSlugLabel}</div>
            <div className="w-20" />
          </div>

          {editing.type === 'new' && (
            <ClientInlineRow
              formData={formData}
              onNameChange={handleNameChange}
              onSlugChange={handleSlugChange}
              onKeyDown={handleKeyDown}
              onSave={handleSave}
              onCancel={cancelEditing}
              isPending={isPending}
              nameInputRef={nameInputRef}
            />
          )}

          {clients?.map((client) =>
            editing.type === 'edit' && editing.id === client.id ? (
              <ClientInlineRow
                key={client.id}
                formData={formData}
                onNameChange={handleNameChange}
                onSlugChange={handleSlugChange}
                onKeyDown={handleKeyDown}
                onSave={handleSave}
                onCancel={cancelEditing}
                isPending={isPending}
                nameInputRef={nameInputRef}
              />
            ) : (
              <ClientReadonlyRow
                key={client.id}
                client={client}
                onEdit={() => startEdit(client)}
                onDelete={() => deleteMutation.mutate(client.id)}
                isDeleting={deleteMutation.isPending}
                isEditingOther={editing.type !== 'none'}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

// --- Inline edit row ---

function ClientInlineRow({
  formData,
  onNameChange,
  onSlugChange,
  onKeyDown,
  onSave,
  onCancel,
  isPending,
  nameInputRef,
}: {
  formData: RowFormData
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  nameInputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="flex items-center gap-4 bg-muted/30 px-4 py-2">
      <div className="min-w-0 flex-1">
        <Input
          ref={nameInputRef}
          value={formData.name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={messages.venture.clientNamePlaceholder}
          className="h-8 text-sm"
          disabled={isPending}
          aria-label={messages.venture.clientNameLabel}
        />
      </div>
      <div className="w-48">
        <Input
          value={formData.slug}
          onChange={(e) => onSlugChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={messages.venture.clientSlugLabel}
          className="h-8 font-mono text-sm"
          disabled={isPending}
          aria-label={messages.venture.clientSlugLabel}
        />
      </div>
      <div className="flex w-20 flex-shrink-0 items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300"
          onClick={onSave}
          disabled={isPending || !formData.name.trim()}
          aria-label={messages.common.save}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
          disabled={isPending}
          aria-label={messages.common.cancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// --- Readonly row ---

function ClientReadonlyRow({
  client,
  onEdit,
  onDelete,
  isDeleting,
  isEditingOther,
}: {
  client: Client
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isEditingOther: boolean
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{client.name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground sm:hidden">{client.slug}</p>
      </div>
      <div className="hidden w-48 sm:block">
        <p className="truncate font-mono text-xs text-muted-foreground">{client.slug}</p>
      </div>
      <div className="flex w-20 flex-shrink-0 items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          disabled={isEditingOther}
          aria-label={messages.common.edit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              disabled={isDeleting || isEditingOther}
              aria-label={messages.common.delete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{messages.venture.deleteClientConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {messages.venture.deleteClientConfirmDescription(client.name)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {messages.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// --- Skeleton ---

function VentureClientListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
