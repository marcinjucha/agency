import { createServerFn } from '@tanstack/react-start'
import { ok, err, errAsync, okAsync, ResultAsync } from 'neverthrow'
import { fromSupabase } from '@/lib/result-helpers'
import { createRoleSchema, updateRoleSchema } from './validation'
import type { CreateRoleInput, UpdateRoleInput, TenantRoleWithPermissions } from './types'
import { messages } from '@/lib/messages'
import { hasPermission, validatePermissionKeys, type PermissionKey } from '@/lib/permissions'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { type AuthContextFull as AuthContext, requireAuthContextFull as requireAuthContext } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// DB error mapper
// ---------------------------------------------------------------------------

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

// ---------------------------------------------------------------------------
// Server Functions (public API) — queries
// ---------------------------------------------------------------------------

/**
 * Fetch all tenant roles with their permissions and user count.
 * TanStack Start port of features/roles/queries.ts#getRoles.
 */
export const getRolesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { tenantId?: string }) => input)
  .handler(async ({ data }): Promise<TenantRoleWithPermissions[]> => {
    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('tenant_roles')
      .select(`
        id,
        tenant_id,
        name,
        description,
        is_default,
        created_at,
        updated_at,
        role_permissions (
          permission_key
        ),
        user_roles (
          user_id
        )
      `)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (data.tenantId) {
      query = query.eq('tenant_id', data.tenantId)
    }

    const { data: rows, error } = await query

    if (error) throw error

    return (rows ?? []).map(transformRoleRow)
  })

// ---------------------------------------------------------------------------
// Server Functions (public API) — mutations
// ---------------------------------------------------------------------------

/**
 * Create a new tenant role with permissions.
 * TanStack Start port of features/roles/actions.ts#createRole.
 */
export const createRoleFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateRoleInput) => createRoleSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; data?: { roleId: string }; error?: string }> => {
      const result = await requireAuthContext().andThen((auth) => {
        if (!hasPermission('system.roles', auth.permissions)) {
          return errAsync(messages.roles.createFailed)
        }
        const targetTenantId =
          data.tenantId && auth.isSuperAdmin ? data.tenantId : auth.tenantId
        return insertRole(auth, targetTenantId, data.name, data.description ?? undefined)
          .andThen((roleId) =>
            insertPermissions(auth, roleId, data.permissions as string[]),
          )
      })

      return result.match(
        (d) => ({ success: true, data: d }),
        (error) => ({ success: false, error }),
      )
    },
  )

/**
 * Update role name, description, and permissions.
 * TanStack Start port of features/roles/actions.ts#updateRole.
 */
export const updateRoleFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateRoleInput) => updateRoleSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => {
      if (!hasPermission('system.roles', auth.permissions)) {
        return errAsync(messages.roles.updateFailed)
      }
      return updateRoleFields(
        auth,
        data.roleId,
        data.name,
        data.description ?? undefined,
      )
        .andThen(() => deletePermissions(auth, data.roleId))
        .andThen(() =>
          insertPermissions(auth, data.roleId, data.permissions as string[]),
        )
    })

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error }),
    )
  })

/**
 * Delete a role.
 * TanStack Start port of features/roles/actions.ts#deleteRole.
 */
export const deleteRoleFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { roleId: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireAuthContext().andThen((auth) => {
      if (!hasPermission('system.roles', auth.permissions)) {
        return errAsync(messages.roles.deleteFailed)
      }
      return validateDeleteTarget(auth, data.roleId).andThen(() =>
        removeRole(auth, data.roleId),
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

type RawRoleRow = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  role_permissions: { permission_key: string }[] | null
  user_roles: { user_id: string }[] | null
}

function transformRoleRow(row: RawRoleRow): TenantRoleWithPermissions {
  const rawKeys = (row.role_permissions ?? []).map((rp) => rp.permission_key)

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    description: row.description,
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
    permissions: validatePermissionKeys(rawKeys),
    user_count: (row.user_roles ?? []).length,
  }
}

// ---------------------------------------------------------------------------
// DB helpers (feature-local)
// ---------------------------------------------------------------------------

function insertRole(
  auth: AuthContext,
  tenantId: string,
  name: string,
  description?: string,
) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('tenant_roles')
      .insert({
        tenant_id: tenantId,
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
  auth: AuthContext,
  roleId: string,
  name: string,
  description?: string,
) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function deletePermissions(auth: AuthContext, roleId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .then(checkSupabaseError),
    dbError,
  ).map(() => undefined)
}

function insertPermissions(
  auth: AuthContext,
  roleId: string,
  permissions: string[],
) {
  const rows = permissions.map((key) => ({
    role_id: roleId,
    permission_key: key,
  }))

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any).from('role_permissions').insert(rows),
    dbError,
  ).map(() => ({ roleId }))
}

function validateDeleteTarget(auth: AuthContext, roleId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function removeRole(auth: AuthContext, roleId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.supabase as any)
      .from('tenant_roles')
      .delete()
      .eq('id', roleId)
      .eq('tenant_id', auth.tenantId),
    dbError,
  ).mapErr((error) => {
    if (
      error.includes('violates foreign key constraint') ||
      error.includes('user_roles')
    ) {
      return messages.roles.cannotDeleteWithUsers
    }
    return error
  })
}

function checkSupabaseError(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}
