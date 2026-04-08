'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Checkbox,
  DatePicker,
} from '@agency/ui'
import { RefreshCw } from 'lucide-react'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { createLicenseSchema, type CreateLicenseValues } from '../validation'
import { createLicense } from '../actions'
import { generateLicenseKey } from '../utils'

interface CreateLicenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateLicenseDialog({ open, onOpenChange }: CreateLicenseDialogProps) {
  const queryClient = useQueryClient()
  const [isPerpetual, setIsPerpetual] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateLicenseValues>({
    resolver: zodResolver(createLicenseSchema),
    mode: 'onChange',
    defaultValues: {
      key: generateLicenseKey(),
      client_name: '',
      email: '',
      expires_at: null,
      max_seats: 1,
      grace_days: 7,
    },
  })

  const keyValue = watch('key')

  const createMutation = useMutation({
    mutationFn: async (data: CreateLicenseValues) => {
      const result = await createLicense(data)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
      handleClose()
    },
  })

  function handleClose() {
    reset({
      key: generateLicenseKey(),
      client_name: '',
      email: '',
      expires_at: null,
      max_seats: 1,
      grace_days: 7,
    })
    setIsPerpetual(true)
    onOpenChange(false)
  }

  function handleGenerateKey() {
    setValue('key', generateLicenseKey(), { shouldValidate: true })
  }

  function handlePerpetualChange(checked: boolean) {
    setIsPerpetual(checked)
    if (checked) {
      setValue('expires_at', null, { shouldValidate: true })
    }
  }

  function onSubmit(data: CreateLicenseValues) {
    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{messages.docforgeLicenses.createTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* License key */}
          <div className="space-y-1.5">
            <Label htmlFor="df-key">{messages.docforgeLicenses.keyLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="df-key"
                {...register('key')}
                value={keyValue}
                className="flex-1 font-mono"
                readOnly
                aria-invalid={!!errors.key}
                aria-describedby={errors.key ? 'df-key-error' : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateKey}
                aria-label={messages.docforgeLicenses.generateKey}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {messages.docforgeLicenses.generateKey}
              </Button>
            </div>
            {errors.key && (
              <p id="df-key-error" role="alert" className="text-xs text-destructive">
                {errors.key.message}
              </p>
            )}
          </div>

          {/* Client name (required) */}
          <div className="space-y-1.5">
            <Label htmlFor="df-client">{messages.docforgeLicenses.clientNameLabel} *</Label>
            <Input
              id="df-client"
              {...register('client_name')}
              aria-required="true"
              aria-invalid={!!errors.client_name}
              aria-describedby={errors.client_name ? 'df-client-error' : undefined}
            />
            {errors.client_name && (
              <p id="df-client-error" role="alert" className="text-xs text-destructive">
                {errors.client_name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="df-email">{messages.docforgeLicenses.emailLabel}</Label>
            <Input
              id="df-email"
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'df-email-error' : undefined}
            />
            {errors.email && (
              <p id="df-email-error" role="alert" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Max seats + Grace days (2-col) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="df-seats">{messages.docforgeLicenses.maxSeatsLabel}</Label>
              <Input
                id="df-seats"
                type="number"
                min={1}
                {...register('max_seats', { valueAsNumber: true })}
                aria-invalid={!!errors.max_seats}
                aria-describedby={errors.max_seats ? 'df-seats-error' : undefined}
              />
              {errors.max_seats && (
                <p id="df-seats-error" role="alert" className="text-xs text-destructive">
                  {errors.max_seats.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="df-grace">{messages.docforgeLicenses.graceDaysLabel}</Label>
              <Input
                id="df-grace"
                type="number"
                min={0}
                {...register('grace_days', { valueAsNumber: true })}
                aria-invalid={!!errors.grace_days}
                aria-describedby={errors.grace_days ? 'df-grace-error' : undefined}
              />
              {errors.grace_days && (
                <p id="df-grace-error" role="alert" className="text-xs text-destructive">
                  {errors.grace_days.message}
                </p>
              )}
            </div>
          </div>

          {/* Perpetual checkbox + DatePicker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="df-perpetual"
                checked={isPerpetual}
                onCheckedChange={(checked) => handlePerpetualChange(checked === true)}
              />
              <Label htmlFor="df-perpetual" className="cursor-pointer">
                {messages.docforgeLicenses.perpetualLabel}
              </Label>
            </div>
            {!isPerpetual && (
              <div className="space-y-1.5">
                <Label htmlFor="df-expires">{messages.docforgeLicenses.expiresAtLabel}</Label>
                <Controller
                  name="expires_at"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date?.toISOString() ?? null)}
                    />
                  )}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending ? messages.common.saving : messages.docforgeLicenses.createButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
