'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { updateUser } from '../actions'
import { getTenantRoles } from '../queries'
import { updateUserSchema, type UpdateUserFormData } from '../validation'
import type { UserWithRole } from '../types'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'

interface EditUserDialogProps {
  user: UserWithRole | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const queryClient = useQueryClient()

  const { data: roles } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: getTenantRoles,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    mode: 'onChange',
    values: user
      ? {
          userId: user.id,
          fullName: user.full_name ?? '',
          roleId: user.tenant_role?.id ?? '',
        }
      : undefined,
  })

  const selectedRoleId = watch('roleId')

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserFormData) => {
      const result = await updateUser(data)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      reset()
      onOpenChange(false)
    },
  })

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.users.editUser}</DialogTitle>
          <DialogDescription>
            {user?.email}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-5"
        >
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-user-fullname">{messages.users.fullName}</Label>
            <Input
              id="edit-user-fullname"
              {...register('fullName')}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'edit-user-fullname-error' : undefined}
            />
            {errors.fullName && (
              <p id="edit-user-fullname-error" role="alert" className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Role Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-user-role">{messages.users.role}</Label>
            <Select
              value={selectedRoleId}
              onValueChange={(value) => setValue('roleId', value, { shouldValidate: true })}
            >
              <SelectTrigger id="edit-user-role">
                <SelectValue placeholder={messages.users.selectRole} />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error display */}
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
              {mutation.isPending ? messages.common.saving : messages.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
