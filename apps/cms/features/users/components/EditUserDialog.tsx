

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { usePermissions } from '@/contexts/permissions-context'
import { updateUserFn, toggleSuperAdminFn, changeUserPasswordFn, getTenantRolesFn } from '../server'
import { updateUserSchema, type UpdateUserFormData } from '../validation'
import type { UserWithRole } from '../types'
import { messages } from '@/lib/messages'
import {
  getUserClientAssignmentsFn,
  setUserClientAssignmentsFn,
} from '@/features/venture/assignments'
import {
  deriveClientAccess,
  showClientPicker,
  type ClientAccess,
} from '@/features/venture/utils/client-access'
import { ClientAssignmentPicker } from '@/features/venture/components/ClientAssignmentPicker'
import { ClientAccessBadge } from './ClientAccessBadge'
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
  RadioGroup,
  RadioGroupItem,
  LoadingState,
  ErrorState,
} from '@agency/ui'
import { Eye, EyeOff, Globe } from 'lucide-react'

/**
 * Form values extend the user-update schema with `clientIds` — the per-user
 * venture client assignments. `clientIds` is NOT part of updateUserSchema (it is
 * saved via a SEPARATE server fn, setUserClientAssignmentsFn), so it is stripped
 * from the zod-resolved submit payload and read back with getValues at save time.
 * It is managed by a `Controller` (never `register` — register keeps only the
 * last value for an array; ag-design-patterns).
 */
type EditUserFormValues = UpdateUserFormData & { clientIds: string[] }

