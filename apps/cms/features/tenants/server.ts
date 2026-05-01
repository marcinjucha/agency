import { createServerFn } from '@tanstack/react-start'
import { ok, err, errAsync, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { tenantSchema } from './validation'
import type { TenantFormData, Tenant } from './types'
import { messages } from '@/lib/messages'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_MEMBER_PERMISSIONS,
  expandPermissionKeys,
  type PermissionKey,
} from '@/lib/permissions'
import {
  type AuthContextFull as AuthContext,
  requireAuthContextFull as requireAuthContext,
} from '@/lib/server-auth.server'

function requireSuperAdmin(): ResultAsync<AuthContext, string> {
  return requireAuthContext().andThen((auth) =>
    auth.isSuperAdmin ? ok(auth) : err(messages.tenants.superAdminRequired)
  )
}

// ---------------------------------------------------------------------------
// Server Functions — Read (public API)
// ---------------------------------------------------------------------------

/**
 * Fetch all tenants. Super admin sees all; regular users see only own tenant.
 * TanStack Start port of features/tenants/queries.ts#getTenants.
 */
export const getTenantsFn = createServerFn({ method: 'POST' }).handler(async (): Promise<Tenant[]> => {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tenants')
    .select('id, name, email, domain, subscription_status, enabled_features, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Tenant[]
})

/**
 * Fetch a single tenant by ID.
 * TanStack Start port of features/tenants/queries.ts#getTenant.
 */
export const getTenantFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<Tenant> => {
    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenant, error } = await (supabase as any)
      .from('tenants')
      .select(
        'id, name, email, domain, subscription_status, enabled_features, created_at, updated_at'
      )
      .eq('id', data.id)
      .single()

    if (error) throw new Error(error.message)
    return tenant as Tenant
  })

// ---------------------------------------------------------------------------
// Server Functions — Mutations (public API)
// ---------------------------------------------------------------------------

/**
 * Create a new tenant.
 * TanStack Start port of features/tenants/actions.ts#createTenant.
 */
export const createTenantFn = createServerFn({ method: 'POST' })
  .inputValidator((input: TenantFormData) => tenantSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: Tenant; error?: string }> => {
      const result = await requireSuperAdmin().andThen((auth) =>
        insertTenant(buildTenantPayload(data as TenantFormData)).andThen((tenant) =>
          seedDefaultRoles(tenant.id, data.enabled_features as PermissionKey[]).map(() => tenant)
        )
      )

      return result.match(
        (created) => ({ success: true, data: created }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Update an existing tenant.
 * TanStack Start port of features/tenants/actions.ts#updateTenant.
 */
export const updateTenantFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; data: TenantFormData }) => {
    tenantSchema.parse(input.data)
    return input
  })
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: Tenant; error?: string }> => {
      const result = await requireSuperAdmin().andThen(() =>
        fetchOldEnabledFeatures(data.id).andThen((oldFeatures) =>
          updateTenantRow(data.id, buildTenantPayload(data.data as TenantFormData)).andThen(
            (updated) =>
              syncFeaturePermissions(
                data.id,
                oldFeatures,
                data.data.enabled_features as PermissionKey[]
              ).map(() => updated)
          )
        )
      )

      return result.match(
        (updated) => ({ success: true, data: updated }),
        (error) => ({ success: false, error })
      )
    }
  )

/**
 * Deactivate a tenant (soft delete).
 * TanStack Start port of features/tenants/actions.ts#deactivateTenant.
 */
export const deactivateTenantFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireSuperAdmin().andThen(() => deactivateTenantRow(data.id))

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

/**
 * Hard delete a tenant and ALL related data.
 * TanStack Start port of features/tenants/actions.ts#deleteTenant.
 */
export const deleteTenantFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const result = await requireSuperAdmin().andThen((auth) => {
      if (auth.tenantId === data.id) {
        return errAsync(messages.tenants.cannotDeleteOwnTenant)
      }
      return deleteTenantCascade(data.id)
    })

    return result.match(
      () => ({ success: true }),
      (error) => ({ success: false, error })
    )
  })

// ---------------------------------------------------------------------------
// DB helpers (feature-local) — uses service client (tenants bypass RLS)
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

function insertTenant(payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any).from('tenants').insert(payload).select().single(),
    dbError
  ).andThen(fromSupabase<Tenant>())
}

function updateTenantRow(id: string, payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any).from('tenants').update(payload).eq('id', id).select().single(),
    dbError
  ).andThen(fromSupabase<Tenant>())
}

