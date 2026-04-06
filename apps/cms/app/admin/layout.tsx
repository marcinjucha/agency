import { Sidebar } from '@/components/admin/Sidebar'
import { messages } from '@/lib/messages'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { PermissionsProvider } from '@/contexts/permissions-context'
import { ALL_PERMISSION_KEYS } from '@/lib/permissions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authResult = await getUserWithTenant()

  // Fallback: if auth fails, provide full permissions (middleware handles redirect).
  // This avoids blocking the layout — middleware already guards unauthenticated users.
  const permissions = isAuthError(authResult)
    ? [...ALL_PERMISSION_KEYS]
    : authResult.permissions
  const isSuperAdmin = isAuthError(authResult) ? false : authResult.isSuperAdmin
  const roleName = isAuthError(authResult) ? null : authResult.roleName

  return (
    <PermissionsProvider
      permissions={permissions}
      isSuperAdmin={isSuperAdmin}
      roleName={roleName}
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
