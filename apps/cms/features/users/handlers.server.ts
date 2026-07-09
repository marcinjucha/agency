import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import { fromSupabase } from '@/lib/result-helpers'
import type { CreateUserInput, UpdateUserInput } from './types'
import { clientAccessToRole, nextRoleOnUpdate } from './utils/role-mapping'
import type { ClientAccess } from './utils/role-mapping'
import { messages } from '@/lib/messages'
import { createServiceClient } from '@/lib/supabase/service'
import { hasPermission } from '@/lib/permissions'
import {
  type AuthContextFull as AuthContext,
  isUnscopedActor,
  requireAuthContextFull as requireAuthContext,
} from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// User-management MUTATION handlers (pure — no createServerFn wrapper).
//
// WHY split from server.ts (iter-3c security fix loop): user creation/update/
// deletion are UNSCOPED/admin operations that write the coarse `users.role` the
// venture RLS + getAuthFull key off. Since iter-3c, clientAccess='all' →
// users.role='admin' → ALL_PERMISSION_KEYS, so a scoped member holding a custom
// tenant_role that includes 'system.users' could self-promote or mint an admin.
// The gates below (unscoped-actor + tenant-scope + role-rank) MUST be unit-
// testable WITHOUT driving the createServerFn RPC pipeline — same split as the
// venture handlers (assignment-handlers.server.ts). The thin createServerFn
// wrappers live in server.ts; these genuinely-server-only handlers live here
// (`.server.ts` = import-protection boundary, never imported by client code).
//
// Gating model (defense-in-depth over migration 20260709120000 RLS):
//   requireAuthContextFull() → hasPermission('system.users')
//   → isUnscopedActor(auth)  (owner/admin/super_admin — SEC-1)
//   → target user in caller tenant (super_admin exempt — SEC-2)
//   → caller rank > target rank on a role change (SEC-3)
//   → write.
// ---------------------------------------------------------------------------

const dbError = (e: unknown): string =>
  e instanceof Error ? e.message : messages.common.unknownError

/** Plain result contract returned to the createServerFn wrappers + tests. */
export type MutationResult<T> = { success: boolean; data?: T; error?: string }
export type VoidResult = { success: boolean; error?: string }

const toMutation = <T>(r: ResultAsync<T, string>): Promise<MutationResult<T>> =>
  r.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error }),
  )

const toVoid = (r: ResultAsync<unknown, string>): Promise<VoidResult> =>
  r.match(
    () => ({ success: true as const }),
    (error) => ({ success: false as const, error }),
  )

// ---------------------------------------------------------------------------
// Handlers (public API for the createServerFn wrappers) — return the plain
// { success, ... } contract so they are unit-testable without the RPC pipeline.
// ---------------------------------------------------------------------------

export function createUserHandler(
  data: CreateUserInput,
): Promise<MutationResult<{ userId: string }>> {
  return toMutation(createUserInner(data))
}

function createUserInner(
  data: CreateUserInput,
): ResultAsync<{ userId: string }, string> {
  return requireAuthContext().andThen((auth) => {
    if (!hasPermission('system.users', auth.permissions)) {
      return errAsync<{ userId: string }, string>(messages.users.createFailed)
    }
    // SEC-1: user management is an UNSCOPED operation. A scoped member holding a
    // custom role with 'system.users' must NOT be able to mint a controlled
    // admin (clientAccess='all' → users.role='admin' → ALL_PERMISSION_KEYS).
    if (!isUnscopedActor(auth)) {
      return errAsync<{ userId: string }, string>(messages.common.noPermission)
    }
    const targetTenantId =
      data.tenantId && auth.isSuperAdmin ? data.tenantId : auth.tenantId
    // Coarse users.role tier the venture RLS + getAuthFull key off. CMS create
    // never mints an 'owner' — only 'admin' (unscoped) or 'member'.
    const role = clientAccessToRole(data.clientAccess ?? 'selected')
    return createAuthUser(data.email, data.password)
      .andThen((authUser) =>
        insertUserRow(targetTenantId, authUser.id, data.email, data.fullName, role),
      )
      .andThen((userId) => assignRole(targetTenantId, userId, data.roleId))
  })
}

export function updateUserHandler(data: UpdateUserInput): Promise<VoidResult> {
  return toVoid(updateUserInner(data))
}

