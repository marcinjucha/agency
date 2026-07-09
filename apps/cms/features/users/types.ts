/**
 * User management types.
 *
 * UserWithRole joins users → user_roles → tenant_roles to show
 * each user's assigned role in the current tenant.
 */

import type { ClientAccess } from '@/features/venture/utils/client-access'

export type UserWithRole = {
  id: string
  email: string
  full_name: string | null
  role: string | null // legacy role column (owner/admin/member)
  is_super_admin: boolean
  created_at: string
  updated_at: string
  tenant_role: {
    id: string
    name: string
  } | null
  tenant: {
    id: string
    name: string
  } | null
}

export type TenantRole = {
  id: string
  name: string
  description: string | null
  is_default: boolean
}

export type CreateUserInput = {
  email: string
  password: string
  fullName: string
  roleId: string
  /** Super admin only — create user in a specific tenant instead of own. */
  tenantId?: string
  /** Client-access tier → users.role. Defaults to 'selected' (least privilege). */
  clientAccess?: ClientAccess
}

export type UpdateUserInput = {
  userId: string
  fullName?: string
  roleId?: string
  /** Client-access tier → users.role ('all'→admin, 'selected'→member; owner preserved). */
  clientAccess?: ClientAccess
}
