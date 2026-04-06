'use server'

import { revalidatePath } from 'next/cache'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import { authResult, zodParse, fromSupabase } from '@/lib/result-helpers'
import { type AuthSuccess } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createRoleSchema, updateRoleSchema } from './validation'
import type { CreateRoleInput, UpdateRoleInput } from './types'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'

// --- Server Actions (public API) ---

/**
 * Create a new tenant role with permissions.
 * 1. Insert into tenant_roles
 * 2. Batch insert permissions into role_permissions
 */
export async function createRole(input: CreateRoleInput) {
  const result = await zodParse(createRoleSchema, input)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!hasPermission('system.roles', auth.permissions)) {
        return errAsync(messages.roles.createFailed)
      }
      return insertRole(auth, parsed.name, parsed.description ?? undefined)
        .andThen((roleId) => insertPermissions(auth, roleId, parsed.permissions))
    })

  return result.match(
    (data) => {
      revalidatePath(routes.admin.roles)
      return { success: true as const, data }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Update role name, description, and permissions.
 * Replaces all permissions (delete old + insert new).
 */
export async function updateRole(input: UpdateRoleInput) {
  const result = await zodParse(updateRoleSchema, input)
    .asyncAndThen((parsed) => authResult().map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!hasPermission('system.roles', auth.permissions)) {
        return errAsync(messages.roles.updateFailed)
      }
      return updateRoleFields(auth, parsed.roleId, parsed.name, parsed.description ?? undefined)
        .andThen(() => deletePermissions(auth, parsed.roleId))
        .andThen(() => insertPermissions(auth, parsed.roleId, parsed.permissions))
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.roles)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Delete a role.
 * Guards: cannot delete default roles, cannot delete roles with assigned users (FK RESTRICT).
 */
export async function deleteRole(roleId: string) {
  const result = await authResult()
    .andThen((auth) => {
      if (!hasPermission('system.roles', auth.permissions)) {
        return errAsync(messages.roles.deleteFailed)
      }
      return validateDeleteTarget(auth, roleId)
        .andThen(() => removeRole(auth, roleId))
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.roles)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- DB helpers (feature-local) ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function insertRole(auth: AuthSuccess, name: string, description?: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('tenant_roles')
      .insert({
        tenant_id: auth.tenantId,
        name,
        description: description ?? null,
      })
      .select('id')
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ id: string }>())
    .map((row) => row.id)
}

function updateRoleFields(
  auth: AuthSuccess,
  roleId: string,
  name: string,
  description?: string,
) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('tenant_roles')
      .update({
        name,
        description: description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)
      .eq('tenant_id', auth.tenantId)
      .then(checkSupabaseError),
    dbError,
  )
}

function deletePermissions(auth: AuthSuccess, roleId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId),
    dbError,
  ).map(() => undefined)
}

function insertPermissions(
  auth: AuthSuccess,
  roleId: string,
  permissions: string[],
) {
  const rows = permissions.map((key) => ({
    role_id: roleId,
    permission_key: key,
  }))

  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('role_permissions')
      .insert(rows),
    dbError,
  ).map(() => ({ roleId }))
}

// --- Business logic ---

function validateDeleteTarget(auth: AuthSuccess, roleId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('tenant_roles')
      .select('is_default')
      .eq('id', roleId)
      .eq('tenant_id', auth.tenantId)
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ is_default: boolean }>())
    .andThen((role) =>
      role.is_default
        ? errAsync(messages.roles.cannotDeleteDefault)
        : okAsync(undefined),
    )
}

function removeRole(auth: AuthSuccess, roleId: string) {
  return ResultAsync.fromPromise(
    (auth.supabase as any)
      .from('tenant_roles')
      .delete()
      .eq('id', roleId)
      .eq('tenant_id', auth.tenantId),
    dbError,
  ).mapErr((error) => {
    // FK RESTRICT on user_roles → tenant_roles prevents deletion when users assigned
    if (error.includes('violates foreign key constraint') || error.includes('user_roles')) {
      return messages.roles.cannotDeleteWithUsers
    }
    return error
  })
}

/**
 * For update/delete without .select(), Supabase returns { data: null, error: null } on success.
 * fromSupabase() rejects null data — this helper only checks the error field.
 */
function checkSupabaseError(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}