function updateUserInner(data: UpdateUserInput): ResultAsync<void, string> {
  return requireAuthContext().andThen((auth) => {
    if (!hasPermission('system.users', auth.permissions)) {
      return errAsync<void, string>(messages.users.updateFailed)
    }
    // SEC-1: only unscoped actors may write user records. Without this a scoped
    // member with 'system.users' could self-promote (updateUser(self,'all')).
    if (!isUnscopedActor(auth)) {
      return errAsync<void, string>(messages.common.noPermission)
    }
    return updateUserFields(auth, data)
  })
}

export function deleteUserHandler(userId: string): Promise<VoidResult> {
  return toVoid(deleteUserInner(userId))
}

function deleteUserInner(userId: string): ResultAsync<void, string> {
  return requireAuthContext().andThen((auth) => {
    if (!hasPermission('system.users', auth.permissions)) {
      return errAsync<void, string>(messages.users.deleteFailed)
    }
    // SEC-1: deletion is an unscoped/admin operation, same class as create/update.
    if (!isUnscopedActor(auth)) {
      return errAsync<void, string>(messages.common.noPermission)
    }
    return validateDeleteTarget(auth, userId)
      .andThen(() => removeUserRoles(auth, userId))
      .andThen(() => removeUserRow(userId))
      .andThen(() => removeAuthUser(userId))
  })
}

export function toggleSuperAdminHandler(
  userId: string,
  isSuperAdmin: boolean,
): Promise<VoidResult> {
  return toVoid(toggleSuperAdminInner(userId, isSuperAdmin))
}

function toggleSuperAdminInner(
  userId: string,
  isSuperAdmin: boolean,
): ResultAsync<void, string> {
  return requireAuthContext().andThen((auth) => {
    if (!auth.isSuperAdmin) {
      return errAsync<void, string>(messages.users.onlySuperAdminCanToggle)
    }
    if (userId === auth.userId) {
      return errAsync<void, string>(messages.users.cannotToggleOwnSuperAdmin)
    }
    return updateSuperAdminStatus(userId, isSuperAdmin)
  })
}

export function changeUserPasswordHandler(
  userId: string,
  newPassword: string,
): Promise<VoidResult> {
  return toVoid(changeUserPasswordInner(userId, newPassword))
}

function changeUserPasswordInner(
  userId: string,
  newPassword: string,
): ResultAsync<void, string> {
  return requireAuthContext().andThen((auth) => {
    const isSelf = userId === auth.userId
    if (isSelf) {
      return updateAuthPassword(userId, newPassword)
    }
    if (!hasPermission('system.users', auth.permissions)) {
      return errAsync<void, string>(messages.users.changePasswordFailed)
    }
    return canChangePasswordFor(auth, userId).andThen(() =>
      updateAuthPassword(userId, newPassword),
    )
  })
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

/** Fetch the fields needed to gate a mutation on the target user (SEC-2/3, LOW-1). */
function fetchTargetUser(
  userId: string,
): ResultAsync<{ is_super_admin: boolean; role: string | null; tenant_id: string }, string> {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('users')
      .select('is_super_admin, role, tenant_id')
      .eq('id', userId)
      .single(),
    dbError,
  ).andThen(
    fromSupabase<{ is_super_admin: boolean; role: string | null; tenant_id: string }>(),
  )
}

/**
 * SEC-2 tenant guard: reject a target user outside the caller's tenant BEFORE any
 * service-client write. super_admin legitimately operates cross-tenant (mirrors
 * createUser's targetTenantId fallback) → skip the restriction for them.
 */
