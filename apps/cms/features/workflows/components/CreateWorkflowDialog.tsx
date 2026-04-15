'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { queryKeys } from '@/lib/query-keys'
import { createWorkflowSchema, type CreateWorkflowFormData } from '../validation'
import { createWorkflowFn } from '../server'
import {
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

interface CreateWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkflowDialog({ open, onOpenChange }: CreateWorkflowDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkflowFormData>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CreateWorkflowFormData) => {
      const result = await createWorkflowFn({ data })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
      reset()
      onOpenChange(false)
      if (result.data?.id) {
        router.push(routes.admin.workflowEditor(result.data.id))
      }
    },
  })

  const onSubmit = (data: CreateWorkflowFormData) => {
    mutation.mutate(data)
  }

  const onFormError = () => {
    // Required: without onFormError, validation errors silently swallowed
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.workflows.createTitle}</DialogTitle>
          <DialogDescription>{messages.workflows.createDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="workflow-name">{messages.workflows.nameLabel} *</Label>
            <Input
              id="workflow-name"
              {...register('name')}
              placeholder={messages.workflows.namePlaceholder}
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'workflow-name-error' : undefined}
            />
            {errors.name && (
              <p id="workflow-name-error" role="alert" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="workflow-description">{messages.workflows.descriptionLabel}</Label>
            <Textarea
              id="workflow-description"
              {...register('description')}
              placeholder={messages.workflows.descriptionPlaceholder}
              rows={3}
            />
          </div>

          {/* Error */}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : messages.workflows.createFailed}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? messages.workflows.creating : messages.workflows.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