interface EditUserDialogProps {
  user: UserWithRole | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const queryClient = useQueryClient()
  const {
    isSuperAdmin: currentUserIsSuperAdmin,
    userId: currentUserId,
    enabledFeatures,
  } = usePermissions()
  // Only surface client-access UI where the venture bonus-funnel feature is on.
  const ventureEnabled = enabledFeatures.includes('bonus_funnel')
  const [superAdminToggling, setSuperAdminToggling] = useState(false)
  const [superAdminError, setSuperAdminError] = useState<string | null>(null)
  const [localIsSuperAdmin, setLocalIsSuperAdmin] = useState(user?.is_super_admin ?? false)
  // Client-access tier as reactive LOCAL state (not RHF): it drives the picker
  // gate live and is merged into the update payload at submit. Kept out of the
  // RHF `values` object on purpose — `values` re-syncs (and would clobber this)
  // whenever the assignedClientIds query resolves. Prefilled from the loaded
  // user's authoritative scope via deriveClientAccess in the sync effect below.
  const [clientAccess, setClientAccess] = useState<ClientAccess>('selected')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordResult, setPasswordResult] = useState<{ success: boolean; message: string } | null>(null)

  // Sync local state when dialog opens with different user
  useEffect(() => {
    setLocalIsSuperAdmin(user?.is_super_admin ?? false)
    // Prefill the client-access toggle from the loaded user's authoritative
    // scope (users.role + is_super_admin) — owner/admin/super_admin → 'all'.
    setClientAccess(
      deriveClientAccess({
        isSuperAdmin: user?.is_super_admin ?? false,
        role: user?.role ?? null,
      }),
    )
    setShowPasswordForm(false)
    setNewPassword('')
    setShowPassword(false)
    setPasswordResult(null)
    // user?.role is read by deriveClientAccess above → must be a dep (exhaustive-deps),
    // otherwise the toggle prefill goes stale when only the coarse role changes.
  }, [user?.id, user?.is_super_admin, user?.role])

  // Use edited user's tenant for role query (user may belong to different tenant)
  const editTenantId = user?.tenant?.id ?? undefined

  const { data: roles } = useQuery({
    queryKey: queryKeys.roles.list(editTenantId),
    queryFn: () => getTenantRolesFn({ data: { tenantId: editTenantId } }),
  })

  // Current per-user client assignments — pre-fills the picker. Enabled only for
  // an existing user when the venture feature is on (no role dependency, so this
  // never creates a values↔query cycle). Keyed under the venture root so an
  // assignment save (invalidating venture.all) refreshes it.
  const {
    data: assignedClientIds,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: queryKeys.venture.assignments(user?.id ?? ''),
    queryFn: async () => {
      // Thread the EDITED user's tenant (editTenantId) so a super_admin editing a
      // user in another org reads THAT org's assignment map. Honored server-side
      // only for a super_admin; ignored (own tenant) for everyone else.
      const result = await getUserClientAssignmentsFn({
        data: { userId: user!.id, tenantId: editTenantId },
      })
      if (!result?.success) {
        throw new Error(result?.error ?? messages.users.loadAssignmentsFailed)
      }
      return result.data ?? []
    },
    enabled: !!user?.id && ventureEnabled,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    getValues,
    formState: { errors, isValid },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    mode: 'onChange',
    values: user
      ? {
          userId: user.id,
          fullName: user.full_name ?? '',
          roleId: user.tenant_role?.id ?? '',
          // Stable array ref from React Query — RHF deep-compares `values`, so a
          // refetch returning equal content won't clobber in-progress edits.
          clientIds: assignedClientIds ?? [],
        }
      : undefined,
  })

  const selectedRoleId = watch('roleId')

  // Scoped vs unscoped is now driven LIVE by the client-access toggle (iter-3c
  // UI), not the loaded user.role. A super admin is always unscoped, so the
  // toggle is forced to 'all' and disabled for them (super_admin can't be
  // scoped). owner/admin/super_admin → the picker is replaced by an info note.
  const effectiveClientAccess: ClientAccess = localIsSuperAdmin ? 'all' : clientAccess
  const clientPickerVisible = showClientPicker(effectiveClientAccess, localIsSuperAdmin)

  const mutation = useMutation({
    mutationFn: async (formData: EditUserFormValues) => {
      const { clientIds, ...userData } = formData
      // userData carries clientAccess (merged at submit) → updateUser writes the
      // coarse users.role ('all'→admin, 'selected'→member; a seeded owner is
      // preserved server-side). Without this the users.role write never happens
      // and an admin keeps seeing zero clients — the gap this iteration closes.
      const result = await updateUserFn({ data: userData })
      if (!result.success) throw new Error(result.error)
      if (ventureEnabled && user) {
        if (clientPickerVisible) {
          // Scoped tier — persist the picker selection. tenantId threads the
          // edited user's org so a super_admin can save cross-tenant (honored
          // server-side for super_admin only; own tenant for everyone else).
          const assignResult = await setUserClientAssignmentsFn({
            data: { userId: user.id, clientIds, tenantId: editTenantId },
          })
          if (!assignResult.success) {
            throw new Error(assignResult.error ?? messages.users.saveAssignmentsFailed)
          }
        } else if ((assignedClientIds?.length ?? 0) > 0) {
          // Switched to unscoped ('all' / super_admin) while stale per-client
          // rows exist — clear them (empty set = delete-only diff). RLS ignores
          // them for an unscoped user, but clearing avoids surprise access if
          // the user is later switched back to 'selected'.
          const clearResult = await setUserClientAssignmentsFn({
            data: { userId: user.id, clientIds: [], tenantId: editTenantId },
          })
          if (!clearResult.success) {
            throw new Error(clearResult.error ?? messages.users.saveAssignmentsFailed)
          }
        }
      }
      return result
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
        // Root-key — exact-key invalidation silently fails (ag-design-patterns).
        // Refreshes every access badge + the picker count under venture.*.
        queryClient.invalidateQueries({ queryKey: queryKeys.venture.all }),
      ])
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
    const result = await toggleSuperAdminFn({ data: { userId: user.id, isSuperAdmin: checked } })
    setSuperAdminToggling(false)
    if (!result.success) {
      setLocalIsSuperAdmin(!checked) // revert on error
      setSuperAdminError(result.error ?? null)
    } else {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    }
  }

  async function handleChangePassword() {
    if (!user || newPassword.length < 8) return
    setPasswordChanging(true)
    setPasswordResult(null)
    const result = await changeUserPasswordFn({ data: { userId: user.id, newPassword } })
    setPasswordChanging(false)
    if (result.success) {
      setPasswordResult({ success: true, message: messages.users.changePasswordSuccess })
      setNewPassword('')
      setShowPasswordForm(false)
    } else {
      setPasswordResult({ success: false, message: result.error ?? messages.common.unknownError })
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
          {ventureEnabled && user && (
            <div className="pt-1">
              <ClientAccessBadge
                userId={user.id}
                isSuperAdmin={localIsSuperAdmin}
                roleName={user.role}
              />
            </div>
          )}
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) =>
            mutation.mutate({
              ...data,
              clientIds: getValues('clientIds'),
              // clientAccess lives in local state (see above) — merge it so
              // updateUser writes users.role. Super admins are always 'all'.
              clientAccess: effectiveClientAccess,
            }),
          )}
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

          {/* Client Access — venture bonus-funnel scoping (only when feature on) */}
          {ventureEnabled && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-3">
                <Label id="edit-user-client-access-label">{messages.users.clientAccess}</Label>

                <RadioGroup
                  value={effectiveClientAccess}
                  onValueChange={(value) => setClientAccess(value as ClientAccess)}
                  disabled={localIsSuperAdmin}
                  aria-label={messages.users.clientAccessGroupLabel}
                >
                  <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="all" id="edit-user-client-access-all" />
                    <Label
                      htmlFor="edit-user-client-access-all"
                      className="cursor-pointer font-normal"
                    >
                      {messages.users.allClientsAccess}
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="selected" id="edit-user-client-access-selected" />
                    <Label
                      htmlFor="edit-user-client-access-selected"
                      className="cursor-pointer font-normal"
                    >
                      {messages.users.selectedClientsAccess}
                    </Label>
                  </div>
                </RadioGroup>

                {localIsSuperAdmin && (
                  <p className="text-xs text-muted-foreground">
                    {messages.users.superAdminAlwaysAllClients}
                  </p>
                )}

                {!clientPickerVisible ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                    <Globe className="h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-sm text-muted-foreground">
                      {messages.users.allClientsAccessHint}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {messages.users.assignClientsDescription}
                    </p>
                    {assignmentsError ? (
                      <ErrorState
                        variant="inline"
                        title={messages.users.loadAssignmentsFailed}
                        message={
                          assignmentsError instanceof Error
                            ? assignmentsError.message
                            : messages.common.errorOccurred
                        }
                        onRetry={() => refetchAssignments()}
                      />
                    ) : assignmentsLoading ? (
                      <LoadingState variant="skeleton-list" />
                    ) : (
                      <Controller
                        control={control}
                        name="clientIds"
                        render={({ field }) => (
                          <ClientAssignmentPicker
                            value={field.value ?? []}
                            onChange={field.onChange}
                            disabled={mutation.isPending}
                            labelId="edit-user-client-access-label"
                            tenantId={editTenantId}
                          />
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Change Password */}
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
