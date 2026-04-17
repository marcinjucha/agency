import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import {
  createLegalPageSchema,
  LEGAL_PAGE_PRESETS,
  type LegalPageFormData,
  type LegalPagePresetKey,
} from '../validation'
import { legalPageKeys } from '../queries'
import { createLegalPageFn } from '../server'
import type { TiptapContent } from '../../editor/types'
import { TiptapEditor } from '../../editor/components/TiptapEditor'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type KindOption = LegalPagePresetKey | 'custom'

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] }

const KIND_OPTIONS: ReadonlyArray<KindOption> = [
  'privacy_policy',
  'terms',
  'cookies',
  'custom',
]

function getPresetLabel(kind: KindOption): string {
  if (kind === 'custom') return messages.legalPages.presets.custom
  // `LEGAL_PAGE_PRESETS[kind].titleKey` -> one of messages.legalPages.presets.*
  const titleKey = LEGAL_PAGE_PRESETS[kind].titleKey
  return messages.legalPages.presets[titleKey]
}

export function CreateLegalPageForm() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string>('')
  const [kind, setKind] = useState<KindOption>('custom')

  const { control, handleSubmit, setValue, watch } = useForm<LegalPageFormData>({
    resolver: zodResolver(createLegalPageSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      content: EMPTY_CONTENT,
      slug: '',
      is_published: false,
    },
  })

  const slugValue = watch('slug')
  const isPresetKind = kind !== 'custom'

  const onKindChange = (value: string) => {
    const nextKind = value as KindOption
    setKind(nextKind)

    if (nextKind === 'custom') {
      setValue('slug', '', { shouldValidate: true })
      setValue('title', '', { shouldValidate: true })
      return
    }

    const preset = LEGAL_PAGE_PRESETS[nextKind]
    setValue('slug', preset.slug, { shouldValidate: true })
    setValue('title', messages.legalPages.presets[preset.titleKey], {
      shouldValidate: true,
    })
  }

  const onContentChange = (content: TiptapContent) => {
    setValue('content', content)
  }

  const onSubmit = async (data: LegalPageFormData) => {
    setSaveState('saving')
    setSaveError('')

    let result: { success: boolean; id?: string; error?: string }
    try {
      result = await createLegalPageFn({ data })
    } catch (e) {
      result = {
        success: false,
        error: e instanceof Error ? e.message : messages.common.unknownError,
      }
    }

    if (result.success && result.id) {
      setSaveState('saved')
      queryClient.invalidateQueries({ queryKey: legalPageKeys.all })
      navigate({ to: routes.admin.legalPage(result.id) })
      return
    }

    setSaveState('error')
    setSaveError(result.error || messages.legalPages.createError)
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={routes.admin.legalPages}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={messages.common.back}
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-foreground truncate">
            {messages.legalPages.createTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {saveState === 'error' && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving'
              ? messages.common.saving
              : saveState === 'saved'
                ? messages.common.saved
                : messages.common.save}
          </Button>
        </div>
      </div>

      {/* Kind selector */}
      <div className="space-y-2">
        <Label htmlFor="kind">{messages.legalPages.kindLabel}</Label>
        <Select value={kind} onValueChange={onKindChange}>
          <SelectTrigger id="kind" className="w-full sm:w-[360px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {getPresetLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {messages.legalPages.kindHelp}
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          {messages.validation.titleRequired.replace(' jest wymagany', '')}
        </Label>
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="title"
                {...field}
                aria-invalid={!!fieldState.error}
                aria-describedby={fieldState.error ? 'title-error' : undefined}
              />
              {fieldState.error && (
                <p
                  id="title-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">{messages.legalPages.slugLabel}</Label>
        <Controller
          name="slug"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="slug"
                {...field}
                readOnly={isPresetKind}
                aria-readonly={isPresetKind}
                aria-invalid={!!fieldState.error}
                aria-describedby={
                  fieldState.error ? 'slug-error' : 'slug-help'
                }
                className={isPresetKind ? 'opacity-70' : undefined}
                placeholder="polityka-prywatnosci"
              />
              {fieldState.error ? (
                <p
                  id="slug-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldState.error.message}
                </p>
              ) : (
                <p id="slug-help" className="text-xs text-muted-foreground">
                  {messages.legalPages.slugHelp}
                  {slugValue && (
                    <>
                      {' '}
                      <span className="text-foreground/80">
                        /{slugValue}
                      </span>
                    </>
                  )}
                </p>
              )}
            </>
          )}
        />
      </div>

      {/* Publish toggle */}
      <div className="flex items-center gap-2">
        <Controller
          name="is_published"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="is_published"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="is_published">{messages.legalPages.published}</Label>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        <TiptapEditor content={EMPTY_CONTENT} onChange={onContentChange} />
      </div>
    </div>
  )
}
