import { createServerFn } from '@tanstack/react-start'
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './validation'
import type { CreateUserInput, UpdateUserInput } from './types'
import type { ChangePasswordFormData } from './validation'
import type { UserWithRole } from './types'
import { createServerClient } from '@/lib/supabase/server-start.server'
import {
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  toggleSuperAdminHandler,
  changeUserPasswordHandler,
} from './handlers.server'

// ---------------------------------------------------------------------------
// Server Functions (public API) — queries
// ---------------------------------------------------------------------------

/**
 * Fetch all users for a tenant with their assigned role.
 * TanStack Start port of features/users/queries.ts#getUsers.
 */
export const getUsersFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { tenantId?: string }) => input)
  .handler(async ({ data }): Promise<UserWithRole[]> => {
    const supabase = createServerClient()

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
export const getTenantRolesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { tenantId?: string }) => input)
  .handler(async ({ data }): Promise<{ id: string; name: string; description: string | null; is_default: boolean }[]> => {
    const supabase = createServerClient()

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
//
// Thin createServerFn wrappers over the pure, unit-tested handlers in
// handlers.server.ts. Each handler owns auth + the security gates (unscoped
// actor, tenant scope, role rank); the wrappers only validate input and adapt
// the neverthrow Result to the plain { success, ... } contract.
// ---------------------------------------------------------------------------

/**
 * Create a new user in the same tenant as the current user.
 */
export const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateUserInput) => createUserSchema.parse(input))
  .handler(async ({ data }) => createUserHandler(data))

/**
 * Update user's full name and/or role assignment.
 */
export const updateUserFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateUserInput) => updateUserSchema.parse(input))
  .handler(async ({ data }) => updateUserHandler(data))

/**
 * Delete a user completely: user_roles -> users -> auth.users.
 */
export const deleteUserFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => deleteUserHandler(data.userId))

/**
 * Toggle super_admin status on a user.
 */
export const toggleSuperAdminFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string; isSuperAdmin: boolean }) => input)
  .handler(async ({ data }) => toggleSuperAdminHandler(data.userId, data.isSuperAdmin))

/**
 * Change password for a user.
 */
export const changeUserPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ChangePasswordFormData) =>
    changePasswordSchema.parse(input),
  )
  .handler(async ({ data }) => changeUserPasswordHandler(data.userId, data.newPassword))

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
