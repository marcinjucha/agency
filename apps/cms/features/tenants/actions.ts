'use server'

import { revalidatePath } from 'next/cache'
import { errAsync } from 'neverthrow'
import { ResultAsync } from 'neverthrow'
import { zodParse, fromSupabase, requireAuthResult } from '@/lib/result-helpers'
import { tenantSchema } from './validation'
import type { TenantFormData, Tenant } from './types'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_MEMBER_PERMISSIONS,
  PERMISSION_GROUPS,
  expandPermissionKeys,
  type PermissionKey,
} from '@/lib/permissions'

// --- Server Actions (public API) ---

/**
 * Create a new tenant.
 * Double authorization: requireAuth('system.tenants') + is_super_admin.
 * Uses service client because RLS on tenants only allows viewing own tenant.
 */
export async function createTenant(data: TenantFormData) {
  const result = await zodParse(tenantSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('system.tenants').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.tenants.superAdminRequired)
      }
      return insertTenant(buildTenantPayload(parsed as TenantFormData))
        .andThen((tenant) =>
          seedDefaultRoles(tenant.id, parsed.enabled_features as PermissionKey[]).map(() => tenant),
        )
    })

  return result.match(
    (created) => {
      revalidatePath(routes.admin.tenants)
      return { success: true as const, data: created }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Update an existing tenant.
 * Double authorization: requireAuth('system.tenants') + is_super_admin.
 */
export async function updateTenant(id: string, data: TenantFormData) {
  const result = await zodParse(tenantSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('system.tenants').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.tenants.superAdminRequired)
      }
      return fetchOldEnabledFeatures(id)
        .andThen((oldFeatures) =>
          updateTenantRow(id, buildTenantPayload(parsed as TenantFormData))
            .andThen((updated) =>
              syncFeaturePermissions(id, oldFeatures, parsed.enabled_features as PermissionKey[])
                .map(() => updated),
            ),
        )
    })

  return result.match(
    (updated) => {
      revalidatePath(routes.admin.tenants)
      revalidatePath(routes.admin.tenant(id))
      revalidatePath(routes.admin.roles)
      return { success: true as const, data: updated }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Deactivate a tenant by setting subscription_status to 'cancelled'.
 * Soft delete — tenant data remains but access is revoked.
 */
export async function deactivateTenant(id: string) {
  const result = await requireAuthResult('system.tenants')
    .andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.tenants.superAdminRequired)
      }
      return deactivateTenantRow(id)
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.tenants)
      revalidatePath(routes.admin.tenant(id))
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Hard delete a tenant and ALL related data.
 * Double authorization: requireAuth('system.tenants') + is_super_admin.
 * Guard: cannot delete your own tenant.
 */
export async function deleteTenant(id: string) {
  const result = await requireAuthResult('system.tenants')
    .andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.tenants.superAdminRequired)
      }
      if (auth.tenantId === id) {
        return errAsync(messages.tenants.cannotDeleteOwnTenant)
      }
      return deleteTenantCascade(id)
    })

  return result.match(
    () => {
      revalidatePath(routes.admin.tenants)
      return { success: true as const }
    },
    (error) => ({ success: false as const, error }),
  )
}

// --- DB helpers (feature-local) ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function insertTenant(payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('tenants')
      .insert(payload)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<Tenant>())
}

function updateTenantRow(id: string, payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('tenants')
      .update(payload)
      .eq('id', id)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<Tenant>())
}

function deactivateTenantRow(id: string) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('tenants')
      .update({ subscription_status: 'cancelled' })
      .eq('id', id)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<Tenant>())
}

/**
 * Seed default Admin + Member roles with permissions for a new tenant.
 * Atomic with tenant creation — if this fails, the whole createTenant fails.
 * Filters permissions to only those matching the tenant's enabled features.
 */
function seedDefaultRoles(tenantId: string, enabledFeatures: PermissionKey[]) {
  const service = createServiceClient() as any

  /** Check if a permission key is enabled via exact or prefix match. */
  function isPermissionEnabled(key: PermissionKey): boolean {
    return enabledFeatures.some(
      (f) => key === f || key.startsWith(f + '.') || f.startsWith(key + '.'),
    )
  }

  return ResultAsync.fromPromise(
    service
      .from('tenant_roles')
      .insert([
        { tenant_id: tenantId, name: 'Admin', is_default: false },
        { tenant_id: tenantId, name: 'Member', is_default: true },
      ])
      .select(),
    dbError,
  )
    .andThen(fromSupabase<Array<{ id: string; name: string }>>())
    .andThen((roles) => {
      const adminRole = roles.find((r) => r.name === 'Admin')
      const memberRole = roles.find((r) => r.name === 'Member')

      if (!adminRole || !memberRole) {
        return errAsync('Failed to find created roles')
      }

      const adminPermissions = ALL_PERMISSION_KEYS
        .filter(isPermissionEnabled)
        .map((key) => ({
          role_id: adminRole.id,
          permission_key: key,
        }))

      const memberPermissions = DEFAULT_MEMBER_PERMISSIONS
        .filter(isPermissionEnabled)
        .map((key) => ({
          role_id: memberRole.id,
          permission_key: key,
        }))

      const allPermissions = [...adminPermissions, ...memberPermissions]
      if (allPermissions.length === 0) {
        return ResultAsync.fromSafePromise(Promise.resolve(undefined))
      }

      return ResultAsync.fromPromise(
        service
          .from('role_permissions')
          .insert(allPermissions)
          .then((res: { error: { message: string } | null }) => {
            if (res.error) throw new Error(res.error.message)
          }),
        dbError,
      )
    })
}

