'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { hasPermission as checkPermission, type PermissionKey } from '@/lib/permissions'

type PermissionsContextValue = {
  userId: string | null
  permissions: PermissionKey[]
  isSuperAdmin: boolean
  roleName: string | null
  hasPermission: (key: PermissionKey) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

type PermissionsProviderProps = {
  userId: string | null
  permissions: PermissionKey[]
  isSuperAdmin: boolean
  roleName: string | null
  children: ReactNode
}

export function PermissionsProvider({
  userId,
  permissions,
  isSuperAdmin,
  roleName,
  children,
}: PermissionsProviderProps) {
  const value: PermissionsContextValue = {
    userId,
    permissions,
    isSuperAdmin,
    roleName,
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
