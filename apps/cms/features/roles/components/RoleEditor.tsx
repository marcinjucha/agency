'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createRole, updateRole } from '../actions'
import { createRoleSchema, type CreateRoleFormData } from '../validation'
import type { TenantRoleWithPermissions } from '../types'
import type { PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Textarea,
} from '@agency/ui'
import { PermissionPicker } from './PermissionPicker'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoleEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, editor is in "edit" mode. When null, "create" mode. */
  role: TenantRoleWithPermissions | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleEditor({ open, onOpenChange, role }: RoleEditorProps) {
  const queryClient = useQueryClient()
  const isEditing = role !== null

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  })

  // Reset form when dialog opens or role changes
  useEffect(() => {
    if (open) {
      reset({
        name: role?.name ?? '',
        description: role?.description ?? '',
        permissions: role?.permissions ?? [],
      })
    }
  }, [open, role, reset])

  const mutation = useMutation({
    mutationFn: async (data: CreateRoleFormData) => {
      const result = isEditing
        ? await updateRole({
            roleId: role.id,
            name: data.name,
            description: data.description ?? undefined,
            permissions: data.permissions as PermissionKey[],
          })
        : await createRole({
            name: data.name,
            description: data.description ?? undefined,
            permissions: data.permissions as PermissionKey[],
          })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      handleClose()
    },
  })

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? messages.roles.editRole : messages.roles.addRole}
          </DialogTitle>
          <DialogDescription>
            {messages.roles.selectPermissions}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-6"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="role-name">
              {messages.roles.name} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              {...register('name')}
              placeholder={messages.roles.namePlaceholder}
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'role-name-error' : undefined}
            />
            {errors.name && (
              <p
                id="role-name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="role-description">
              {messages.roles.description}
            </Label>
            <Textarea
              id="role-description"
              {...register('description')}
              placeholder={messages.roles.descriptionPlaceholder}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Permissions */}
          <div className="space-y-1.5">
            <Label>{messages.roles.permissions}</Label>
            <Controller
              name="permissions"
              control={control}
              render={({ field }) => (
                <PermissionPicker
                  value={field.value as PermissionKey[]}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.permissions && (
              <p role="alert" className="text-xs text-destructive">
                {errors.permissions.message}
              </p>
            )}
          </div>

          {/* Mutation error */}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={!isValid || mutation.isPending}>
              {mutation.isPending
                ? messages.common.saving
                : messages.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
