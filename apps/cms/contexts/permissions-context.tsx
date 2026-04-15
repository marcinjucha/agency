

import { createContext, useContext, type ReactNode } from 'react'
import { hasPermission as checkPermission, type PermissionKey } from '@/lib/permissions'
import type { Tenant } from '@/features/tenants/types'

type PermissionsContextValue = {
  userId: string | null
  permissions: PermissionKey[]
  isSuperAdmin: boolean
  roleName: string | null
  tenantId: string | null
  tenantName: string | null
  enabledFeatures: PermissionKey[]
  /** All tenants — populated for super admins (used by Scope Bar). */
  tenants: Tenant[]
  hasPermission: (key: PermissionKey) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

type PermissionsProviderProps = {
  userId: string | null
  permissions: PermissionKey[]
  isSuperAdmin: boolean
  roleName: string | null
  tenantId: string | null
  tenantName: string | null
  enabledFeatures: PermissionKey[]
  tenants: Tenant[]
  children: ReactNode
}

export function PermissionsProvider({
  userId,
  permissions,
  isSuperAdmin,
  roleName,
  tenantId,
  tenantName,
  enabledFeatures,
  tenants,
  children,
}: PermissionsProviderProps) {
  const value: PermissionsContextValue = {
    userId,
    permissions,
    isSuperAdmin,
    roleName,
    tenantId,
    tenantName,
    enabledFeatures,
    tenants,
    hasPermission: (key: PermissionKey) => checkPermission(key, permissions),
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}
