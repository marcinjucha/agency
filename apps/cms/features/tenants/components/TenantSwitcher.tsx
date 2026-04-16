

import { usePermissions } from '@/contexts/permissions-context'
import { messages } from '@/lib/messages'

/**
 * TenantSwitcher — top of sidebar.
 *
 * Static display showing tenant name + role for all users.
 * Super admin sees "Super Admin" as role badge.
 */
export function TenantSwitcher() {
  const { tenantName, roleName, isSuperAdmin } = usePermissions()

  const displayRole = isSuperAdmin
    ? messages.tenants.switcher.superAdminRole
    : (roleName ?? messages.nav.adminPanel)

  return (
    <div className="flex items-center gap-3 px-6 py-5">
      <TenantAvatar name={tenantName} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate" title={tenantName ?? undefined}>
          {tenantName ?? messages.tenants.switcher.fallbackName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {displayRole}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TenantAvatar({ name }: { name: string | null }) {
  const letter = (name ?? 'O').charAt(0).toUpperCase()

  return (
    <div
      className="h-8 w-8 text-sm rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0"
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}
