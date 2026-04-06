'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { ResultAsync } from 'neverthrow'
import { authResult, zodParse, fromSupabase } from '@/lib/result-helpers'
import { type AuthSuccess } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createUserSchema, updateUserSchema } from './validation'
import type { CreateUserInput, UpdateUserInput } from './types'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'

// --- Admin Supabase client (service_role, bypasses RLS) ---

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials')
  return createClient(url, key)
}

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
        return ResultAsync.fromSafePromise(
          Promise.resolve({ success: false as const, error: messages.users.createFailed })
        )
      }
      return createAuthUser(parsed.email, parsed.password)
        .andThen((authUser) =>
          insertUserRow(auth, authUser.id, parsed.email, parsed.fullName)
        )
        .andThen((userId) => assignRole(auth, userId, parsed.roleId))
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
        return ResultAsync.fromSafePromise(
          Promise.resolve({ success: false as const, error: messages.users.updateFailed })
        )
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
        return ResultAsync.fromSafePromise(
          Promise.resolve({ success: false as const, error: messages.users.deleteFailed })
        )
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

// --- DB helpers (feature-local) ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function createAuthUser(email: string, password: string) {
  return ResultAsync.fromPromise(
    getAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
    dbError,
  ).andThen((res) => {
    if (res.error) return ResultAsync.fromSafePromise(Promise.reject(res.error.message))
    if (!res.data.user) return ResultAsync.fromSafePromise(Promise.reject(messages.users.createFailed))
    return ResultAsync.fromSafePromise(Promise.resolve(res.data.user))
  })
}

function insertUserRow(
  auth: AuthSuccess,
  authUserId: string,
  email: string,
  fullName: string,
) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('users')
      .insert({
        id: authUserId,
        tenant_id: auth.tenantId,
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

function assignRole(auth: AuthSuccess, userId: string, roleId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('user_roles')
      .insert({
        user_id: userId,
        tenant_id: auth.tenantId,
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
        (auth.supabase as any)
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
        (auth.supabase as any)
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
    return ResultAsync.fromSafePromise(Promise.resolve(undefined))
  }

  return ResultAsync.fromPromise(
    Promise.all(tasks.map((t) => t.match(
      () => undefined,
      (err) => { throw new Error(err) },
    ))),
    dbError,
  ).map(() => undefined)
}

function validateDeleteTarget(auth: AuthSuccess, userId: string) {
  if (userId === auth.userId) {
    return ResultAsync.fromSafePromise<never, string>(
      Promise.reject(messages.users.cannotDeleteSelf),
    )
  }

  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('users')
      .select('is_super_admin')
      .eq('id', userId)
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ is_super_admin: boolean }>())
    .andThen((user) =>
      user.is_super_admin
        ? ResultAsync.fromSafePromise<never, string>(
            Promise.reject(messages.users.cannotDeleteSuperAdmin),
          )
        : ResultAsync.fromSafePromise(Promise.resolve(undefined)),
    )
}

function removeUserRoles(auth: AuthSuccess, userId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', auth.tenantId),
    dbError,
  ).map(() => undefined)
}

function removeUserRow(auth: AuthSuccess, userId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('users')
      .delete()
      .eq('id', userId),
    dbError,
  ).map(() => undefined)
}

function removeAuthUser(userId: string) {
  return ResultAsync.fromPromise(
    getAdminClient().auth.admin.deleteUser(userId),
    dbError,
  ).andThen((res) => {
    if (res.error) return ResultAsync.fromSafePromise(Promise.reject(res.error.message))
    return ResultAsync.fromSafePromise(Promise.resolve(undefined))
  })
}

/**
 * For update/upsert without .select(), Supabase returns { data: null, error: null } on success.
 * fromSupabase() rejects null data — this helper only checks the error field.
 */
function checkSupabaseError(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}