function deactivateTenantRow(id: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('tenants')
      .update({ subscription_status: 'cancelled' })
      .eq('id', id)
      .select()
      .single(),
    dbError
  ).andThen(fromSupabase<Tenant>())
}

function fetchOldEnabledFeatures(tenantId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('tenants')
      .select('enabled_features')
      .eq('id', tenantId)
      .single(),
    dbError
  )
    .andThen(fromSupabase<{ enabled_features: PermissionKey[] }>())
    .map((row) => (row.enabled_features ?? []) as PermissionKey[])
}

function seedDefaultRoles(tenantId: string, enabledFeatures: PermissionKey[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  function isPermissionEnabled(key: PermissionKey): boolean {
    return enabledFeatures.some(
      (f) => key === f || key.startsWith(f + '.') || f.startsWith(key + '.')
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
    dbError
  )
    .andThen(fromSupabase<Array<{ id: string; name: string }>>())
    .andThen((roles) => {
      const adminRole = roles.find((r) => r.name === 'Admin')
      const memberRole = roles.find((r) => r.name === 'Member')

      if (!adminRole || !memberRole) {
        return errAsync('Failed to find created roles')
      }

      const adminPermissions = ALL_PERMISSION_KEYS.filter(isPermissionEnabled).map((key) => ({
        role_id: adminRole.id,
        permission_key: key,
      }))

      const memberPermissions = DEFAULT_MEMBER_PERMISSIONS.filter(isPermissionEnabled).map(
        (key) => ({
          role_id: memberRole.id,
          permission_key: key,
        })
      )

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
        dbError
      )
    })
}

function deleteTenantCascade(tenantId: string) {
  return ResultAsync.fromPromise(
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = createServiceClient() as any

      // 1. Get auth user IDs before cascade deletes public.users
      const { data: users, error: usersError } = await service
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)

      if (usersError) throw new Error(usersError.message)
      const userIds: string[] = (users ?? []).map((u: { id: string }) => u.id)

      // 2. Delete tenant row — DB CASCADE removes all related public tables
      const { error: deleteError } = await service.from('tenants').delete().eq('id', tenantId)

      if (deleteError) throw new Error(deleteError.message)

      // 3. Clean up auth.users (not covered by DB cascade)
      for (const userId of userIds) {
        await createServiceClient().auth.admin.deleteUser(userId)
      }
    })(),
    dbError
  )
}

function syncFeaturePermissions(
  tenantId: string,
  oldFeatures: PermissionKey[],
  newFeatures: PermissionKey[]
) {
  const oldExpanded = expandPermissionKeys(oldFeatures)
  const newExpanded = expandPermissionKeys(newFeatures)

  const added = newExpanded.filter((k) => !oldExpanded.includes(k))
  const removed = oldExpanded.filter((k) => !newExpanded.includes(k))

  if (added.length === 0 && removed.length === 0) {
    return ResultAsync.fromSafePromise(Promise.resolve(undefined))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  let chain = ResultAsync.fromSafePromise<undefined, string>(Promise.resolve(undefined))

  if (removed.length > 0) {
    chain = chain.andThen(() => removePermissionsFromTenantRoles(service, tenantId, removed))
  }

  if (added.length > 0) {
    chain = chain.andThen(() => addPermissionsToAdminRole(service, tenantId, added))
  }

  return chain
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function removePermissionsFromTenantRoles(service: any, tenantId: string, keys: PermissionKey[]) {
  return ResultAsync.fromPromise(
    (async () => {
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
    dbError
  ).map(() => undefined)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addPermissionsToAdminRole(service: any, tenantId: string, keys: PermissionKey[]) {
  return ResultAsync.fromPromise(
    (async () => {
      const { data: adminRoles, error: roleErr } = await service
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', 'Admin')
        .eq('is_default', false)
        .limit(1)

      if (roleErr) throw new Error(roleErr.message)
      if (!adminRoles || adminRoles.length === 0) return

      const adminRoleId = adminRoles[0].id

      const rows = keys.map((key) => ({
        role_id: adminRoleId,
        permission_key: key,
      }))

      const { error: insertErr } = await service
        .from('role_permissions')
        .upsert(rows, { onConflict: 'role_id,permission_key', ignoreDuplicates: true })

      if (insertErr) throw new Error(insertErr.message)
    })(),
    dbError
  ).map(() => undefined)
}

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

function buildTenantPayload(parsed: TenantFormData) {
  return {
    name: parsed.name,
    email: parsed.email,
    domain: parsed.domain ?? null,
    subscription_status: parsed.subscription_status,
    enabled_features: parsed.enabled_features,
  }
}
