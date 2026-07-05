import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Switch,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CollapsibleCard,
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
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { generateSlug } from '@/lib/utils/slug'
import { createCampaignSchema, type CreateCampaignInput } from '../validation'
import type { Campaign, CampaignBrand } from '../types'
import { createCampaignFn, updateCampaignFn, deleteCampaignFn } from '../admin.server'
import { VentureClientSelect } from './VentureClientSelect'
import { CampaignBrandEditor } from './CampaignBrandEditor'
import { VentureBonusManager } from './VentureBonusManager'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface VentureCampaignEditorProps {
  campaign?: Campaign
}

export function VentureCampaignEditor({ campaign }: VentureCampaignEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!campaign

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const slugManuallyEdited = useRef(false)
  const lastAutoSlug = useRef(campaign ? campaign.slug : '')

  const brand = (campaign?.brand as CampaignBrand | null) ?? null

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCampaignInput, unknown, CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      client_id: campaign?.client_id ?? '',
      slug: campaign?.slug ?? '',
      display_name: campaign?.display_name ?? '',
      brand: {
        primary: brand?.primary ?? '',
        accent: brand?.accent ?? '',
        bg: brand?.bg ?? '',
        logo_url: brand?.logo_url ?? '',
        font: brand?.font ?? '',
      },
      esp_provider: campaign?.esp_provider ?? 'beehiiv',
      esp_audience_ref: campaign?.esp_audience_ref ?? '',
      esp_tag_launch: campaign?.esp_tag_launch ?? 'launch-notify',
      published: campaign?.published ?? false,
    },
  })

  const watchDisplayName = watch('display_name')
  const watchSlug = watch('slug')
  const watchPublished = watch('published')

  // Auto-generate slug from display name (create mode only, until manually edited).
  useEffect(() => {
    if (isEditing || slugManuallyEdited.current) return
    const generated = generateSlug(watchDisplayName ?? '')
    lastAutoSlug.current = generated
    setValue('slug', generated)
  }, [watchDisplayName, setValue, isEditing])

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (val !== lastAutoSlug.current) slugManuallyEdited.current = true
    setValue('slug', val)
  }

  async function onSave(data: CreateCampaignInput, publishOverride?: boolean) {
    setSaveState('saving')
    setErrorMessage(null)

    const published = publishOverride ?? data.published
    const result = isEditing
      ? await updateCampaignFn({
          data: {
            id: campaign.id,
            data: {
              slug: data.slug,
              display_name: data.display_name ?? null,
              brand: data.brand ?? null,
              esp_provider: data.esp_provider,
              esp_audience_ref: data.esp_audience_ref ?? null,
              esp_tag_launch: data.esp_tag_launch,
              published,
            },
          },
        })
      : await createCampaignFn({ data: { ...data, published } })

    if (result?.success) {
      setSaveState('saved')
      setValue('published', published)
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })
      setTimeout(() => setSaveState('idle'), 2500)
      if (!isEditing && result.data) {
        navigate({ to: routes.admin.ventureCampaign(result.data.id) })
      }
    } else {
      setSaveState('error')
      setErrorMessage(
        result?.error ??
          (isEditing ? messages.venture.updateCampaignFailed : messages.venture.createCampaignFailed),
      )
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }

  function onFormError(formErrors: Record<string, unknown>) {
    console.error('[VentureCampaignEditor] validation errors:', formErrors)
    setSaveState('error')
    setErrorMessage(messages.venture.formValidationError)
    setTimeout(() => setSaveState('idle'), 4000)
  }

  async function handleDelete() {
    if (!campaign) return
    setDeleteState('deleting')
    const result = await deleteCampaignFn({ data: { id: campaign.id } })
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })
      navigate({ to: routes.admin.venture })
    } else {
      setDeleteState('idle')
      setErrorMessage(result?.error ?? messages.venture.deleteCampaignFailed)
    }
  }

  const saveLabel: Record<SaveState, string> = {
    idle: messages.common.save,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* ---- TOP BAR ---- */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => navigate({ to: routes.admin.venture })}
              className="h-auto w-fit justify-start gap-1 p-0 text-sm text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden="true">&larr;</span>
              {messages.venture.campaignsTitle}
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? messages.venture.editCampaign : messages.venture.newCampaign}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && watchPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmit((data) => onSave(data, false), onFormError)}
                disabled={saveState === 'saving'}
              >
                {messages.common.unpublish}
              </Button>
            )}

            {watchPublished ? (
              <Button
                size="sm"
                onClick={handleSubmit((data) => onSave(data), onFormError)}
                disabled={saveState === 'saving'}
              >
                {saveLabel[saveState]}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit((data) => onSave(data, false), onFormError)}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel[saveState]}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit((data) => onSave(data, true), onFormError)}
                  disabled={saveState === 'saving'}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {messages.common.publish}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="w-full px-4 pt-3 sm:px-6">
          <div
            role="status"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        </div>
      )}

      {/* ---- MAIN ---- */}
      <div className="w-full flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
            {/* LEFT — campaign core + brand + bonuses */}
            <div className="flex max-w-4xl flex-col gap-6">
              {/* Client */}
              <div className="space-y-1.5">
                <Label htmlFor="campaign-client" className="text-sm font-medium">
                  {messages.venture.clientLabel}
                </Label>
                <Controller
                  name="client_id"
                  control={control}
                  render={({ field }) => (
                    <VentureClientSelect
                      id="campaign-client"
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? '')}
                      disabled={isEditing}
                    />
                  )}
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">{messages.venture.clientFixedHint}</p>
                )}
                {errors.client_id && (
                  <p className="text-xs text-destructive">{errors.client_id.message}</p>
                )}
              </div>

              {/* Display name */}
              <div className="space-y-1.5">
                <Label htmlFor="campaign-display-name" className="text-sm font-medium">
                  {messages.venture.displayNameLabel}
                </Label>
                <Input
                  id="campaign-display-name"
                  {...register('display_name')}
                  placeholder={messages.venture.displayNamePlaceholder}
                  className="text-sm"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="campaign-slug" className="text-sm font-medium">
                  {messages.venture.slugLabel}
                </Label>
                <Input
                  id="campaign-slug"
                  value={watchSlug}
                  onChange={handleSlugChange}
                  placeholder={messages.venture.slugPlaceholder}
                  className="font-mono text-sm"
                />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>

              {/* Brand */}
              <CampaignBrandEditor register={register} />

              {/* Bonuses */}
              <VentureBonusManager campaignId={campaign?.id ?? null} />
            </div>

            {/* RIGHT — ESP + status + delete */}
            <div className="flex flex-col gap-6">
              <CollapsibleCard title={messages.venture.espTitle} defaultOpen>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="esp-provider" className="text-sm font-medium">
                      {messages.venture.espProviderLabel}
                    </Label>
                    <Input
                      id="esp-provider"
                      {...register('esp_provider')}
                      placeholder={messages.venture.espProviderPlaceholder}
                      className="text-sm"
                    />
                    {errors.esp_provider && (
                      <p className="text-xs text-destructive">{errors.esp_provider.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="esp-audience-ref" className="text-sm font-medium">
                      {messages.venture.espAudienceRefLabel}
                    </Label>
                    <Input
                      id="esp-audience-ref"
                      {...register('esp_audience_ref')}
                      placeholder={messages.venture.espAudienceRefPlaceholder}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="esp-tag-launch" className="text-sm font-medium">
                      {messages.venture.espTagLaunchLabel}
                    </Label>
                    <Input
                      id="esp-tag-launch"
                      {...register('esp_tag_launch')}
                      placeholder={messages.venture.espTagLaunchPlaceholder}
                      className="font-mono text-sm"
                    />
                    {errors.esp_tag_launch && (
                      <p className="text-xs text-destructive">{errors.esp_tag_launch.message}</p>
                    )}
                  </div>
                </div>
              </CollapsibleCard>

              {/* Status */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    {messages.venture.statusTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="campaign-published" className="text-xs text-muted-foreground">
                      {messages.venture.publishedLabel}
                    </Label>
                    <Switch
                      id="campaign-published"
                      checked={watchPublished}
                      onCheckedChange={(v) => setValue('published', v, { shouldDirty: true })}
                      aria-label={messages.venture.publishedLabel}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{messages.venture.statusTitle}</span>
                    <span
                      className={
                        watchPublished
                          ? 'inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400'
                          : 'inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                      }
                    >
                      {watchPublished ? messages.common.published : messages.common.draft}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Delete (edit mode only) */}
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                      disabled={deleteState === 'deleting'}
                    >
                      {deleteState === 'deleting' ? messages.common.loading : messages.common.delete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{messages.venture.deleteCampaignConfirmTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {messages.venture.deleteCampaignConfirmDescription(
                          campaign.display_name ?? campaign.slug,
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {messages.common.delete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
