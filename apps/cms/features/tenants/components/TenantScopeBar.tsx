

import { messages } from '@/lib/messages'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { useTenantScope } from '../hooks/use-tenant-scope'

/**
 * Per-page tenant scope selector for management pages (Users, Roles).
 *
 * Visible only for super admins. Renders a Select dropdown that filters
 * page data by tenant, storing the selection in the URL (`?tenant=uuid`).
 * When viewing another tenant, shows an amber visual indicator and a
 * "Show mine" reset button.
 */
export function TenantScopeBar() {
  const {
    selectedTenantId,
    selectedTenantName,
    isOtherTenant,
    isSuperAdmin,
    tenants,
    setTenantScope,
    resetToOwn,
  } = useTenantScope()

  // Only super admins with multiple tenants see the scope bar
  if (!isSuperAdmin || tenants.length <= 1) return null

  const selectBorderClass = isOtherTenant ? 'border-amber-500/40' : ''

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <label
          htmlFor="tenant-scope-select"
          className="text-sm font-medium text-muted-foreground whitespace-nowrap"
        >
          {messages.tenants.scopeBar.label}:
        </label>

        <Select
          value={selectedTenantId ?? ''}
          onValueChange={setTenantScope}
        >
          <SelectTrigger
            id="tenant-scope-select"
            className={`w-72 ${selectBorderClass}`}
            aria-label={messages.tenants.scopeBar.ariaLabel}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isOtherTenant && (
          <Button variant="ghost" size="sm" onClick={resetToOwn}>
            {messages.tenants.scopeBar.showMine}
          </Button>
        )}
      </div>

      {isOtherTenant && selectedTenantName && (
        <p className="text-xs text-amber-400 ml-0">
          {messages.tenants.scopeBar.viewingOther} {selectedTenantName}
        </p>
      )}
    </div>
  )
}
