

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@agency/ui'
import { Loader2, XCircle } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { addCalDAVConnectionFn } from '../server'
import { caldavConnectionSchema, type CaldavConnectionSchema } from '../validation'

type AddCalDAVDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCalDAVDialog({ open, onOpenChange }: AddCalDAVDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CaldavConnectionSchema>({
    resolver: zodResolver(caldavConnectionSchema),
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: async (data: CaldavConnectionSchema) => {
      const result = await addCalDAVConnectionFn({ data })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
      reset()
      onOpenChange(false)
    },
  })

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset()
      mutation.reset()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.calendar.addCalDAVTitle}</DialogTitle>
          <DialogDescription>
            {messages.calendar.addCalDAVDescription}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-5"
        >
          {/* Server URL */}
          <div className="space-y-1.5">
            <Label htmlFor="caldav-serverUrl">
              {messages.calendar.serverUrl} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caldav-serverUrl"
              type="url"
              placeholder={messages.calendar.serverUrlPlaceholder}
              aria-required="true"
              aria-invalid={!!errors.serverUrl}
              aria-describedby={errors.serverUrl ? 'caldav-serverUrl-error' : undefined}
              {...register('serverUrl')}
            />
            {errors.serverUrl && (
              <p id="caldav-serverUrl-error" role="alert" className="text-sm text-destructive">
                {errors.serverUrl.message}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="caldav-username">
              {messages.calendar.username} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caldav-username"
              placeholder={messages.calendar.usernamePlaceholder}
              aria-required="true"
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'caldav-username-error' : undefined}
              {...register('username')}
            />
            {errors.username && (
              <p id="caldav-username-error" role="alert" className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="caldav-password">
              {messages.calendar.password} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caldav-password"
              type="password"
              placeholder={messages.calendar.passwordPlaceholder}
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'caldav-password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="caldav-password-error" role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="caldav-displayName">
              {messages.calendar.displayName} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caldav-displayName"
              placeholder={messages.calendar.displayNamePlaceholder}
              aria-required="true"
              aria-invalid={!!errors.displayName}
              aria-describedby={errors.displayName ? 'caldav-displayName-error' : undefined}
              {...register('displayName')}
            />
            {errors.displayName && (
              <p id="caldav-displayName-error" role="alert" className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>

          {/* Error from server */}
          {mutation.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-xs text-destructive">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : messages.common.unknownError}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={mutation.isPending}
            >
              {messages.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!isValid || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {messages.calendar.connecting}
                </>
              ) : (
                messages.calendar.testAndConnect
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
