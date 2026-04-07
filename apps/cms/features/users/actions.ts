'use server'

import { revalidatePath } from 'next/cache'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import { authResult, zodParse, fromSupabase } from '@/lib/result-helpers'
import { type AuthSuccess } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createUserSchema, updateUserSchema, changePasswordSchema } from './validation'
import type { CreateUserInput, UpdateUserInput } from './types'
import type { ChangePasswordFormData } from './validation'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { createServiceClient } from '@/lib/supabase/service'

// --- Server Actions (public API) ---

/**
 * Create a new user in the same tenant as the current user.
 * 1. Creates auth.users entry via Admin API
 * 2. Creates public.users entry
 * 3. Assigns tenant role via user_roles
 */
export async function createUser(input: CreateUserInput) {
  const result = await zodParse(createUserSchema, input)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.createFailed)
      }
      // Super admin may specify target tenant; otherwise use auth tenant
      const targetTenantId =
        parsed.tenantId && auth.isSuperAdmin ? parsed.tenantId : auth.tenantId
      return createAuthUser(parsed.email, parsed.password)
        .andThen((authUser) =>
          insertUserRow(targetTenantId, authUser.id, parsed.email, parsed.fullName)
        )
        .andThen((userId) => assignRole(targetTenantId, userId, parsed.roleId))
    })

  return result.match(
    (data) => {
      revalidatePath(routes.admin.users)
      return { success: true as const, data }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Update user's full name and/or role assignment.
 */
export async function updateUser(input: UpdateUserInput) {
  const result = await zodParse(updateUserSchema, input)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.updateFailed)
      }
      return updateUserFields(auth, parsed)
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.users)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Delete a user completely: user_roles → users → auth.users.
 * Guards: cannot delete yourself, cannot delete super_admin.
 */
export async function deleteUser(userId: string) {
  const result = await authResult()
    .andThen((auth) => {
      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.deleteFailed)
      }
      return validateDeleteTarget(auth, userId)
        .andThen(() => removeUserRoles(auth, userId))
        .andThen(() => removeUserRow(auth, userId))
        .andThen(() => removeAuthUser(userId))
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.users)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Toggle super_admin status on a user.
 * Only callable by super_admin users. Cannot toggle own status.
 */
export async function toggleSuperAdmin(userId: string, isSuperAdmin: boolean) {
  const result = await authResult()
    .andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.users.onlySuperAdminCanToggle)
      }
      if (userId === auth.userId) {
        return errAsync(messages.users.cannotToggleOwnSuperAdmin)
      }
      return updateSuperAdminStatus(userId, isSuperAdmin)
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.users)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Change password for another user (not yourself).
 * Uses service client admin API to update auth.users password.
 */
export async function changeUserPassword(input: ChangePasswordFormData) {
  const result = await zodParse(changePasswordSchema, input)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      const isSelf = parsed.userId === auth.userId

      // Self-change: anyone can change their own password
      if (isSelf) {
        return updateAuthPassword(parsed.userId, parsed.newPassword)
      }

      // Changing other's password requires system.users permission
      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.changePasswordFailed)
      }

      // Hierarchical check: must outrank target user
      return canChangePasswordFor(auth, parsed.userId)
        .andThen(() => updateAuthPassword(parsed.userId, parsed.newPassword))
    })

  return result.match(
    () => ({ success: true as const }),
    (error) => ({ success: false as const, error }),
  )
}

// --- Hierarchy helpers ---

/** Role rank: super_admin=3, owner/admin=2, member/other=1 */
function getRoleRank(user: { is_super_admin: boolean; role: string | null }): number {
  if (user.is_super_admin) return 3
  if (user.role === 'owner' || user.role === 'admin') return 2
  return 1
}

/**
 * Check if current user can change target user's password.
 * Rule: must strictly outrank target (same level = denied).
 * Super admin can change anyone. Admin can change members. Members can't change others.
 */
function canChangePasswordFor(auth: AuthSuccess, targetUserId: string) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('users')
      .select('is_super_admin, role')
      .eq('id', targetUserId)
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ is_super_admin: boolean; role: string | null }>())
    .andThen((target) => {
      const myRank = getRoleRank({ is_super_admin: auth.isSuperAdmin, role: auth.roleName })
      const targetRank = getRoleRank(target)
      if (myRank <= targetRank) {
        return errAsync(messages.users.cannotChangeHigherRankPassword)
      }
      return okAsync(undefined)
    })
}