/**
 * Delete tenant + clean up auth.users (DB cascade handles the rest).
 * All public tables have ON DELETE CASCADE on tenants(id), so deleting
 * the tenant row automatically removes users, roles, surveys, etc.
 * Only auth.users needs manual cleanup (separate auth schema).
 */
function deleteTenantCascade(tenantId: string) {
  const service = createServiceClient() as any

  return ResultAsync.fromPromise((async () => {
    // 1. Get auth user IDs before cascade deletes public.users
    const { data: users, error: usersError } = await service
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)

    if (usersError) throw new Error(usersError.message)
    const userIds: string[] = (users ?? []).map((u: { id: string }) => u.id)

    // 2. Delete tenant row — DB CASCADE removes all related public tables
    const { error: deleteError } = await service
      .from('tenants')
      .delete()
      .eq('id', tenantId)

    if (deleteError) throw new Error(deleteError.message)

    // 3. Clean up auth.users (not covered by DB cascade)
    for (const userId of userIds) {
      await createServiceClient().auth.admin.deleteUser(userId)
    }
  })(), dbError)
}

// --- Business logic ---

function buildTenantPayload(parsed: TenantFormData) {
  return {
    name: parsed.name,
    email: parsed.email,
    domain: parsed.domain ?? null,
    subscription_status: parsed.subscription_status,
    enabled_features: parsed.enabled_features,
  }
}

/**
 * Fetch the current enabled_features for a tenant before update.
 * Used to diff old vs new features for permission sync.
 */
function fetchOldEnabledFeatures(tenantId: string) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('tenants')
      .select('enabled_features')
      .eq('id', tenantId)
      .single(),
    dbError,
  )
    .andThen(fromSupabase<{ enabled_features: PermissionKey[] }>())
    .map((row) => (row.enabled_features ?? []) as PermissionKey[])
}

/**
 * Sync role permissions when tenant features change.
 *
 * Compares old vs new PermissionKey[] sets:
 * - Keys ADDED: grant to the Admin role (other roles get permissions manually).
 * - Keys REMOVED: revoke from ALL tenant roles (disabled feature = no access for anyone).
 *
 * Also handles parent key expansion: if 'shop' is added, all 'shop.*' children are granted.
 * If a child like 'content.blog' is removed but parent 'content' remains, only 'content.blog' is revoked.
 */
function syncFeaturePermissions(
  tenantId: string,
  oldFeatures: PermissionKey[],
  newFeatures: PermissionKey[],
) {
  const oldSet = new Set(oldFeatures)
  const newSet = new Set(newFeatures)

  // Expand both sets to include implied children (parent key implies all children)
  const oldExpanded = expandPermissionKeys(oldFeatures)
  const newExpanded = expandPermissionKeys(newFeatures)

  const added = newExpanded.filter((k) => !oldExpanded.includes(k))
  const removed = oldExpanded.filter((k) => !newExpanded.includes(k))

  // Nothing changed — short-circuit
  if (added.length === 0 && removed.length === 0) {
    return ResultAsync.fromSafePromise(Promise.resolve(undefined))
  }

  const service = createServiceClient() as any

  // Chain: remove permissions for disabled features, then add for enabled ones
  let chain = ResultAsync.fromSafePromise<undefined, string>(
    Promise.resolve(undefined),
  )

  if (removed.length > 0) {
    chain = chain.andThen(() => removePermissionsFromTenantRoles(service, tenantId, removed))
  }

  if (added.length > 0) {
    chain = chain.andThen(() => addPermissionsToAdminRole(service, tenantId, added))
  }

  return chain
}

/**
 * Remove specific permission keys from ALL roles belonging to a tenant.
 * Uses a subquery: delete from role_permissions where role_id in (tenant's roles) and key in (keys).
 */
function removePermissionsFromTenantRoles(
  service: any,
  tenantId: string,
  keys: PermissionKey[],
) {
  return ResultAsync.fromPromise(
    (async () => {
      // Get all role IDs for this tenant
      const { data: roles, error: rolesErr } = await service
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)

      if (rolesErr) throw new Error(rolesErr.message)
      if (!roles || roles.length === 0) return

      const roleIds = roles.map((r: { id: string }) => r.id)

      const { error: deleteErr } = await service
        .from('role_permissions')
        .delete()
        .in('role_id', roleIds)
        .in('permission_key', keys)

      if (deleteErr) throw new Error(deleteErr.message)
    })(),
    dbError,
  ).map(() => undefined)
}

/**
 * Add permission keys to the Admin role (non-default, named 'Admin') of a tenant.
 * Uses upsert to avoid duplicate key conflicts if some permissions already exist.
 */
function addPermissionsToAdminRole(
  service: any,
  tenantId: string,
  keys: PermissionKey[],
) {
  return ResultAsync.fromPromise(
    (async () => {
      // Find the Admin role (is_default=false, name='Admin')
      const { data: adminRoles, error: roleErr } = await service
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', 'Admin')
        .eq('is_default', false)
        .limit(1)

      if (roleErr) throw new Error(roleErr.message)
      if (!adminRoles || adminRoles.length === 0) return // No Admin role — skip

      const adminRoleId = adminRoles[0].id

      const rows = keys.map((key) => ({
        role_id: adminRoleId,
        permission_key: key,
      }))

      // Upsert to avoid conflict if some permissions already exist
      const { error: insertErr } = await service
        .from('role_permissions')
        .upsert(rows, { onConflict: 'role_id,permission_key', ignoreDuplicates: true })

      if (insertErr) throw new Error(insertErr.message)
    })(),
    dbError,
  ).map(() => undefined)
}
