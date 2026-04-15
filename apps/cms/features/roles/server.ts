import { createServerFn } from '@tanstack/react-start'
import { ok, err, errAsync, okAsync, ResultAsync } from 'neverthrow'
import { fromSupabase } from '@/lib/result-helpers'
import { createRoleSchema, updateRoleSchema } from './validation'
import type { CreateRoleInput, UpdateRoleInput, TenantRoleWithPermissions } from './types'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'
import {
  hasPermission,
  validatePermissionKeys,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from '@/lib/permissions'

// ---------------------------------------------------------------------------
// Auth helper — extended for roles (needs permissions + isSuperAdmin)
// ---------------------------------------------------------------------------

type StartClient = ReturnType<typeof createStartClient>

type AuthContext = {
  supabase: StartClient
  userId: string
  tenantId: string
  isSuperAdmin: boolean
  permissions: PermissionKey[]
}

const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])

async function getAuth(): Promise<AuthContext | null> {
  const supabase = createStartClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id, is_super_admin, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return null

  const isSuperAdmin = userData.is_super_admin === true
  const roleName = (userData.role as string) ?? null

  let permissions: PermissionKey[]
  if (isSuperAdmin || FULL_ACCESS_ROLES.has(roleName ?? '')) {
    permissions = [...ALL_PERMISSION_KEYS] as PermissionKey[]
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: roleData } = await (supabase as any)
      .from('user_roles')
      .select('tenant_roles(role_permissions(permission_key))')
      .eq('user_id', user.id)
      .eq('tenant_id', userData.tenant_id)
      .maybeSingle()

    const rawKeys: string[] =
      roleData?.tenant_roles?.role_permissions?.map(
        (rp: { permission_key: string }) => rp.permission_key,
      ) ?? []
    permissions = validatePermissionKeys(rawKeys)
  }

  return {
    supabase,
    userId: user.id,
    tenantId: userData.tenant_id as string,
    isSuperAdmin,
    permissions,
  }
}

function requireAuthContext(): ResultAsync<AuthContext, string> {
  return ResultAsync.fromPromise(getAuth(), String).andThen((auth) =>
    auth ? ok(auth) : err('Not authenticated'),
  )
}

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
export const getRolesFn = createServerFn()
  .inputValidator((input: { tenantId?: string }) => input)
  .handler(async ({ data }): Promise<TenantRoleWithPermissions[]> => {
    const supabase = createStartClient()

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
export const createRoleFn = createServerFn()
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
export const updateRoleFn = createServerFn()
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
export const deleteRoleFn = createServerFn()
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
