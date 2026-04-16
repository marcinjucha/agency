import { createServerFn } from '@tanstack/react-start'
import { ok, err, errAsync, okAsync, ResultAsync } from 'neverthrow'
import { fromSupabase } from '@/lib/result-helpers'
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './validation'
import type { CreateUserInput, UpdateUserInput } from './types'
import type { ChangePasswordFormData } from './validation'
import type { UserWithRole } from './types'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'
import { createServiceClient } from '@/lib/supabase/service'
import { hasPermission } from '@/lib/permissions'
import {
  type AuthContextFull as AuthContext,
  requireAuthContextFull as requireAuthContext,
} from '@/lib/server-auth'

// ---------------------------------------------------------------------------
// DB error mapper
// ---------------------------------------------------------------------------

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

// ---------------------------------------------------------------------------
// Server Functions (public API) — queries
// ---------------------------------------------------------------------------

/**
 * Fetch all users for a tenant with their assigned role.
 * TanStack Start port of features/users/queries.ts#getUsers.
 */
export const getUsersFn = createServerFn()
  .inputValidator((input: { tenantId?: string }) => input)
  .handler(async ({ data }): Promise<UserWithRole[]> => {
    const supabase = createStartClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        is_super_admin,
        created_at,
        updated_at,
        tenants!tenant_id (
          id,
          name
        ),
        user_roles (
          role_id,
          tenant_roles (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (data.tenantId) {
      query = query.eq('tenant_id', data.tenantId)
    }

    const { data: rows, error } = await query

    if (error) throw error

    return (rows ?? []).map(transformUserRow)
  })

/**
 * Fetch available tenant roles for role selector dropdown.
 * TanStack Start port of features/users/queries.ts#getTenantRoles.
 */
export const getTenantRolesFn = createServerFn()
  .inputValidator((input: { tenantId?: string }) => input)
  .handler(async ({ data }): Promise<{ id: string; name: string; description: string | null; is_default: boolean }[]> => {
    const supabase = createStartClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('tenant_roles')
      .select('id, name, description, is_default')
      .order('name', { ascending: true })

    if (data.tenantId) {
      query = query.eq('tenant_id', data.tenantId)
    }

    const { data: rows, error } = await query

    if (error) throw error
    return (rows ?? []) as { id: string; name: string; description: string | null; is_default: boolean }[]
  })

// ---------------------------------------------------------------------------
// Server Functions (public API) — mutations
// ---------------------------------------------------------------------------

/**
 * Create a new user in the same tenant as the current user.
 * TanStack Start port of features/users/actions.ts#createUser.
 */
export const createUserFn = createServerFn()
  .inputValidator((input: CreateUserInput) => createUserSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; data?: { userId: string }; error?: string }> => {
      const result = await requireAuthContext().andThen((auth) => {
        if (!hasPermission('system.users', auth.permissions)) {
          return errAsync(messages.users.createFailed)
        }
        const targetTenantId =
          data.tenantId && auth.isSuperAdmin ? data.tenantId : auth.tenantId
        return createAuthUser(data.email, data.password)
          .andThen((authUser) =>
            insertUserRow(targetTenantId, authUser.id, data.email, data.fullName),
          )
          .andThen((userId) => assignRole(targetTenantId, userId, data.roleId))
      })

      return result.match(
        (d) => ({ success: true, data: d }),
        (error) => ({ success: false, error }),
      )
    },
  )

/**
 * Update user's full name and/or role assignment.
 * TanStack Start port of features/users/actions.ts#updateUser.
 */
export const updateUserFn = createServerFn()
  .inputValidator((input: UpdateUserInput) => updateUserSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => {
      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.updateFailed)
      }
      return updateUserFields(auth, data)
    })

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error }),
    )
  })

/**
 * Delete a user completely: user_roles -> users -> auth.users.
 * TanStack Start port of features/users/actions.ts#deleteUser.
 */
export const deleteUserFn = createServerFn()
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => {
      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.deleteFailed)
      }
      return validateDeleteTarget(auth, data.userId)
        .andThen(() => removeUserRoles(auth, data.userId))
        .andThen(() => removeUserRow(auth, data.userId))
        .andThen(() => removeAuthUser(data.userId))
    })

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error }),
    )
  })

