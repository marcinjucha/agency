

import { Badge, Card, Switch } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { License, LicenseStatus } from '../types'
import { computeLicenseStatus, formatExpiry } from '../utils'

interface LicenseCardProps {
  license: License
  onSelect: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isToggling: boolean
  isSelected?: boolean
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<LicenseStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  inactive: 'bg-muted text-muted-foreground border-border',
}

const STATUS_LABELS: Record<LicenseStatus, string> = {
  active: messages.docforgeLicenses.statusActive,
  expired: messages.docforgeLicenses.statusExpired,
  inactive: messages.docforgeLicenses.statusInactive,
}

function StatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function LicenseCard({ license, onSelect, onToggle, isToggling, isSelected }: LicenseCardProps) {
  const status = computeLicenseStatus(license)

  return (
    <Card
      className={`relative cursor-pointer p-3 transition-transform hover:-translate-y-0.5 ${
        isSelected ? 'ring-1 ring-primary border-primary' : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(license.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(license.id)
        }
      }}
      aria-label={`${messages.docforgeLicenses.keyLabel}: ${license.key}`}
    >
      {/* Toggle in top-right */}
      <div className="absolute right-3 top-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Switch
          checked={license.is_active}
          onCheckedChange={(checked) => onToggle(license.id, checked)}
          disabled={isToggling}
          aria-label={license.is_active ? messages.docforgeLicenses.statusActive : messages.docforgeLicenses.statusInactive}
        />
      </div>

      {/* Key */}
      <p className="font-mono text-sm font-medium text-foreground">{license.key}</p>

      {/* Client + email */}
      <p className="mt-1.5 text-sm text-foreground">
        {license.client_name || messages.docforgeLicenses.noClient}
      </p>
      {license.email && (
        <p className="text-xs text-muted-foreground">{license.email}</p>
      )}

      {/* Status + expiry */}
      <div className="mt-3 flex items-center gap-2">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground">{formatExpiry(license.expires_at)}</span>
      </div>

    </Card>
  )
}

export { StatusBadge, STATUS_STYLES, STATUS_LABELS }
