'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createUser } from '../actions'
import { getTenantRoles } from '../queries'
import { createUserSchema, type CreateUserFormData } from '../validation'
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
import { Eye, EyeOff } from 'lucide-react'

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)

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
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', fullName: '', roleId: '' },
  })

  const selectedRoleId = watch('roleId')

  const mutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const result = await createUser(data)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      reset()
      onOpenChange(false)
    },
  })

  function handleClose() {
    reset()
    setShowPassword(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.users.addUser}</DialogTitle>
          <DialogDescription>
            {messages.users.addUserDescription}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-5"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="user-email">{messages.users.email}</Label>
            <Input
              id="user-email"
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'user-email-error' : undefined}
            />
            {errors.email && (
              <p id="user-email-error" role="alert" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password with show/hide toggle */}
          <div className="space-y-1.5">
            <Label htmlFor="user-password">{messages.users.password}</Label>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="pr-10"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'user-password-error' : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? messages.users.hidePassword : messages.users.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p id="user-password-error" role="alert" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="user-fullname">{messages.users.fullName}</Label>
            <Input
              id="user-fullname"
              {...register('fullName')}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'user-fullname-error' : undefined}
            />
            {errors.fullName && (
              <p id="user-fullname-error" role="alert" className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Role Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="user-role">{messages.users.role}</Label>
            <Select
              value={selectedRoleId}
              onValueChange={(value) => setValue('roleId', value, { shouldValidate: true })}
            >
              <SelectTrigger id="user-role" aria-invalid={!!errors.roleId}>
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
            {errors.roleId && (
              <p role="alert" className="text-xs text-destructive">
                {errors.roleId.message}
              </p>
            )}
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
              {mutation.isPending ? messages.common.saving : messages.users.addUser}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