// --- DB helpers (feature-local) ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function updateSuperAdminStatus(userId: string, isSuperAdmin: boolean) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('users')
      .update({ is_super_admin: isSuperAdmin })
      .eq('id', userId)
      .then(checkSupabaseError),
    dbError,
  )
}

function createAuthUser(email: string, password: string) {
  return ResultAsync.fromPromise(
    createServiceClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
    dbError,
  ).andThen((res) => {
    if (res.error) return errAsync(res.error.message)
    if (!res.data.user) return errAsync(messages.users.createFailed)
    return okAsync(res.data.user)
  })
}

function insertUserRow(
  tenantId: string,
  authUserId: string,
  email: string,
  fullName: string,
) {
  const serviceClient = createServiceClient()
  return ResultAsync.fromPromise(
    (serviceClient as any)
      .from('users')
      .insert({
        id: authUserId,
        tenant_id: tenantId,
        email,
        full_name: fullName,
        role: 'member',
      })
      .select('id')
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ id: string }>())
    .map((row) => row.id)
}

function assignRole(tenantId: string, userId: string, roleId: string) {
  const serviceClient = createServiceClient()
  return ResultAsync.fromPromise(
    (serviceClient as any)
      .from('user_roles')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role_id: roleId,
      })
      .select()
      .single(),
    dbError,
  )
    .andThen(fromSupabase<Record<string, unknown>>())
    .map(() => ({ userId }))
}

function updateUserFields(auth: AuthSuccess, parsed: { userId: string; fullName?: string; roleId?: string }) {
  const tasks: ResultAsync<void, string>[] = []

  if (parsed.fullName !== undefined) {
    tasks.push(
      ResultAsync.fromPromise(
        (createServiceClient() as any)
          .from('users')
          .update({ full_name: parsed.fullName })
          .eq('id', parsed.userId)
          .then(checkSupabaseError),
        dbError,
      )
    )
  }

  if (parsed.roleId !== undefined) {
    // Upsert user_roles (user may already have a role)
    tasks.push(
      ResultAsync.fromPromise(
        (createServiceClient() as any)
          .from('user_roles')
          .upsert(
            {
              user_id: parsed.userId,
              tenant_id: auth.tenantId,
              role_id: parsed.roleId,
            },
            { onConflict: 'user_id,tenant_id' },
          )
          .then(checkSupabaseError),
        dbError,
      )
    )
  }

  if (tasks.length === 0) {
    return okAsync(undefined)
  }

  return ResultAsync.combine(tasks).map(() => undefined)
}

function validateDeleteTarget(auth: AuthSuccess, userId: string) {
  if (userId === auth.userId) {
    return errAsync(messages.users.cannotDeleteSelf)
  }

  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('users')
      .select('is_super_admin')
      .eq('id', userId)
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ is_super_admin: boolean }>())
    .andThen((user) =>
      user.is_super_admin
        ? errAsync(messages.users.cannotDeleteSuperAdmin)
        : okAsync(undefined),
    )
}

function removeUserRoles(auth: AuthSuccess, userId: string) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', auth.tenantId),
    dbError,
  ).map(() => undefined)
}

function removeUserRow(auth: AuthSuccess, userId: string) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('users')
      .delete()
      .eq('id', userId),
    dbError,
  ).map(() => undefined)
}

function removeAuthUser(userId: string) {
  return ResultAsync.fromPromise(
    createServiceClient().auth.admin.deleteUser(userId),
    dbError,
  ).andThen((res) => {
    if (res.error) return errAsync(res.error.message)
    return okAsync(undefined)
  })
}

function updateAuthPassword(userId: string, newPassword: string) {
  return ResultAsync.fromPromise(
    createServiceClient().auth.admin.updateUserById(userId, { password: newPassword }),
    dbError,
  ).andThen((res) => {
    if (res.error) return errAsync(res.error.message)
    return okAsync(undefined)
  })
}

/**
 * For update/upsert without .select(), Supabase returns { data: null, error: null } on success.
 * fromSupabase() rejects null data — this helper only checks the error field.
 */
function checkSupabaseError(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}