function assertSameTenant(
  auth: AuthContext,
  target: { tenant_id: string },
): boolean {
  return auth.isSuperAdmin || target.tenant_id === auth.tenantId
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

function updateSuperAdminStatus(
  userId: string,
  isSuperAdmin: boolean,
): ResultAsync<void, string> {
  return ResultAsync.fromPromise<void, string>(
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
  role: 'admin' | 'member',
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
        // Derived from the client-access toggle (was hardcoded 'member' — the gap
        // that left CMS-made admins scoped and seeing zero venture clients).
        role,
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

/**
 * Apply a user-update. Fetches the target user ONCE up front, then gates:
 *   SEC-2 — target must be in the caller's tenant (super_admin exempt),
 *   SEC-3 — on a role change (clientAccess sent), the caller's rank must strictly
 *           exceed the target's current rank (same getRoleRank as the password
 *           path — an admin cannot demote a peer admin / an owner),
 * before issuing any service-client write. The single fetch also powers LOW-1
 * (skip the users.role write for a super_admin target).
 */
function updateUserFields(
  auth: AuthContext,
  parsed: {
    userId: string
    fullName?: string
    roleId?: string
    clientAccess?: ClientAccess
  },
): ResultAsync<void, string> {
  return fetchTargetUser(parsed.userId).andThen((target) => {
    // SEC-2: no cross-tenant mutation (service client bypasses RLS — this is the
    // only backstop). super_admin may operate cross-tenant.
    if (!assertSameTenant(auth, target)) {
      return errAsync<void, string>(messages.common.noPermission)
    }

    // Coarse users.role that this save would write (null = no write): skipped for
    // a super_admin target (LOW-1) and for an 'owner' (nextRoleOnUpdate → null,
    // preserved). Computed ONCE here and reused for the write below so
    // nextRoleOnUpdate is never called twice.
    const nextRole = target.is_super_admin
      ? null
      : parsed.clientAccess !== undefined
        ? nextRoleOnUpdate(target.role, parsed.clientAccess)
        : null

    // SEC-3: role-rank guard, applied ONLY on an ACTUAL role transition —
    // nextRole is non-null AND differs from the target's current role. Gating on a
    // real transition (not merely "clientAccess was sent") is deliberate: the
    // EditUserDialog ALWAYS merges clientAccess into the payload, and an admin
    // target derives clientAccess='all' → nextRole='admin' IDENTICAL to current.
    // Checking only `!== null` would treat that no-op as a change and block an
    // equal-rank admin/owner from even renaming a peer admin. Once SEC-1 gates on
    // isUnscopedActor, only admin/owner/super_admin reach here; this still blocks
    // admin↔admin (equal-rank) DEMOTION — an admin cannot flip a peer admin to
    // member (nextRole='member' differs from 'admin' → real transition).
    const roleWouldChange = nextRole !== null && nextRole !== target.role
    if (roleWouldChange) {
      const myRank = getRoleRank({
        is_super_admin: auth.isSuperAdmin,
        role: auth.roleName,
      })
      const targetRank = getRoleRank(target)
      if (myRank <= targetRank) {
        return errAsync<void, string>(messages.users.cannotChangeHigherRankRole)
      }
    }

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

    // Client-access toggle → coarse users.role (ALONGSIDE the tenant_role upsert
    // above). This is the signal venture RLS + getAuthFull actually gate on. Reuses
    // the nextRole computed above (super_admin/owner already folded into null).
    if (parsed.clientAccess !== undefined) {
      tasks.push(writeUserRole(parsed.userId, nextRole))
    }

    if (tasks.length === 0) {
      return okAsync<void, string>(undefined)
    }

    return ResultAsync.combine(tasks).map(() => undefined)
  })
}

/**
 * Write the coarse users.role decided by updateUserFields. `nextRole` is already
 * resolved by the caller (super_admin → null via LOW-1; 'owner' → null via
 * nextRoleOnUpdate → preserved; otherwise 'admin' | 'member'). A null nextRole
 * means "do not write" — this is the single gate for both the super_admin skip
 * and owner-preservation, so nextRoleOnUpdate is evaluated exactly once per save.
 */
function writeUserRole(
  userId: string,
  nextRole: 'admin' | 'member' | null,
): ResultAsync<void, string> {
  if (nextRole === null) {
    return okAsync<void, string>(undefined)
  }
  return ResultAsync.fromPromise<void, string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('users')
      .update({ role: nextRole })
      .eq('id', userId)
      .then(checkSupabaseError),
    dbError,
  )
}

/**
 * Validate a delete target: not self, not a super_admin, and (SEC-2) in the
 * caller's tenant (super_admin exempt). One fetch covers is_super_admin + tenant.
 */
function validateDeleteTarget(auth: AuthContext, userId: string) {
  if (userId === auth.userId) {
    return errAsync<void, string>(messages.users.cannotDeleteSelf)
  }

  return fetchTargetUser(userId).andThen((target) => {
    if (!assertSameTenant(auth, target)) {
      return errAsync<void, string>(messages.common.noPermission)
    }
    if (target.is_super_admin) {
      return errAsync<void, string>(messages.users.cannotDeleteSuperAdmin)
    }
    return okAsync<void, string>(undefined)
  })
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

function removeUserRow(userId: string) {
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
