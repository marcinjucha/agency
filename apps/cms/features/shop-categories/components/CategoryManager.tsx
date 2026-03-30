'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { queryKeys } from '@/lib/query-keys'
import { getShopCategories } from '../queries'
import { createShopCategory, updateShopCategory, deleteShopCategory } from '../actions'
import { createShopCategorySchema, type CreateShopCategoryFormData } from '../validation'
import type { ShopCategory } from '../types'
import {
  Button,
  Input,
  Label,
  Textarea,
  Skeleton,
  ErrorState,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
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
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { generateSlug } from '@/lib/utils/slug'

type DialogMode = { type: 'closed' } | { type: 'create' } | { type: 'edit'; category: ShopCategory }

export function CategoryManager() {
  const queryClient = useQueryClient()
  const [dialogMode, setDialogMode] = useState<DialogMode>({ type: 'closed' })

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
      setDialogMode({ type: 'closed' })
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
      setDialogMode({ type: 'closed' })
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.shop.categoriesTitle}</h1>
        <Button onClick={() => setDialogMode({ type: 'create' })}>
          <Plus className="mr-2 h-4 w-4" />
          {messages.shop.newCategory}
        </Button>
      </div>

      {/* Category list */}
      {!categories || categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={messages.shop.noCategories}
          description={messages.shop.noCategoriesDescription}
          variant="card"
          action={
            <Button onClick={() => setDialogMode({ type: 'create' })}>
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

          {/* Table rows */}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
              </div>

              <div className="hidden sm:block w-40">
                <p className="text-xs text-muted-foreground font-mono truncate">{cat.slug}</p>
              </div>

              <div className="hidden lg:block min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">
                  {cat.description || '\u2014'}
                </p>
              </div>

              <div className="hidden sm:block w-20 text-right">
                <span className="text-xs text-muted-foreground">{cat.sort_order}</span>
              </div>

              <div className="flex items-center gap-1 w-20 justify-end flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setDialogMode({ type: 'edit', category: cat })}
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
                      disabled={deleteMutation.isPending}
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
                        {messages.shop.deleteCategoryConfirmDescription(cat.name)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(cat.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {messages.common.delete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CategoryDialog
        mode={dialogMode}
        onClose={() => setDialogMode({ type: 'closed' })}
        onSubmit={(data) => {
          if (dialogMode.type === 'create') {
            createMutation.mutate(data)
          } else if (dialogMode.type === 'edit') {
            updateMutation.mutate({ id: dialogMode.category.id, data })
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}

// --- Dialog form ---

function CategoryDialog({
  mode,
  onClose,
  onSubmit,
  isPending,
}: {
  mode: DialogMode
  onClose: () => void
  onSubmit: (data: CreateShopCategoryFormData) => void
  isPending: boolean
}) {
  const isOpen = mode.type !== 'closed'
  const isEdit = mode.type === 'edit'
  const editCategory = mode.type === 'edit' ? mode.category : null

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateShopCategoryFormData>({
    resolver: zodResolver(createShopCategorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: null,
      sort_order: 0,
    },
  })

  const nameValue = watch('name')

  // Reset form when dialog opens/changes
  useEffect(() => {
    if (mode.type === 'create') {
      reset({ name: '', slug: '', description: null, sort_order: 0 })
    } else if (mode.type === 'edit' && editCategory) {
      reset({
        name: editCategory.name,
        slug: editCategory.slug,
        description: editCategory.description,
        sort_order: editCategory.sort_order,
      })
    }
  }, [mode, editCategory, reset])

  // Auto-generate slug from name (only in create mode)
  useEffect(() => {
    if (mode.type === 'create' && nameValue) {
      setValue('slug', generateSlug(nameValue))
    }
  }, [nameValue, mode.type, setValue])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? messages.shop.editCategory : messages.shop.newCategory}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? messages.shop.categoriesDescription
              : messages.shop.noCategoriesDescription}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="category-name">{messages.shop.nameLabel} *</Label>
            <Input
              id="category-name"
              {...register('name')}
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'category-name-error' : undefined}
            />
            {errors.name && (
              <p id="category-name-error" role="alert" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="category-slug">{messages.shop.slugLabel} *</Label>
            <Input
              id="category-slug"
              {...register('slug')}
              className="font-mono text-sm"
              aria-required="true"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? 'category-slug-error' : undefined}
            />
            {errors.slug && (
              <p id="category-slug-error" role="alert" className="text-xs text-destructive">
                {errors.slug.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="category-description">{messages.shop.descriptionFieldLabel}</Label>
            <Textarea
              id="category-description"
              {...register('description')}
              rows={3}
            />
          </div>

          {/* Sort order */}
          <div className="space-y-1.5">
            <Label htmlFor="category-sort-order">{messages.shop.sortOrderLabel}</Label>
            <Input
              id="category-sort-order"
              type="number"
              {...register('sort_order', { valueAsNumber: true })}
              aria-invalid={!!errors.sort_order}
              aria-describedby={errors.sort_order ? 'category-sort-order-error' : undefined}
            />
            {errors.sort_order && (
              <p id="category-sort-order-error" role="alert" className="text-xs text-destructive">
                {errors.sort_order.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? messages.common.saving : messages.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
