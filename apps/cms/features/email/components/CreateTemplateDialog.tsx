import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { createEmailTemplateSchema, type CreateEmailTemplateInput } from '../validation'
import { createEmailTemplateFn } from '../server'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Local snake_case slugifier — email_templates.type uses regex `^[a-z][a-z0-9_]*$`.
// Shared `generateSlug` in lib/utils/slug.ts produces kebab-case (dash), which would
// fail the email-template regex. We need underscores + must start with a letter.
// Strips diacritics, maps Polish chars, lowercases, collapses runs of non-alphanumerics
// to a single `_`, trims leading/trailing underscores, and returns empty string when
// the result still starts with a digit/underscore so Zod validation surfaces the issue.
const POLISH_MAP: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
}

function slugifyTemplateLabel(text: string): string {
  const normalized = text
    .toLowerCase()
    .split('')
    .map((c) => POLISH_MAP[c] ?? c)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)

  if (normalized === '' || /^[^a-z]/.test(normalized)) {
    return ''
  }

  return normalized
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userEditedSlugRef = useRef(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEmailTemplateInput>({
    resolver: zodResolver(createEmailTemplateSchema),
    defaultValues: {
      label: '',
      type: '',
    },
  })

  // Auto-slugify label -> type as a non-blocking suggestion. The user can still
  // override the slug manually; once they touch the slug field (see slug input's
  // onChange below), we stop syncing.
  const labelValue = watch('label')
  const typeValue = watch('type')
  const lastSuggestionRef = useRef<string>('')

  useEffect(() => {
    if (userEditedSlugRef.current) return
    // Only suggest when the slug field is empty OR still holds the previous
    // suggestion (user hasn't typed over it).
    if (typeValue !== '' && typeValue !== lastSuggestionRef.current) return

    const suggested = slugifyTemplateLabel(labelValue ?? '')
    if (suggested === typeValue) return

    lastSuggestionRef.current = suggested
    setValue('type', suggested, { shouldValidate: false, shouldDirty: false })
  }, [labelValue, typeValue, setValue])

  const slugRegistration = register('type')

  const mutation = useMutation({
    mutationFn: async (data: CreateEmailTemplateInput) => {
      const result = await createEmailTemplateFn({ data })
      if (!result.success) {
        throw new Error(result.error ?? messages.email.createFailed)
      }
      return result
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.templates })
      const createdType = variables.type
      reset()
      userEditedSlugRef.current = false
      lastSuggestionRef.current = ''
      onOpenChange(false)
      navigate({ to: '/admin/email-templates/$type', params: { type: createdType } })
    },
  })

  const onSubmit = (data: CreateEmailTemplateInput) => {
    mutation.mutate(data)
  }

  const onFormError = () => {
    // Required: without onFormError, RHF silently swallows validation errors.
  }

  const handleClose = (next: boolean) => {
    if (!next) {
      reset()
      userEditedSlugRef.current = false
      lastSuggestionRef.current = ''
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.email.createDialogTitle}</DialogTitle>
          <DialogDescription>{messages.email.createDialogDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-4">
          {/* Label (display name) */}
          <div className="space-y-1.5">
            <Label htmlFor="email-template-label">{messages.email.labelField} *</Label>
            <Input
              id="email-template-label"
              autoFocus
              {...register('label')}
              placeholder={messages.email.labelPlaceholder}
              aria-required="true"
              aria-invalid={!!errors.label}
              aria-describedby={errors.label ? 'email-template-label-error' : undefined}
            />
            {errors.label && (
              <p
                id="email-template-label-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.label.message}
              </p>
            )}
          </div>

          {/* Slug (type) */}
          <div className="space-y-1.5">
            <Label htmlFor="email-template-slug">{messages.email.slugField} *</Label>
            <Input
              id="email-template-slug"
              {...slugRegistration}
              onChange={(e) => {
                userEditedSlugRef.current = true
                slugRegistration.onChange(e)
              }}
              placeholder={messages.email.slugPlaceholder}
              aria-required="true"
              aria-invalid={!!errors.type}
              aria-describedby={
                errors.type ? 'email-template-slug-error' : 'email-template-slug-hint'
              }
            />
            <p id="email-template-slug-hint" className="text-xs text-muted-foreground">
              {messages.email.slugHint}
            </p>
            {errors.type && (
              <p
                id="email-template-slug-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Submit error */}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : messages.email.createFailed}
            </p>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? messages.common.saving : messages.email.createSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
