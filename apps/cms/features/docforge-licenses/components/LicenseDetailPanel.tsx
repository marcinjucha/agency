

import { useState, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Switch,
  Checkbox,
  Skeleton,
  DatePicker,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@agency/ui'
import { ArrowLeft, Check, Clipboard, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { useLicense, useLicenseActivations } from '../queries'
import { updateLicenseFn, deleteLicenseFn, deactivateActivationFn } from '../server'
import { computeLicenseStatus } from '../utils'
import { updateLicenseSchema, type UpdateLicenseValues } from '../validation'
import { StatusBadge } from './LicenseCard'
import { SeatsProgressBar } from './SeatsProgressBar'
import { ActivationCard, ActivationsEmptyState } from './ActivationCard'

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyKeyButton({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(licenseKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [licenseKey])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
      aria-label={copied ? messages.docforgeLicenses.keyCopied : messages.docforgeLicenses.copyKey}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Clipboard className="h-4 w-4" />
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

// ---------------------------------------------------------------------------
// Detail panel skeleton
// ---------------------------------------------------------------------------

function DetailPanelSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LicenseDetailPanelProps {
  licenseId: string
  onClose: () => void
}

export function LicenseDetailPanel({ licenseId, onClose }: LicenseDetailPanelProps) {
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPerpetual, setIsPerpetual] = useState(true)

  const { data: license, isLoading: licenseLoading } = useLicense(licenseId)
  const { data: activations, isLoading: activationsLoading } = useLicenseActivations(licenseId)

  const activeActivations = activations?.filter((a) => a.is_active) ?? []
  const activeSeats = activeActivations.length

  // --- RHF form ---

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<UpdateLicenseValues>({
    resolver: zodResolver(updateLicenseSchema),
    mode: 'onChange',
    defaultValues: {
      client_name: '',
      email: '',
      expires_at: null,
      max_seats: 1,
      grace_days: 7,
      is_active: true,
    },
  })

  // Sync form when license data arrives or changes
  useEffect(() => {
    if (!license) return
    const perpetual = license.expires_at === null
    setIsPerpetual(perpetual)
    reset({
      client_name: license.client_name ?? '',
      email: license.email ?? '',
      expires_at: license.expires_at ?? null,
      max_seats: license.max_seats,
      grace_days: license.grace_days,
      is_active: license.is_active,
    })
  }, [license, reset])

  // --- Mutations ---

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateLicenseValues) => {
      const result = await updateLicenseFn({ data: { id: licenseId, data } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await deleteLicenseFn({ data: { id: licenseId } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
      setDeleteOpen(false)
      onClose()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (activationId: string) => {
      const result = await deactivateActivationFn({ data: { activationId } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.activations(licenseId) })
    },
  })

  // --- Handlers ---

  function handlePerpetualChange(checked: boolean) {
    setIsPerpetual(checked)
    if (checked) {
      // Clear expires_at when switching to perpetual
      reset((prev) => ({ ...prev, expires_at: null }), { keepDirty: true, keepErrors: true })
    }
  }

  function onSubmit(data: UpdateLicenseValues) {
    // Ensure expires_at is null when perpetual
    const payload = { ...data, expires_at: isPerpetual ? null : data.expires_at }
    updateMutation.mutate(payload)
  }

  // --- Loading state ---

  if (licenseLoading) return <DetailPanelSkeleton />

  if (!license) return null

  const status = computeLicenseStatus(license)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label={messages.common.back}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-medium text-foreground truncate">
                {license.key}
              </span>
              <CopyKeyButton licenseKey={license.key} />
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Seats progress */}
        <SeatsProgressBar active={activeSeats} max={license.max_seats} />

        {/* Info section — always-visible edit form */}
        <section>
          <SectionHeading>{messages.docforgeLicenses.sectionInfo}</SectionHeading>
          <form
            id="license-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="mt-3 space-y-5"
          >
            {/* Client name (required) */}
            <div className="space-y-1.5">
              <Label htmlFor="lp-client-name">
                {messages.docforgeLicenses.clientNameLabel} *
              </Label>
              <Input
                id="lp-client-name"
                {...register('client_name')}
                aria-required="true"
                aria-invalid={!!errors.client_name}
                aria-describedby={errors.client_name ? 'lp-client-name-error' : undefined}
              />
              {errors.client_name && (
                <p id="lp-client-name-error" role="alert" className="text-xs text-destructive">
                  {errors.client_name.message}
                </p>
              )}
            </div>

            {/* Email (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="lp-email">{messages.docforgeLicenses.emailLabel}</Label>
              <Input
                id="lp-email"
                type="email"
                {...register('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'lp-email-error' : undefined}
              />
              {errors.email && (
                <p id="lp-email-error" role="alert" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Expiry: perpetual checkbox + DatePicker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lp-perpetual"
                  checked={isPerpetual}
                  onCheckedChange={(checked) => handlePerpetualChange(checked === true)}
                />
                <Label htmlFor="lp-perpetual" className="cursor-pointer">
                  {messages.docforgeLicenses.perpetualLabel}
                </Label>
              </div>
              {!isPerpetual && (
                <div className="space-y-1.5">
                  <Label htmlFor="lp-expires">{messages.docforgeLicenses.expiresAtLabel}</Label>
                  <Controller
                    name="expires_at"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        id="lp-expires"
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => field.onChange(date?.toISOString() ?? null)}
                      />
                    )}
                  />
                </div>
              )}
            </div>

            {/* Max seats + Grace days (2-col) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lp-seats">{messages.docforgeLicenses.maxSeatsLabel}</Label>
                <Input
                  id="lp-seats"
                  type="number"
                  min={1}
                  {...register('max_seats', { valueAsNumber: true })}
                  aria-invalid={!!errors.max_seats}
                  aria-describedby={errors.max_seats ? 'lp-seats-error' : undefined}
                />
                {errors.max_seats && (
                  <p id="lp-seats-error" role="alert" className="text-xs text-destructive">
                    {errors.max_seats.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lp-grace">{messages.docforgeLicenses.graceDaysLabel}</Label>
                <Input
                  id="lp-grace"
                  type="number"
                  min={0}
                  {...register('grace_days', { valueAsNumber: true })}
                  aria-invalid={!!errors.grace_days}
                  aria-describedby={errors.grace_days ? 'lp-grace-error' : undefined}
                />
                {errors.grace_days && (
                  <p id="lp-grace-error" role="alert" className="text-xs text-destructive">
                    {errors.grace_days.message}
                  </p>
                )}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="lp-active">{messages.docforgeLicenses.isActiveLabel}</Label>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="lp-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={messages.docforgeLicenses.isActiveLabel}
                  />
                )}
              />
            </div>

            {/* Created at (read-only) */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">
                {messages.docforgeLicenses.createdAt}
              </span>
              <p className="text-sm text-foreground">
                {new Date(license.created_at).toLocaleDateString('pl-PL')}
              </p>
            </div>

            {/* Save button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isDirty || !isValid || updateMutation.isPending}
            >
              {updateMutation.isPending
                ? messages.common.saving
                : messages.docforgeLicenses.saveButton}
            </Button>
          </form>
        </section>

        {/* Activations section */}
        <section>
          <SectionHeading>{messages.docforgeLicenses.sectionActivations}</SectionHeading>
          <div className="mt-3 space-y-3">
            {activationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : activeActivations.length === 0 ? (
              <ActivationsEmptyState />
            ) : (
              activeActivations.map((activation) => (
                <ActivationCard
                  key={activation.id}
                  activation={activation}
                  onDeactivate={(id) => deactivateMutation.mutate(id)}
                  isDeactivating={
                    deactivateMutation.isPending &&
                    deactivateMutation.variables === activation.id
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Footer: Delete button */}
      <div className="border-t border-border p-4">
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {messages.common.delete}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{messages.docforgeLicenses.deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {messages.docforgeLicenses.deleteConfirmDescription(license.key)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
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
