import { Sidebar } from '@/components/admin/Sidebar'
import { messages } from '@/lib/messages'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { PermissionsProvider } from '@/contexts/permissions-context'
import { ALL_PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions'
import { fetchTenantFeatures, fetchAllTenants } from '@/features/tenants/queries.server'
import type { Tenant } from '@/features/tenants/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authResult = await getUserWithTenant()

  // Fallback: if auth fails, provide full permissions (middleware handles redirect).
  // This avoids blocking the layout — middleware already guards unauthenticated users.
  const isError = isAuthError(authResult)
  const permissions = isError ? [...ALL_PERMISSION_KEYS] : authResult.permissions
  const isSuperAdmin = isError ? false : authResult.isSuperAdmin
  const roleName = isError ? null : authResult.roleName
  const userId = isError ? null : authResult.userId
  const tenantId = isError ? null : authResult.tenantId
  const tenantName = isError ? null : authResult.tenantName

  // Fetch tenant's enabled features + all tenants for super admin Scope Bar
  const { enabledFeatures, tenants } = await fetchLayoutData(
    tenantId,
    isSuperAdmin,
  )

  return (
    <PermissionsProvider
      userId={userId}
      permissions={permissions}
      isSuperAdmin={isSuperAdmin}
      roleName={roleName}
      tenantId={tenantId}
      tenantName={tenantName}
      enabledFeatures={enabledFeatures}
      tenants={tenants}
    >
      <div className="flex h-screen overflow-hidden">
        {/* Skip to main content link - visible on focus for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
        >
          {messages.nav.skipToContent}
        </a>
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </PermissionsProvider>
  )
}

// ---------------------------------------------------------------------------
// Data fetching for layout
// ---------------------------------------------------------------------------

async function fetchLayoutData(
  tenantId: string | null,
  isSuperAdmin: boolean,
): Promise<{ enabledFeatures: PermissionKey[]; tenants: Tenant[] }> {
  let enabledFeatures: PermissionKey[] = []
  let tenants: Tenant[] = []

  try {
    if (tenantId) {
      enabledFeatures = await fetchTenantFeatures(tenantId)
    }

    if (isSuperAdmin) {
      tenants = await fetchAllTenants()
    }
  } catch {
    // Non-blocking: layout renders even if tenant fetch fails
  }

  return { enabledFeatures, tenants }
}
