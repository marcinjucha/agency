

import { useNavigate, useSearch, useLocation } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { usePermissions } from '@/contexts/permissions-context'

/**
 * Hook for URL-based tenant scoping on management pages.
 *
 * Reads `?tenant=<uuid>` from URL params — defaults to the current user's
 * own tenant when the param is absent. Only meaningful for super admins;
 * regular users always see their own tenant data.
 *
 * Returns the selected tenant ID, whether the user is viewing another
 * tenant, and helpers to change or reset the scope.
 */
export function useTenantScope() {
  const { isSuperAdmin, tenantId: ownTenantId, tenants } = usePermissions()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, string | undefined>
  const { pathname } = useLocation()

  const urlTenantId = search.tenant ?? null

  const selectedTenantId = useMemo(() => {
    if (!isSuperAdmin) return ownTenantId
    return urlTenantId ?? ownTenantId
  }, [isSuperAdmin, urlTenantId, ownTenantId])

  const isOtherTenant = useMemo(
    () => isSuperAdmin && !!selectedTenantId && selectedTenantId !== ownTenantId,
    [isSuperAdmin, selectedTenantId, ownTenantId],
  )

  const selectedTenantName = useMemo(() => {
    if (!selectedTenantId) return null
    return tenants.find((t) => t.id === selectedTenantId)?.name ?? null
  }, [tenants, selectedTenantId])

  const setTenantScope = useCallback(
    (tenantId: string) => {
      const newSearch = { ...search }
      if (tenantId === ownTenantId) {
        delete newSearch.tenant
      } else {
        newSearch.tenant = tenantId
      }
      navigate({ to: pathname, search: newSearch })
    },
    [search, pathname, navigate, ownTenantId],
  )

  const resetToOwn = useCallback(() => {
    const newSearch = { ...search }
    delete newSearch.tenant
    navigate({ to: pathname, search: newSearch })
  }, [search, pathname, navigate])

  return {
    /** The tenant ID currently in scope (URL param or own). */
    selectedTenantId,
    /** Display name of the selected tenant (null if not found). */
    selectedTenantName,
    /** True when viewing a different tenant than the user's own. */
    isOtherTenant,
    /** Whether the current user is super admin (controls visibility). */
    isSuperAdmin,
    /** All tenants available to select from (empty for non-super-admins). */
    tenants,
    /** Set scope to a specific tenant ID (updates URL). */
    setTenantScope,
    /** Reset scope back to the user's own tenant (removes URL param). */
    resetToOwn,
  }
}
