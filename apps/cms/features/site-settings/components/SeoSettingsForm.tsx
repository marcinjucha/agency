

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button, Card, Input, LoadingState, ErrorState, TooltipProvider } from '@agency/ui'
import { getSiteSettings, getKeywordPool } from '../queries'
import { updateSiteSettingsFn } from '../server'
import { siteSettingsSchema, type SiteSettingsInput } from '../validation'
import { siteSettingsKeys } from '../types'
import { FormFieldWithTooltip } from './FormFieldWithTooltip'
import { KeywordSelect } from './KeywordSelect'
import { messages } from '@/lib/messages'

export function SeoSettingsForm() {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: siteSettingsKeys.detail,
    queryFn: getSiteSettings,
  })

  const { data: keywordPool = [], isLoading: isPoolLoading } = useQuery({
    queryKey: siteSettingsKeys.keywordPool,
    queryFn: getKeywordPool,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      organization_name: '',
      logo_url: '',
      default_og_image_url: '',
      social_facebook: '',
      social_instagram: '',
      social_linkedin: '',
      social_twitter: '',
      google_site_verification: '',
      default_keywords: [],
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        organization_name: data.organization_name ?? '',
        logo_url: data.logo_url ?? '',
        default_og_image_url: data.default_og_image_url ?? '',
        social_facebook: data.social_facebook ?? '',
        social_instagram: data.social_instagram ?? '',
        social_linkedin: data.social_linkedin ?? '',
        social_twitter: data.social_twitter ?? '',
        google_site_verification: data.google_site_verification ?? '',
        default_keywords: data.default_keywords ?? [],
      })
    }
  }, [data, reset])

  async function onSubmit(values: SiteSettingsInput) {
    setSaveState('saving')
    setSaveError(null)
    try {
      const result = await updateSiteSettingsFn({ data: values })
      if (result.success) {
        setSaveState('saved')
      } else {
        setSaveState('error')
        setSaveError(result.error)
      }
    } catch {
      setSaveState('error')
      setSaveError(messages.siteSettings.saveError)
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  if (isLoading) {
    return <LoadingState variant="skeleton-card" rows={3} />
  }

  if (error) {
    return (
      <ErrorState
        title={messages.siteSettings.saveError}
        message={error.message}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1: Organizacja */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {messages.siteSettings.organizationCard}
          </h3>
          <div className="space-y-4">
            <FormFieldWithTooltip
              htmlFor="organization_name"
              label={messages.siteSettings.organizationName}
              tooltip={messages.siteSettings.organizationNameHint}
              error={errors.organization_name?.message}
            >
              <Input
                id="organization_name"
                aria-invalid={!!errors.organization_name}
                aria-describedby={errors.organization_name ? 'organization_name-error' : undefined}
                {...register('organization_name')}
              />
            </FormFieldWithTooltip>

            <FormFieldWithTooltip
              htmlFor="logo_url"
              label={messages.siteSettings.logoUrl}
              tooltip={messages.siteSettings.logoUrlHint}
              error={errors.logo_url?.message}
            >
              <Input
                id="logo_url"
                type="url"
                aria-invalid={!!errors.logo_url}
                aria-describedby={errors.logo_url ? 'logo_url-error' : undefined}
                {...register('logo_url')}
              />
            </FormFieldWithTooltip>

            <FormFieldWithTooltip
              htmlFor="default_og_image_url"
              label={messages.siteSettings.defaultOgImage}
              tooltip={messages.siteSettings.defaultOgImageHint}
              error={errors.default_og_image_url?.message}
            >
              <Input
                id="default_og_image_url"
                type="url"
                aria-invalid={!!errors.default_og_image_url}
                aria-describedby={errors.default_og_image_url ? 'default_og_image_url-error' : undefined}
                {...register('default_og_image_url')}
              />
            </FormFieldWithTooltip>
          </div>
        </Card>

        {/* Card 2: Profile spolecznosciowe */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {messages.siteSettings.socialProfiles}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {messages.siteSettings.socialProfilesHint}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormFieldWithTooltip
              htmlFor="social_facebook"
              label={messages.siteSettings.facebook}
              tooltip={messages.siteSettings.facebookHint}
              error={errors.social_facebook?.message}
            >
              <Input
                id="social_facebook"
                type="url"
                placeholder="https://facebook.com/..."
                aria-invalid={!!errors.social_facebook}
                aria-describedby={errors.social_facebook ? 'social_facebook-error' : undefined}
                {...register('social_facebook')}
              />
            </FormFieldWithTooltip>

            <FormFieldWithTooltip
              htmlFor="social_instagram"
              label={messages.siteSettings.instagram}
              tooltip={messages.siteSettings.instagramHint}
              error={errors.social_instagram?.message}
            >
              <Input
                id="social_instagram"
                type="url"
                placeholder="https://instagram.com/..."
                aria-invalid={!!errors.social_instagram}
                aria-describedby={errors.social_instagram ? 'social_instagram-error' : undefined}
                {...register('social_instagram')}
              />
            </FormFieldWithTooltip>

            <FormFieldWithTooltip
              htmlFor="social_linkedin"
              label={messages.siteSettings.linkedin}
              tooltip={messages.siteSettings.linkedinHint}
              error={errors.social_linkedin?.message}
            >
              <Input
                id="social_linkedin"
                type="url"
                placeholder="https://linkedin.com/company/..."
                aria-invalid={!!errors.social_linkedin}
                aria-describedby={errors.social_linkedin ? 'social_linkedin-error' : undefined}
                {...register('social_linkedin')}
              />
            </FormFieldWithTooltip>

            <FormFieldWithTooltip
              htmlFor="social_twitter"
              label={messages.siteSettings.twitter}
              tooltip={messages.siteSettings.twitterHint}
              error={errors.social_twitter?.message}
            >
              <Input
                id="social_twitter"
                type="url"
                placeholder="https://x.com/..."
                aria-invalid={!!errors.social_twitter}
                aria-describedby={errors.social_twitter ? 'social_twitter-error' : undefined}
                {...register('social_twitter')}
              />
            </FormFieldWithTooltip>
          </div>
        </Card>

        {/* Card 3: Google Search Console */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {messages.siteSettings.googleSearchConsole}
          </h3>
          <FormFieldWithTooltip
            htmlFor="google_site_verification"
            label={messages.siteSettings.googleSearchConsole}
            tooltip={messages.siteSettings.googleSearchConsoleHint}
            error={errors.google_site_verification?.message}
            helperText={messages.siteSettings.googleSearchConsoleHelper}
          >
            <Input
              id="google_site_verification"
              aria-invalid={!!errors.google_site_verification}
              aria-describedby={
                errors.google_site_verification
                  ? 'google_site_verification-error'
                  : 'google_site_verification-helper'
              }
              {...register('google_site_verification')}
            />
          </FormFieldWithTooltip>
        </Card>

        {/* Card 4: Domyslne slowa kluczowe */}
        <Card className="p-6">
          <FormFieldWithTooltip
            htmlFor="default_keywords"
            label={messages.siteSettings.defaultKeywords}
            tooltip={messages.siteSettings.defaultKeywordsHint}
          >
            <Controller
              name="default_keywords"
              control={control}
              render={({ field }) => (
                <KeywordSelect
                  id="default_keywords"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  pool={keywordPool}
                  isLoading={isPoolLoading}
                />
              )}
            />
          </FormFieldWithTooltip>
        </Card>

        {/* Submit area */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saveState === 'saving'} className="w-full sm:w-auto">
            {saveState === 'saving' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saveState === 'saving' ? messages.siteSettings.saving : messages.siteSettings.save}
          </Button>

          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              {messages.siteSettings.saveSuccess}
            </span>
          )}

          {saveState === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {saveError || messages.siteSettings.saveError}
            </span>
          )}
        </div>
      </form>
    </TooltipProvider>
  )
}
