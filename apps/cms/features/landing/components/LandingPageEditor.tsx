import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@agency/ui'
import type { LandingPage } from '../types'
import { isValidCtaUrl } from '../validation'
import { messages } from '@/lib/messages'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface LandingPageEditorProps {
  page: LandingPage | null | undefined
  isLoading: boolean
  error: unknown
  saveFn: (id: string, cta_url: string) => Promise<{ success: boolean; error?: string }>
}

interface CtaFormValues {
  cta_url: string
}

export function LandingPageEditor({ page, isLoading, error, saveFn }: LandingPageEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CtaFormValues>({
    mode: 'onChange',
    defaultValues: { cta_url: page?.cta_url ?? '' },
  })

  // Sync form once the fetched page arrives.
  useEffect(() => {
    if (page) reset({ cta_url: page.cta_url ?? '' })
  }, [page, reset])

  if (isLoading) return <EditorSkeleton />
  if (error) return <EditorError />
  if (!page) return <EditorEmpty />

  const onSubmit = handleSubmit(async (values) => {
    setSaveState('saving')
    setServerError(null)
    try {
      const result = await saveFn(page.id, values.cta_url.trim())
      if (result.success) {
        setSaveState('saved')
      } else {
        setServerError(result.error ?? null)
        setSaveState('error')
      }
    } catch (err) {
      console.error('[LandingPage] Save failed:', err)
      setSaveState('error')
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  })

  return (
    <div className="mx-auto max-w-lg">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{messages.landing.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="landing-cta-url" className="text-sm font-medium">
                {messages.landing.ctaUrlLabel}
              </Label>
              <Input
                id="landing-cta-url"
                {...register('cta_url', {
                  required: messages.landing.ctaUrlRequired,
                  validate: (value) =>
                    isValidCtaUrl(value) || messages.landing.ctaUrlInvalid,
                })}
                placeholder={messages.landing.ctaUrlPlaceholder}
                aria-invalid={!!errors.cta_url}
                aria-describedby="landing-cta-url-help"
                className="text-sm"
              />
              <p id="landing-cta-url-help" className="text-xs text-muted-foreground">
                {messages.landing.ctaUrlHelp}
              </p>
              {errors.cta_url && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.cta_url.message}
                </p>
              )}
            </div>

            {saveState === 'error' && (
              <p role="alert" className="text-sm text-destructive">
                {serverError ?? messages.landing.saveFailed}
              </p>
            )}

            <Button
              type="submit"
              disabled={saveState === 'saving'}
              className={`w-full ${saveState === 'saved' ? 'bg-primary/80' : ''}`}
            >
              {SAVE_LABEL[saveState]}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: messages.common.save,
  saving: messages.common.saving,
  saved: messages.common.saved,
  error: messages.common.saveError,
}

function EditorSkeleton() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

function EditorError() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <p className="text-sm text-destructive font-medium">{messages.landing.loadFailed}</p>
    </div>
  )
}

function EditorEmpty() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{messages.landing.emptyState}</p>
    </div>
  )
}
