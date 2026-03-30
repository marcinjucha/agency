'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getShopCategories } from '../queries'
import { createShopCategory, updateShopCategory, deleteShopCategory } from '../actions'
import type { CreateShopCategoryFormData } from '../validation'
import type { ShopCategory } from '../types'
import {
  Button,
  Input,
  Textarea,
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
import { Tags, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { generateSlug } from '@/lib/utils/slug'

type EditingRow =
  | { type: 'none' }
  | { type: 'new' }
  | { type: 'edit'; id: string }

interface RowFormData {
  name: string
  slug: string
  description: string
  sort_order: number
}

const emptyRow: RowFormData = { name: '', slug: '', description: '', sort_order: 0 }

export function CategoryManager() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditingRow>({ type: 'none' })
  const [formData, setFormData] = useState<RowFormData>(emptyRow)
  const [autoSlug, setAutoSlug] = useState(true)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.shopCategories.list,
    queryFn: getShopCategories,
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateShopCategoryFormData) => {
      const result = await createShopCategory(data)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCategories.all })
      cancelEditing()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateShopCategoryFormData> }) => {
      const result = await updateShopCategory(id, data)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCategories.all })
      cancelEditing()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteShopCategory(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCategories.all })
    },
  })

  // Focus name input when starting to edit
  useEffect(() => {
    if (editing.type !== 'none') {
      requestAnimationFrame(() => {
        nameInputRef.current?.focus()
      })
    }
  }, [editing.type])

  function startNew() {
    setFormData(emptyRow)
    setAutoSlug(true)
    setEditing({ type: 'new' })
  }

  function startEdit(cat: ShopCategory) {
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      sort_order: cat.sort_order,
    })
    setAutoSlug(false)
    setEditing({ type: 'edit', id: cat.id })
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
    const payload: CreateShopCategoryFormData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      sort_order: formData.sort_order,
    }

    if (editing.type === 'new') {
      createMutation.mutate(payload)
    } else if (editing.type === 'edit') {
      updateMutation.mutate({ id: editing.id, data: payload })
    }
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

  if (isLoading) return <CategoryManagerSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.shop.loadCategoriesFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  const hasCategories = categories && categories.length > 0
  const showEmptyState = !hasCategories && editing.type !== 'new'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.shop.categoriesTitle}</h1>
        <Button
          onClick={startNew}
          disabled={editing.type === 'new'}
        >
          <Plus className="mr-2 h-4 w-4" />
          {messages.shop.newCategory}
        </Button>
      </div>

      {/* Category list */}
      {showEmptyState ? (
        <EmptyState
          icon={Tags}
          title={messages.shop.noCategories}
          description={messages.shop.noCategoriesDescription}
          variant="card"
          action={
            <Button onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.shop.newCategory}
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {/* Table header */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="flex-1">{messages.shop.nameLabel}</div>
            <div className="w-40">{messages.shop.slugLabel}</div>
            <div className="hidden lg:block flex-1">{messages.shop.descriptionFieldLabel}</div>
            <div className="w-20 text-right">{messages.shop.sortOrderLabel}</div>
            <div className="w-20" />
          </div>

          {/* New row (inline) */}
          {editing.type === 'new' && (
            <InlineEditRow
              formData={formData}
              onNameChange={handleNameChange}
              onSlugChange={handleSlugChange}
              onDescriptionChange={(v) => setFormData((prev) => ({ ...prev, description: v }))}
              onSortOrderChange={(v) => setFormData((prev) => ({ ...prev, sort_order: v }))}
              onKeyDown={handleKeyDown}
              onSave={handleSave}
              onCancel={cancelEditing}
              isPending={isPending}
              nameInputRef={nameInputRef}
            />
          )}

          {/* Existing rows */}
          {categories?.map((cat) =>
            editing.type === 'edit' && editing.id === cat.id ? (
              <InlineEditRow
                key={cat.id}
                formData={formData}
                onNameChange={handleNameChange}
                onSlugChange={handleSlugChange}
                onDescriptionChange={(v) => setFormData((prev) => ({ ...prev, description: v }))}
                onSortOrderChange={(v) => setFormData((prev) => ({ ...prev, sort_order: v }))}
                onKeyDown={handleKeyDown}
                onSave={handleSave}
                onCancel={cancelEditing}
                isPending={isPending}
                nameInputRef={nameInputRef}
              />
            ) : (
              <ReadonlyRow
                key={cat.id}
                category={cat}
                onEdit={() => startEdit(cat)}
                onDelete={() => deleteMutation.mutate(cat.id)}
                isDeleting={deleteMutation.isPending}
                isEditingOther={editing.type !== 'none'}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

// --- Inline edit row ---

function InlineEditRow({
  formData,
  onNameChange,
  onSlugChange,
  onDescriptionChange,
  onSortOrderChange,
  onKeyDown,
  onSave,
  onCancel,
  isPending,
  nameInputRef,
}: {
  formData: RowFormData
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSortOrderChange: (value: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  nameInputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted/30">
      <div className="min-w-0 flex-1">
        <Input
          ref={nameInputRef}
          value={formData.name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={messages.shop.nameLabel}
          className="h-8 text-sm"
          disabled={isPending}
          aria-label={messages.shop.nameLabel}
        />
      </div>

      <div className="hidden sm:block w-40">
        <Input
          value={formData.slug}
          onChange={(e) => onSlugChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={messages.shop.slugLabel}
          className="h-8 text-sm font-mono"
          disabled={isPending}
          aria-label={messages.shop.slugLabel}
        />
      </div>

      <div className="hidden lg:block min-w-0 flex-1">
        <Textarea
          value={formData.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={messages.shop.descriptionFieldLabel}
          rows={2}
          className="min-h-0 resize-none text-sm"
          disabled={isPending}
          aria-label={messages.shop.descriptionFieldLabel}
        />
      </div>

      <div className="hidden sm:block w-20">
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) => onSortOrderChange(parseInt(e.target.value) || 0)}
          onKeyDown={onKeyDown}
          className="h-8 text-sm text-right"
          disabled={isPending}
          aria-label={messages.shop.sortOrderLabel}
        />
      </div>

      <div className="flex items-center gap-1 w-20 justify-end flex-shrink-0">
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

function ReadonlyRow({
  category,
  onEdit,
  onDelete,
  isDeleting,
  isEditingOther,
}: {
  category: ShopCategory
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isEditingOther: boolean
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{category.name}</p>
      </div>

      <div className="hidden sm:block w-40">
        <p className="text-xs text-muted-foreground font-mono truncate">{category.slug}</p>
      </div>

      <div className="hidden lg:block min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">
          {category.description || '\u2014'}
        </p>
      </div>

      <div className="hidden sm:block w-20 text-right">
        <span className="text-xs text-muted-foreground">{category.sort_order}</span>
      </div>

      <div className="flex items-center gap-1 w-20 justify-end flex-shrink-0">
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
              <AlertDialogTitle>
                {messages.shop.deleteCategoryConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {messages.shop.deleteCategoryConfirmDescription(category.name)}
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

function CategoryManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="hidden sm:block h-4 w-28" />
            <Skeleton className="hidden lg:block h-4 w-48 flex-1" />
            <Skeleton className="hidden sm:block h-4 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
