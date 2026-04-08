'use client'

import { Badge, Card, Switch } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { License, LicenseStatus } from '../types'
import { computeLicenseStatus, seatsUsagePercent, seatsBarColor, formatExpiry } from '../utils'

interface LicenseCardProps {
  license: License
  activeSeats: number
  onSelect: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isToggling: boolean
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
// Seats progress bar
// ---------------------------------------------------------------------------

function SeatsBar({ active, max }: { active: number; max: number }) {
  const percent = seatsUsagePercent(active, max)
  const clampedPercent = Math.min(percent, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{messages.docforgeLicenses.seatsUsage}</span>
        <span>
          {active}/{max}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-1 rounded-full transition-all ${seatsBarColor(percent)}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function LicenseCard({ license, activeSeats, onSelect, onToggle, isToggling }: LicenseCardProps) {
  const status = computeLicenseStatus(license)

  return (
    <Card
      className="relative cursor-pointer p-3 transition-transform hover:-translate-y-0.5"
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

      {/* Seats */}
      <div className="mt-3">
        <SeatsBar active={activeSeats} max={license.max_seats} />
      </div>
    </Card>
  )
}

export { StatusBadge, STATUS_STYLES, STATUS_LABELS }
