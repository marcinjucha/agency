import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CollapsibleCard,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { createClientSchema, type CreateClientInput } from '../validation'
import { MAIL_PROVIDERS, type AdminClient } from '../types'
import { updateClientFn } from '../admin'

// Mirrors VentureCampaignEditor.tsx 1:1 (top bar, sections in cards, Save +
// ⌘S, masked secret fields with "leave blank = don't change"). Mail
// credentials live on the CLIENT (shared across its campaigns), never on
// so_campaigns — a mailbox is one account reused by every campaign.

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const PROVIDER_LABEL: Record<(typeof MAIL_PROVIDERS)[number], string> = {
  resend_shared: messages.venture.mailProviderResendShared,
  resend_own: messages.venture.mailProviderResendOwn,
  gmail_smtp: messages.venture.mailProviderGmail,
}

interface VentureClientEditorProps {
  client: AdminClient
}

export function VentureClientEditor({ client }: VentureClientEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateClientInput, unknown, CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: client.name,
      slug: client.slug,
      // client.mail_provider is DB-generic `string` (Tables<'so_clients'>) —
      // cast to the fixed union, same pattern as bonus.type in
      // VentureBonusManager.tsx.
      mail_provider: (client.mail_provider as CreateClientInput['mail_provider']) ?? 'resend_shared',
      resend_from_email: client.resend_from_email ?? '',
      // Never prefill real secrets into the form — blank means "leave as-is"
      // on save; typing a value rotates it (same pattern as
      // so_campaigns.tally_webhook_secret in VentureCampaignEditor).
      resend_api_key: '',
      gmail_address: client.gmail_address ?? '',
      gmail_app_password: '',
    },
  })

  const mailProvider = useWatch({ control, name: 'mail_provider' })
  const resendAlreadySet = !!client.has_resend_api_key
  const gmailAlreadySet = !!client.has_gmail_app_password

  async function onSave(data: CreateClientInput) {
    setSaveState('saving')
    setErrorMessage(null)

    // Blank secret/email inputs never reach the wire as '': omitted (leave
    // untouched) for secrets, null for optional email fields.
    const resendApiKeyInput = data.resend_api_key?.trim() || null
    const gmailAppPasswordInput = data.gmail_app_password?.trim() || null

    const result = await updateClientFn({
      data: {
        id: client.id,
        data: {
          name: data.name,
          slug: data.slug,
          mail_provider: data.mail_provider,
          resend_from_email: data.resend_from_email?.trim() || null,
          gmail_address: data.gmail_address?.trim() || null,
          // Only rotate when the operator actually typed a new secret.
          ...(resendApiKeyInput ? { resend_api_key: resendApiKeyInput } : {}),
          ...(gmailAppPasswordInput ? { gmail_app_password: gmailAppPasswordInput } : {}),
        },
      },
    })

    if (result?.success) {
      setSaveState('saved')
      setValue('resend_api_key', '')
      setValue('gmail_app_password', '')
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })
      setTimeout(() => setSaveState('idle'), 2500)
    } else {
      setSaveState('error')
      setErrorMessage(result?.error ?? messages.venture.updateClientFailed)
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }

  function onFormError(formErrors: Record<string, unknown>) {
    console.error('[VentureClientEditor] validation errors:', formErrors)
    setSaveState('error')
    setErrorMessage(messages.venture.formValidationError)
    setTimeout(() => setSaveState('idle'), 4000)
  }

  const saveLabel: Record<SaveState, string> = {
    idle: messages.common.save,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }

  // ⌘S / Ctrl+S — mirrors WorkflowEditor.tsx / EmailTemplateEditor.tsx /
  // VentureCampaignEditor.tsx convention (apps/cms/CLAUDE.md).
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
              onClick={() => navigate({ to: routes.admin.ventureClients })}
              className="h-auto w-fit justify-start gap-1 p-0 text-sm text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden="true">&larr;</span>
              {messages.venture.clientsTitle}
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {messages.venture.editClient} — {client.name}
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
            {/* LEFT — core fields */}
            <div className="flex max-w-4xl flex-col gap-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    {messages.venture.clientsTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="client-name" className="text-sm font-medium">
                      {messages.venture.clientNameLabel}
                    </Label>
                    <Input
                      id="client-name"
                      {...register('name')}
                      placeholder={messages.venture.clientNamePlaceholder}
                      className="text-sm"
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="client-slug" className="text-sm font-medium">
                      {messages.venture.clientSlugLabel}
                    </Label>
                    <Input
                      id="client-slug"
                      {...register('slug')}
                      className="font-mono text-sm"
                    />
                    {errors.slug && (
                      <p className="text-xs text-destructive">{errors.slug.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mail provider */}
              <CollapsibleCard title={messages.venture.mailProviderTitle} defaultOpen>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="mail-provider" className="text-sm font-medium">
                      {messages.venture.mailProviderLabel}
                    </Label>
                    <Select
                      value={mailProvider}
                      onValueChange={(v) =>
                        setValue('mail_provider', v as CreateClientInput['mail_provider'], {
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger id="mail-provider" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAIL_PROVIDERS.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {PROVIDER_LABEL[provider]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {mailProvider === 'resend_own' && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="resend-from-email" className="text-sm font-medium">
                          {messages.venture.resendFromEmailLabel}
                        </Label>
                        <Input
                          id="resend-from-email"
                          type="email"
                          {...register('resend_from_email')}
                          placeholder={messages.venture.resendFromEmailPlaceholder}
                          className="text-sm"
                        />
                        {errors.resend_from_email && (
                          <p className="text-xs text-destructive">
                            {errors.resend_from_email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="resend-api-key" className="text-sm font-medium">
                          {messages.venture.resendApiKeyLabel}
                        </Label>
                        <Input
                          id="resend-api-key"
                          type="password"
                          autoComplete="off"
                          {...register('resend_api_key')}
                          placeholder={resendAlreadySet ? '••••••••' : ''}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          {messages.venture.resendApiKeyHelp}
                        </p>
                        {errors.resend_api_key && (
                          <p className="text-xs text-destructive">
                            {errors.resend_api_key.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {mailProvider === 'gmail_smtp' && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="gmail-address" className="text-sm font-medium">
                          {messages.venture.gmailAddressLabel}
                        </Label>
                        <Input
                          id="gmail-address"
                          type="email"
                          {...register('gmail_address')}
                          placeholder={messages.venture.gmailAddressPlaceholder}
                          className="text-sm"
                        />
                        {errors.gmail_address && (
                          <p className="text-xs text-destructive">
                            {errors.gmail_address.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="gmail-app-password" className="text-sm font-medium">
                          {messages.venture.gmailAppPasswordLabel}
                        </Label>
                        <Input
                          id="gmail-app-password"
                          type="password"
                          autoComplete="off"
                          {...register('gmail_app_password')}
                          placeholder={gmailAlreadySet ? '••••••••' : ''}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          {messages.venture.gmailAppPasswordHelp}
                        </p>
                        {errors.gmail_app_password && (
                          <p className="text-xs text-destructive">
                            {errors.gmail_app_password.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
