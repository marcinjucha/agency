import { messages } from '@/lib/messages'
import type { License } from './types'
import type { LicenseStatus } from './types'

// ---------------------------------------------------------------------------
// License key generation
// ---------------------------------------------------------------------------

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Generate a random 4-char uppercase alphanumeric segment. */
function randomSegment(): string {
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return result
}

/** Generate a license key in DF-XXXX-XXXX-XXXX format. */
export function generateLicenseKey(): string {
  return `DF-${randomSegment()}-${randomSegment()}-${randomSegment()}`
}

// ---------------------------------------------------------------------------
// License status computation
// ---------------------------------------------------------------------------

/**
 * Compute display status from license fields.
 * Priority: is_active false -> 'inactive', expired -> 'expired', else -> 'active'.
 */
export function computeLicenseStatus(license: Pick<License, 'is_active' | 'expires_at'>): LicenseStatus {
  if (!license.is_active) return 'inactive'
  if (license.expires_at !== null && new Date(license.expires_at) <= new Date()) return 'expired'
  return 'active'
}

// ---------------------------------------------------------------------------
// Seat usage helpers
// ---------------------------------------------------------------------------

/** Calculate seat usage as a percentage (0-100). */
export function seatsUsagePercent(active: number, max: number): number {
  if (max <= 0) return 100
  return Math.round((active / max) * 100)
}

/** Return a Tailwind text color class based on seat usage percentage. */
export function seatsColorClass(percent: number): string {
  if (percent >= 100) return 'text-red-400'
  if (percent >= 80) return 'text-amber-400'
  return 'text-emerald-400'
}

/** Return a Tailwind background color class for seat usage progress bar. */
export function seatsBarColor(percent: number): string {
  if (percent >= 100) return 'bg-red-400'
  if (percent >= 80) return 'bg-amber-400'
  return 'bg-emerald-400'
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/** Format expiry date or return "Bezterminowa" for null. */
export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return messages.docforgeLicenses.perpetual
  return new Date(expiresAt).toLocaleDateString('pl-PL')
}
