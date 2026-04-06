'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { usePermissions } from '@/contexts/permissions-context'
import { updateUser, toggleSuperAdmin, changeUserPassword } from '../actions'
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
  Switch,
} from '@agency/ui'
import { Eye, EyeOff } from 'lucide-react'

interface EditUserDialogProps {
  user: UserWithRole | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const queryClient = useQueryClient()
  const { isSuperAdmin: currentUserIsSuperAdmin, userId: currentUserId } = usePermissions()
  const [superAdminToggling, setSuperAdminToggling] = useState(false)
  const [superAdminError, setSuperAdminError] = useState<string | null>(null)
  const [localIsSuperAdmin, setLocalIsSuperAdmin] = useState(user?.is_super_admin ?? false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordResult, setPasswordResult] = useState<{ success: boolean; message: string } | null>(null)

  // Sync local state when dialog opens with different user
  useEffect(() => {
    setLocalIsSuperAdmin(user?.is_super_admin ?? false)
    setShowPasswordForm(false)
    setNewPassword('')
    setShowPassword(false)
    setPasswordResult(null)
  }, [user?.id, user?.is_super_admin])

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

  const isEditingSelf = user?.id === currentUserId

  async function handleSuperAdminToggle(checked: boolean) {
    if (!user) return
    setLocalIsSuperAdmin(checked) // optimistic UI update
    setSuperAdminToggling(true)
    setSuperAdminError(null)
    const result = await toggleSuperAdmin(user.id, checked)
    setSuperAdminToggling(false)
    if (!result.success) {
      setLocalIsSuperAdmin(!checked) // revert on error
      setSuperAdminError(result.error)
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    }
  }

  async function handleChangePassword() {
    if (!user || newPassword.length < 8) return
    setPasswordChanging(true)
    setPasswordResult(null)
    const result = await changeUserPassword({ userId: user.id, newPassword })
    setPasswordChanging(false)
    if (result.success) {
      setPasswordResult({ success: true, message: messages.users.changePasswordSuccess })
      setNewPassword('')
      setShowPasswordForm(false)
    } else {
      setPasswordResult({ success: false, message: result.error })
    }
  }

  function handleClose() {
    reset()
    setSuperAdminError(null)
    setShowPasswordForm(false)
    setNewPassword('')
    setShowPassword(false)
    setPasswordResult(null)
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
            {errors.roleId && (
              <p role="alert" className="text-xs text-destructive">
                {errors.roleId.message}
              </p>
            )}
          </div>

          {/* Change Password — only for other users */}
          {!isEditingSelf && (
            <>
              <div className="border-t border-border" />
              {!showPasswordForm ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{messages.users.changePassword}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    {messages.users.changePassword}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="edit-user-new-password">{messages.users.newPassword}</Label>
                  <div className="relative">
                    <Input
                      id="edit-user-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      placeholder={messages.users.passwordMinLength}
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
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={newPassword.length < 8 || passwordChanging}
                      onClick={handleChangePassword}
                    >
                      {passwordChanging ? messages.common.saving : messages.users.changePassword}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setNewPassword('')
                        setPasswordResult(null)
                      }}
                    >
                      {messages.common.cancel}
                    </Button>
                  </div>
                </div>
              )}
              {passwordResult && (
                <p
                  role="alert"
                  className={`text-xs ${passwordResult.success ? 'text-emerald-400' : 'text-destructive'}`}
                >
                  {passwordResult.message}
                </p>
              )}
            </>
          )}

          {/* Super Admin Toggle — only visible to super admins */}
          {currentUserIsSuperAdmin && (
            <>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{messages.users.superAdminToggle}</Label>
                  <p className="text-xs text-muted-foreground">
                    {messages.users.superAdminDescription}
                  </p>
                </div>
                <Switch
                  checked={localIsSuperAdmin}
                  onCheckedChange={handleSuperAdminToggle}
                  disabled={isEditingSelf || superAdminToggling}
                  aria-label={messages.users.superAdminToggle}
                />
              </div>
              {isEditingSelf && (
                <p className="text-xs text-muted-foreground">
                  {messages.users.cannotToggleOwnSuperAdmin}
                </p>
              )}
              {superAdminError && (
                <p role="alert" className="text-xs text-destructive">
                  {superAdminError}
                </p>
              )}
            </>
          )}

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
