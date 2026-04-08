'use client'

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Switch,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import type { License } from '../types'
import { computeLicenseStatus, seatsUsagePercent, seatsBarColor, formatExpiry } from '../utils'
import { StatusBadge } from './LicenseCard'

interface LicenseTableProps {
  licenses: License[]
  onSelect: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  togglingId: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL')
}

function SeatsCell({ active, max }: { active: number; max: number }) {
  const percent = seatsUsagePercent(active, max)
  const clampedPercent = Math.min(percent, 100)

  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm">
        {active}/{max}
      </span>
      <div className="h-1 w-16 rounded-full bg-muted">
        <div
          className={`h-1 rounded-full transition-all ${seatsBarColor(percent)}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

interface LicenseRowProps {
  license: License
  onSelect: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isToggling: boolean
}

function LicenseRow({ license, onSelect, onToggle, isToggling }: LicenseRowProps) {
  const status = computeLicenseStatus(license)

  return (
    <TableRow
      className="cursor-pointer transition-colors hover:bg-muted/50"
      role="link"
      tabIndex={0}
      onClick={() => onSelect(license.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(license.id)
        }
      }}
    >
      <TableCell>
        <span className="font-mono text-sm font-medium">{license.key}</span>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm">{license.client_name || messages.docforgeLicenses.noClient}</p>
          {license.email && (
            <p className="text-xs text-muted-foreground">{license.email}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StatusBadge status={status} />
      </TableCell>
      <TableCell>
        {/* activeSeats=0 for now -- detail panel in iter 3 will resolve actual count */}
        <SeatsCell active={0} max={license.max_seats} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatExpiry(license.expires_at)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground hidden lg:table-cell">
        {formatDate(license.created_at)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Switch
          checked={license.is_active}
          onCheckedChange={(checked) => onToggle(license.id, checked)}
          disabled={isToggling}
          aria-label={license.is_active ? messages.docforgeLicenses.statusActive : messages.docforgeLicenses.statusInactive}
        />
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function LicenseTable({ licenses, onSelect, onToggle, togglingId }: LicenseTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>{messages.docforgeLicenses.columnKey}</TableHead>
            <TableHead>{messages.docforgeLicenses.columnClient}</TableHead>
            <TableHead>{messages.docforgeLicenses.columnStatus}</TableHead>
            <TableHead>{messages.docforgeLicenses.columnSeats}</TableHead>
            <TableHead>{messages.docforgeLicenses.columnExpires}</TableHead>
            <TableHead className="hidden lg:table-cell">{messages.docforgeLicenses.createdAt}</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">{messages.docforgeLicenses.columnActions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licenses.map((license) => (
            <LicenseRow
              key={license.id}
              license={license}
              onSelect={onSelect}
              onToggle={onToggle}
              isToggling={togglingId === license.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