/**
 * Toggle super_admin status on a user.
 * TanStack Start port of features/users/actions.ts#toggleSuperAdmin.
 */
export const toggleSuperAdminFn = createServerFn()
  .inputValidator((input: { userId: string; isSuperAdmin: boolean }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.users.onlySuperAdminCanToggle)
      }
      if (data.userId === auth.userId) {
        return errAsync(messages.users.cannotToggleOwnSuperAdmin)
      }
      return updateSuperAdminStatus(data.userId, data.isSuperAdmin)
    })

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error }),
    )
  })

/**
 * Change password for a user.
 * TanStack Start port of features/users/actions.ts#changeUserPassword.
 */
export const changeUserPasswordFn = createServerFn()
  .inputValidator((input: ChangePasswordFormData) =>
    changePasswordSchema.parse(input),
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => {
      const isSelf = data.userId === auth.userId

      if (isSelf) {
        return updateAuthPassword(data.userId, data.newPassword)
      }

      if (!hasPermission('system.users', auth.permissions)) {
        return errAsync(messages.users.changePasswordFailed)
      }

      return canChangePasswordFor(auth, data.userId).andThen(() =>
        updateAuthPassword(data.userId, data.newPassword),
      )
    })

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error }),
    )
  })

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

type RawUserRow = {
  id: string
  email: string
  full_name: string | null
  role: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
  tenants: { id: string; name: string } | null
  user_roles:
    | {
        role_id: string
        tenant_roles: { id: string; name: string } | null
      }[]
    | null
}

function transformUserRow(row: RawUserRow): UserWithRole {
  const userRole = row.user_roles?.[0]
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_super_admin: row.is_super_admin,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tenant_role: userRole?.tenant_roles ?? null,
    tenant: row.tenants ?? null,
  }
}

// ---------------------------------------------------------------------------
// Hierarchy helpers
// ---------------------------------------------------------------------------

function getRoleRank(user: {
  is_super_admin: boolean
  role: string | null
}): number {
  if (user.is_super_admin) return 3
  if (user.role === 'owner' || user.role === 'admin') return 2
  return 1
}

function canChangePasswordFor(auth: AuthContext, targetUserId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('users')
      .select('is_super_admin, role')
      .eq('id', targetUserId)
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ is_super_admin: boolean; role: string | null }>())
    .andThen((target) => {
      const myRank = getRoleRank({
        is_super_admin: auth.isSuperAdmin,
        role: auth.roleName,
      })
      const targetRank = getRoleRank(target)
      if (myRank <= targetRank) {
        return errAsync(messages.users.cannotChangeHigherRankPassword)
      }
      return okAsync(undefined)
    })
}

// ---------------------------------------------------------------------------
// DB helpers (feature-local) — use service client for admin operations
// ---------------------------------------------------------------------------

function updateSuperAdminStatus(userId: string, isSuperAdmin: boolean) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
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
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
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

function updateUserFields(
  auth: AuthContext,
  parsed: { userId: string; fullName?: string; roleId?: string },
) {
  const tasks: ResultAsync<void, string>[] = []

  if (parsed.fullName !== undefined) {
    tasks.push(
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (createServiceClient() as any)
          .from('users')
          .update({ full_name: parsed.fullName })
          .eq('id', parsed.userId)
          .then(checkSupabaseError),
        dbError,
      ),
    )
  }

  if (parsed.roleId !== undefined) {
    tasks.push(
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      ),
    )
  }

  if (tasks.length === 0) {
    return okAsync(undefined)
  }

  return ResultAsync.combine(tasks).map(() => undefined)
}

function validateDeleteTarget(auth: AuthContext, userId: string) {
  if (userId === auth.userId) {
    return errAsync(messages.users.cannotDeleteSelf)
  }

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function removeUserRoles(auth: AuthContext, userId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', auth.tenantId)
      .then(checkSupabaseError),
    dbError,
  )
}

function removeUserRow(_auth: AuthContext, userId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('users')
      .delete()
      .eq('id', userId)
      .then(checkSupabaseError),
    dbError,
  )
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
    createServiceClient().auth.admin.updateUserById(userId, {
      password: newPassword,
    }),
    dbError,
  ).andThen((res) => {
    if (res.error) return errAsync(res.error.message)
    return okAsync(undefined)
  })
}

function checkSupabaseError(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}
