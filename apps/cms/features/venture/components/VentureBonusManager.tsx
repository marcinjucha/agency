import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  Badge,
  Skeleton,
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Link2, FileText, Check, X } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { createBonusSchema, type CreateBonusInput } from '../validation'
import { BONUS_TYPES, type Bonus } from '../types'
import {
  listBonusesFn,
  createBonusFn,
  updateBonusFn,
  deleteBonusFn,
  reorderBonusesFn,
} from '../admin.server'
import { BonusMediaField } from './BonusMediaField'

// Inline bonuses management embedded in the campaign editor. Bonuses require a
// persisted campaign (campaign_id) — in create mode the manager renders a hint
// instead. Reorder uses up/down buttons (keyboard-accessible, no dnd dep) →
// reorderBonusesFn with the full re-sequenced item set.

interface VentureBonusManagerProps {
  /** Null while the campaign is unsaved (create mode) — bonuses can't attach yet. */
  campaignId: string | null
}

export function VentureBonusManager({ campaignId }: VentureBonusManagerProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<{ type: 'none' } | { type: 'new' } | { type: 'edit'; id: string }>({
    type: 'none',
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })

  const {
    data: bonuses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.venture.bonuses(campaignId ?? ''),
    queryFn: async () => {
      if (!campaignId) return []
      const result = await listBonusesFn({ data: { campaign_id: campaignId } })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadBonusesFailed)
      return [...(result.data ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    },
    enabled: !!campaignId,
  })

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const result = await updateBonusFn({ data: { id, data: { published } } })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.updateBonusFailed)
      return result
    },
    onSuccess: invalidate,
    onError: (e) => console.error('[VentureBonusManager] toggle publish:', e),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBonusFn({ data: { id } })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.deleteBonusFailed)
      return result
    },
    onSuccess: invalidate,
    onError: (e) => console.error('[VentureBonusManager] delete:', e),
  })

  const reorderMutation = useMutation({
    mutationFn: async (ordered: Bonus[]) => {
      if (!campaignId) throw new Error(messages.venture.reorderBonusesFailed)
      const result = await reorderBonusesFn({
        data: {
          campaign_id: campaignId,
          items: ordered.map((b, index) => ({ id: b.id, sort_order: index })),
        },
      })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.reorderBonusesFailed)
      return result
    },
    onSuccess: invalidate,
    onError: (e) => console.error('[VentureBonusManager] reorder:', e),
  })

  function moveBonus(index: number, direction: -1 | 1) {
    if (!bonuses) return
    const target = index + direction
    if (target < 0 || target >= bonuses.length) return
    const next = [...bonuses]
    ;[next[index], next[target]] = [next[target], next[index]]
    reorderMutation.mutate(next)
  }

  if (!campaignId) {
    return (
      <BonusSection>
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {messages.venture.saveCampaignFirst}
        </p>
      </BonusSection>
    )
  }

  if (isLoading) {
    return (
      <BonusSection>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </BonusSection>
    )
  }

  if (error) {
    return (
      <BonusSection>
        <ErrorState
          title={messages.venture.loadBonusesFailed}
          message={error instanceof Error ? error.message : messages.common.errorOccurred}
          onRetry={() => refetch()}
          variant="card"
        />
      </BonusSection>
    )
  }

  const hasBonuses = bonuses && bonuses.length > 0

  return (
    <BonusSection
      action={
        editing.type === 'none' ? (
          <Button size="sm" variant="outline" onClick={() => setEditing({ type: 'new' })}>
            <Plus className="mr-2 h-4 w-4" />
            {messages.venture.addBonus}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {editing.type === 'new' && (
          <BonusEditForm
            campaignId={campaignId}
            nextSortOrder={bonuses?.length ?? 0}
            onDone={() => setEditing({ type: 'none' })}
          />
        )}

        {!hasBonuses && editing.type !== 'new' && (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            {messages.venture.noBonusesDescription}
          </p>
        )}

        {bonuses?.map((bonus, index) =>
          editing.type === 'edit' && editing.id === bonus.id ? (
            <BonusEditForm
              key={bonus.id}
              campaignId={campaignId}
              bonus={bonus}
              onDone={() => setEditing({ type: 'none' })}
            />
          ) : (
            <BonusRow
              key={bonus.id}
              bonus={bonus}
              isFirst={index === 0}
              isLast={index === (bonuses?.length ?? 0) - 1}
              disabled={editing.type !== 'none' || reorderMutation.isPending}
              onMoveUp={() => moveBonus(index, -1)}
              onMoveDown={() => moveBonus(index, 1)}
              onEdit={() => setEditing({ type: 'edit', id: bonus.id })}
              onDelete={() => deleteMutation.mutate(bonus.id)}
              onTogglePublish={(published) => togglePublishMutation.mutate({ id: bonus.id, published })}
              isDeleting={deleteMutation.isPending}
              isToggling={togglePublishMutation.isPending}
            />
          ),
        )}
      </div>
    </BonusSection>
  )
}

// --- Section wrapper ---

function BonusSection({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{messages.venture.bonusesTitle}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

// --- Readonly bonus row ---

function BonusRow({
  bonus,
  isFirst,
  isLast,
  disabled,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onTogglePublish,
  isDeleting,
  isToggling,
}: {
  bonus: Bonus
  isFirst: boolean
  isLast: boolean
  disabled: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDelete: () => void
  onTogglePublish: (published: boolean) => void
  isDeleting: boolean
  isToggling: boolean
}) {
  const TypeIcon = bonus.type === 'file' ? FileText : Link2
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      {/* Reorder */}
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={onMoveUp}
          disabled={disabled || isFirst}
          aria-label={messages.venture.moveUp}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={onMoveDown}
          disabled={disabled || isLast}
          aria-label={messages.venture.moveDown}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {bonus.title || messages.venture.bonusTitleLabel}
        </p>
        {bonus.description && (
          <p className="truncate text-xs text-muted-foreground">{bonus.description}</p>
        )}
      </div>

      <Badge
        variant="outline"
        className={
          bonus.published
            ? 'border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400'
            : 'border-border bg-muted text-xs text-muted-foreground'
        }
      >
        {bonus.published ? messages.common.published : messages.common.draft}
      </Badge>

      <Switch
        checked={bonus.published}
        onCheckedChange={onTogglePublish}
        disabled={disabled || isToggling}
        aria-label={messages.venture.publishedLabel}
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={onEdit}
        disabled={disabled}
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
            disabled={disabled || isDeleting}
            aria-label={messages.common.delete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.venture.deleteBonusConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {messages.venture.deleteBonusConfirmDescription(bonus.title ?? '')}
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
  )
}

// --- Bonus create/edit form (RHF + Zod, reuses createBonusSchema) ---

function BonusEditForm({
  campaignId,
  bonus,
  nextSortOrder = 0,
  onDone,
}: {
  campaignId: string
  bonus?: Bonus
  nextSortOrder?: number
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const isEditing = !!bonus
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBonusInput, unknown, CreateBonusInput>({
    resolver: zodResolver(createBonusSchema),
    defaultValues: {
      campaign_id: campaignId,
      title: bonus?.title ?? '',
      description: bonus?.description ?? '',
      type: (bonus?.type as CreateBonusInput['type']) ?? 'link',
      url: bonus?.url ?? '',
      media_asset_id: bonus?.media_asset_id ?? null,
      sort_order: bonus?.sort_order ?? nextSortOrder,
      published: bonus?.published ?? false,
    },
  })

  const watchType = watch('type')
  const watchPublished = watch('published')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })

  async function onValid(values: CreateBonusInput) {
    setErrorMessage(null)
    const result = isEditing
      ? await updateBonusFn({
          data: {
            id: bonus.id,
            data: {
              title: values.title,
              description: values.description ?? null,
              type: values.type,
              url: values.url ?? null,
              media_asset_id: values.media_asset_id ?? null,
              published: values.published,
            },
          },
        })
      : await createBonusFn({ data: values })

    if (result?.success) {
      invalidate()
      onDone()
    } else {
      setErrorMessage(
        result?.error ??
          (isEditing ? messages.venture.updateBonusFailed : messages.venture.createBonusFailed),
      )
    }
  }

  function onInvalid() {
    setErrorMessage(messages.venture.formValidationError)
  }

  return (
    <form
      onSubmit={handleSubmit(onValid, onInvalid)}
      className="space-y-4 rounded-lg border border-primary/40 bg-muted/30 p-4"
    >
      {errorMessage && (
        <div
          role="status"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="bonus-title" className="text-sm font-medium">
          {messages.venture.bonusTitleLabel}
        </Label>
        <Input
          id="bonus-title"
          {...register('title')}
          placeholder={messages.venture.bonusTitlePlaceholder}
          className="text-sm"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="bonus-description" className="text-sm font-medium">
          {messages.venture.bonusDescriptionLabel}
        </Label>
        <Textarea
          id="bonus-description"
          {...register('description')}
          placeholder={messages.venture.bonusDescriptionPlaceholder}
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label htmlFor="bonus-type" className="text-sm font-medium">
          {messages.venture.bonusTypeLabel}
        </Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="bonus-type" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BONUS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === 'link' ? messages.venture.bonusTypeLink : messages.venture.bonusTypeFile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Conditional: link → url, file → media picker */}
      {watchType === 'link' ? (
        <div className="space-y-1.5">
          <Label htmlFor="bonus-url" className="text-sm font-medium">
            {messages.venture.bonusUrlLabel}
          </Label>
          <Input
            id="bonus-url"
            {...register('url')}
            placeholder={messages.venture.bonusUrlPlaceholder}
            className="text-sm"
          />
          {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
        </div>
      ) : (
        <BonusMediaField
          mediaAssetId={watch('media_asset_id') ?? null}
          url={watch('url') ?? null}
          onChange={(id, url) => {
            setValue('media_asset_id', id, { shouldDirty: true })
            setValue('url', url, { shouldDirty: true })
          }}
        />
      )}

      {/* Published */}
      <div className="flex items-center justify-between">
        <Label htmlFor="bonus-published" className="text-sm font-medium">
          {messages.venture.publishedLabel}
        </Label>
        <Switch
          id="bonus-published"
          checked={watchPublished}
          onCheckedChange={(v) => setValue('published', v, { shouldDirty: true })}
          aria-label={messages.venture.publishedLabel}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isSubmitting}>
          <X className="mr-1.5 h-4 w-4" />
          {messages.common.cancel}
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Check className="mr-1.5 h-4 w-4" />
          {isSubmitting ? messages.common.saving : messages.common.save}
        </Button>
      </div>
    </form>
  )
}
