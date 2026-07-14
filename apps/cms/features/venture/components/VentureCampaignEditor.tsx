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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { generateSlug } from '@/lib/utils/slug'
import { createCampaignSchema, type CreateCampaignInput } from '../validation'
import type { AdminCampaign, CampaignBrand } from '../types'
import { createCampaignFn, updateCampaignFn, deleteCampaignFn } from '../admin'
import { LEAD_SOURCE_IDS } from '../lead-sources/types'
import { getLeadSourceSpec } from '../lead-sources/specs'
import { evaluateEditorPublishGate } from '../utils/lead-source-publish-gate'
import { resolveMessageKey } from '../utils/resolve-message-key'
import { VentureClientSelect } from './VentureClientSelect'
import { CampaignThemeCard } from './CampaignThemeCard'
import { CampaignBonusTemplateCard } from './CampaignBonusTemplateCard'
import { CampaignEffectiveSendCard } from './CampaignEffectiveSendCard'
import { VentureBonusManager } from './VentureBonusManager'
import { LeadSourceConfigFields } from './LeadSourceConfigFields'

// Sentinel Select value for the "draft / no source" option — shadcn Select
// requires a non-empty string value, so null is represented by this token and
// mapped back to null in the save payload.
const LEAD_SOURCE_NONE = '__none__'
// Resolve each provider's display label via its client-safe spec labelKey.
const LEAD_SOURCE_OPTIONS = Object.values(LEAD_SOURCE_IDS).map((id) => ({
  id,
  labelKey: getLeadSourceSpec(id).labelKey,
}))

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface VentureCampaignEditorProps {
  campaign?: AdminCampaign
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
      // Assigned named theme (so_campaigns.theme_id). NULL = inherit the client
      // theme (design § Campaign tier); a uuid = a library theme. The freeform
      // `brand` above is the third, mutually-exclusive tier — CampaignThemeCard
      // keeps exactly one of {theme_id, brand} populated per its 3-way mode.
      theme_id: campaign?.theme_id ?? null,
      esp_provider: campaign?.esp_provider ?? 'beehiiv',
      esp_audience_ref: campaign?.esp_audience_ref ?? '',
      esp_tag_launch: campaign?.esp_tag_launch ?? 'launch-notify',
      // Never prefill the real secret into the form — blank means "leave as-is"
      // on edit; typing a value rotates it.
      tally_webhook_secret: '',
      // NULL = draft (no lead source). New campaigns default to draft. Cast: the
      // DB/AdminCampaign column is a plain `string | null`, while the RHF field
      // type is the refined LeadSourceId union — a persisted value is always a
      // registered id (or null), so the widening cast is safe.
      lead_source_provider: (campaign?.lead_source_provider ??
        null) as CreateCampaignInput['lead_source_provider'],
      // Non-secret provider config (JSONB). Secret fields never live here.
      lead_source_config:
        (campaign?.lead_source_config as Record<string, unknown> | null) ?? {},
      published: campaign?.published ?? false,
    },
  })

  const secretAlreadySet = isEditing && !!campaign?.has_webhook_secret

  const watchDisplayName = watch('display_name')
  const watchSlug = watch('slug')
  const watchPublished = watch('published')
  const watchLeadSourceProvider = watch('lead_source_provider')
  const watchLeadSourceConfig = watch('lead_source_config')
  const watchSecretInput = watch('tally_webhook_secret')

  // UI mirror of the server publish gate — drives Publish-button enablement +
  // the inline hint. The server remains the source of truth (backstop).
  const publishGate = evaluateEditorPublishGate({
    provider: watchLeadSourceProvider,
    secretAlreadySet,
    secretInput: watchSecretInput,
    config: watchLeadSourceConfig ?? {},
  })
  const canPublish = publishGate.ok
  const publishGateHint =
    publishGate.ok === false
      ? publishGate.reason === 'no_provider'
        ? messages.venture.publishRequiresLeadSource
        : messages.venture.publishRequiresLeadSourceConfig
      : null

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
    // Blank secret input never reaches the wire as '': on edit an untyped secret
    // is OMITTED (leave untouched); on create it becomes null (no secret yet).
    const secretInput = data.tally_webhook_secret?.trim() || null
    const result = isEditing
      ? await updateCampaignFn({
          data: {
            id: campaign.id,
            data: {
              slug: data.slug,
              display_name: data.display_name ?? null,
              brand: data.brand ?? null,
              // null = inherit the client theme, a uuid = a library theme.
              theme_id: data.theme_id ?? null,
              esp_provider: data.esp_provider,
              esp_audience_ref: data.esp_audience_ref ?? null,
              esp_tag_launch: data.esp_tag_launch,
              // Only rotate when the operator actually typed a new secret.
              ...(secretInput ? { tally_webhook_secret: secretInput } : {}),
              // Lead-source provider (NULL = draft). Non-secret config → JSONB;
              // the handler strips it to the provider's non-secret shape.
              lead_source_provider: data.lead_source_provider ?? null,
              lead_source_config: data.lead_source_config ?? {},
              published,
            },
          },
        })
      : await createCampaignFn({
          data: { ...data, tally_webhook_secret: secretInput, published },
        })

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

  // ⌘S / Ctrl+S keyboard shortcut — mirrors the neutral Save button (never the
  // publishOverride variants, so the shortcut preserves current publish state).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSubmit((data) => onSave(data), onFormError)()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSubmit])

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
              // Already published: the primary Save keeps published=true, so it
              // must honor the publish gate (server backstops it regardless).
              <Button
                size="sm"
                onClick={handleSubmit((data) => onSave(data), onFormError)}
                disabled={saveState === 'saving' || !canPublish}
                title={publishGateHint ?? undefined}
              >
                {saveLabel[saveState]}
              </Button>
            ) : (
              <>
                {/* Draft save is ALWAYS allowed — no provider required. */}
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
                  disabled={saveState === 'saving' || !canPublish}
                  title={publishGateHint ?? undefined}
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
            {/* LEFT — campaign core + bonuses */}
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

              {/* Bonuses */}
              <VentureBonusManager campaignId={campaign?.id ?? null} />
            </div>

            {/* RIGHT — appearance + ESP + status + delete */}
            <div className="flex flex-col gap-6">
              {/* Wygląd kampanii — 3-way theme (inherit / library / own brand) */}
              <CampaignThemeCard register={register} watch={watch} setValue={setValue} />

              {/* Bonus email template picker (MUTATION surface) — assigns
                  so_campaigns.email_template_id. Placed just above the read-only
                  effective-send mirror. Edit-mode only (needs a persisted campaign
                  id + client-owned chain). */}
              {isEditing && campaign && (
                <CampaignBonusTemplateCard
                  campaignId={campaign.id}
                  currentTemplateId={campaign.email_template_id}
                />
              )}

              {/* Read-only "Ten launch wysyła" surface — effective sender +
                  appearance cross-ref + template deep-link. Edit-mode only (needs a
                  persisted campaign id to resolve the send chain). */}
              {isEditing && campaign && (
                <CampaignEffectiveSendCard
                  campaignId={campaign.id}
                  clientId={campaign.client_id}
                />
              )}

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

              {/* Lead source — provider select + DYNAMIC per-provider config.
                  Replaces the old hardcoded Tally-secret field: the secret is
                  now rendered by the generic LeadSourceConfigFields from the
                  provider's configFields descriptor. */}
              <CollapsibleCard title={messages.venture.leadSourceTitle} defaultOpen>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-source-provider" className="text-sm font-medium">
                      {messages.venture.leadSourceProviderLabel}
                    </Label>
                    <Select
                      value={watchLeadSourceProvider ?? LEAD_SOURCE_NONE}
                      onValueChange={(v) =>
                        setValue(
                          'lead_source_provider',
                          v === LEAD_SOURCE_NONE
                            ? null
                            : (v as CreateCampaignInput['lead_source_provider']),
                          { shouldDirty: true },
                        )
                      }
                    >
                      <SelectTrigger id="lead-source-provider" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LEAD_SOURCE_NONE}>
                          {messages.venture.leadSourceNoneOption}
                        </SelectItem>
                        {LEAD_SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {resolveMessageKey(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.lead_source_provider && (
                      <p className="text-xs text-destructive">
                        {errors.lead_source_provider.message}
                      </p>
                    )}
                  </div>

                  {watchLeadSourceProvider ? (
                    <LeadSourceConfigFields
                      provider={watchLeadSourceProvider}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      errors={errors}
                      secretAlreadySet={secretAlreadySet}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {messages.venture.leadSourceConfigHint}
                    </p>
                  )}

                  {publishGateHint && (
                    <p role="status" className="text-xs text-muted-foreground">
                      {publishGateHint}
                    </p>
                  )}
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
