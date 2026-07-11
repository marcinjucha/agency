import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CollapsibleCard,
  Input,
  Label,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { ColorPicker } from '@/components/ui/color-picker'
import { LogoMediaField } from '@/features/venture/components/LogoMediaField'
import { themeInputSchema, type ThemeInput } from '../validation'
import type { Theme } from '../types'
import { createThemeFn, updateThemeFn } from '../server'
import { THEME_TOKEN_GROUPS } from '../utils/token-groups'
import { ThemePreview } from './ThemePreview'
import type { ThemeColorTokenKey, ThemeTokens } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Theme Manager (iter D3a) — theme editor (create + edit).
//
// 2-col layout mirroring VentureClientEditor: left = token controls (RHF +
// zodResolver(themeInputSchema)), right = sticky live preview. Explicit Save +
// ⌘S + SaveState (high-impact edit — apps/cms/CLAUDE.md). No manual memoization
// (React Compiler on). `theme` undefined = create mode → navigate to the edit
// route on success so subsequent ⌘S saves are updates.
// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ThemeEditorProps {
  /** Existing theme (edit mode) or undefined (create mode). */
  theme?: Theme
}

export function ThemeEditor({ theme }: ThemeEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ThemeInput>({
    resolver: zodResolver(themeInputSchema),
    defaultValues: {
      name: theme?.name ?? '',
      // Spread the stored tokens verbatim: absent keys stay `undefined` (valid
      // per `.optional()`), so a never-touched ColorPicker never emits an empty
      // string into form state (`hexColorSchema` rejects '').
      tokens: { ...(theme?.tokens ?? {}) },
    },
  })

  // Reactive token object → the live preview pipes it through resolveClientTheme.
  const tokens = (useWatch({ control, name: 'tokens' }) ?? {}) as ThemeTokens

  async function onSave(data: ThemeInput) {
    setSaveState('saving')
    setErrorMessage(null)

    // Normalise the free-text font: '' → null (an empty string is a no-op font
    // but null is the canonical "unset"). Colour tokens are already hex|null|
    // undefined (ColorPicker only writes valid hex), logoUrl is url|null.
    const normalisedTokens: ThemeTokens = {
      ...data.tokens,
      fontFamily: data.tokens.fontFamily?.trim() || null,
    }

    const result = theme
      ? await updateThemeFn({
          data: { id: theme.id, data: { name: data.name, tokens: normalisedTokens } },
        })
      : await createThemeFn({ data: { name: data.name, tokens: normalisedTokens } })

    if (result?.success) {
      setSaveState('saved')
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all })
      // The email block editor resolves the tenant base theme into swatches/preview
      // (cached 5 min). Editing a theme must refresh it, else stale colours linger.
      queryClient.invalidateQueries({ queryKey: queryKeys.email.resolvedTheme })
      // Create mode: switch to the edit route of the freshly-created theme so
      // the next ⌘S is an update (not a duplicate insert).
      if (!theme) {
        navigate({ to: routes.admin.theme(result.data.id) })
        return
      }
      setTimeout(() => setSaveState('idle'), 2500)
    } else {
      setSaveState('error')
      setErrorMessage(mapError(result?.error, Boolean(theme)))
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }

  function onFormError(formErrors: Record<string, unknown>) {
    console.error('[ThemeEditor] validation errors:', formErrors)
    setSaveState('error')
    setErrorMessage(messages.themes.formValidationError)
    setTimeout(() => setSaveState('idle'), 4000)
  }

  const saveLabel: Record<SaveState, string> = {
    idle: messages.common.save,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }

  // ⌘S / Ctrl+S — mirrors VentureClientEditor / EmailTemplateEditor convention.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSubmit(onSave, onFormError)()
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
              onClick={() => navigate({ to: routes.admin.themes })}
              className="h-auto w-fit justify-start gap-1 p-0 text-sm text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden="true">&larr;</span>
              {messages.themes.title}
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {theme
                ? `${messages.themes.editThemeTitle} — ${theme.name}`
                : messages.themes.newThemeTitle}
            </h1>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit(onSave, onFormError)}
            disabled={saveState === 'saving'}
          >
            {saveLabel[saveState]}
          </Button>
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
            {/* LEFT — token controls */}
            <div className="flex flex-col gap-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    {messages.themes.tokensTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-name" className="text-sm font-medium">
                      {messages.themes.nameLabel}
                    </Label>
                    <Input
                      id="theme-name"
                      {...register('name')}
                      placeholder={messages.themes.namePlaceholder}
                      className="text-sm"
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  {THEME_TOKEN_GROUPS.map((group) => (
                    <div key={group.labelKey} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {messages.themes[group.labelKey]}
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {group.tokens.map((token) => (
                          <TokenColorField
                            key={token}
                            token={token}
                            value={watch(`tokens.${token}`) ?? ''}
                            onChange={(hex) =>
                              setValue(`tokens.${token}`, hex as never, {
                                shouldDirty: true,
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <CollapsibleCard title={messages.themes.groupAssets} defaultOpen>
                <div className="space-y-5">
                  <LogoMediaField
                    value={watch('tokens.logoUrl') ?? null}
                    onChange={(url) =>
                      setValue('tokens.logoUrl', url, { shouldDirty: true })
                    }
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font" className="text-sm font-medium">
                      {messages.themes.fontFamilyLabel}
                    </Label>
                    <Input
                      id="theme-font"
                      {...register('tokens.fontFamily')}
                      placeholder={messages.themes.fontFamilyPlaceholder}
                      className="text-sm"
                    />
                  </div>
                </div>
              </CollapsibleCard>
            </div>

            {/* RIGHT — sticky live preview */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    {messages.themes.previewTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ThemePreview tokens={tokens} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Small labelled ColorPicker cell — a visible <Label htmlFor> wires to the
// ColorPicker's trigger button `id` for WCAG label association.
function TokenColorField({
  token,
  value,
  onChange,
}: {
  token: ThemeColorTokenKey
  value: string
  onChange: (hex: string) => void
}) {
  const id = `theme-token-${token}`
  const label = messages.email.themeTokenLabels[token]
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <ColorPicker id={id} label={label} value={value} onChange={onChange} />
    </div>
  )
}

function mapError(error: string | undefined, isEdit: boolean): string {
  if (error === 'nameTaken') return messages.themes.nameTaken
  return error ?? (isEdit ? messages.themes.updateFailed : messages.themes.createFailed)
}
