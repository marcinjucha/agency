import type { PermissionKey } from '@/lib/permissions'

/**
 * Role management types.
 *
 * TenantRole extends the basic role from users/types with permissions
 * and user count — used in the full role management view.
 */

export type TenantRoleWithPermissions = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  permissions: PermissionKey[]
  user_count: number
}

export type CreateRoleInput = {
  name: string
  description?: string
  permissions: PermissionKey[]
}

export type UpdateRoleInput = {
  roleId: string
  name: string
  description?: string
  permissions: PermissionKey[]
}
