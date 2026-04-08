/**
 * DocForge License Management types.
 *
 * Super admin only — no tenant_id on these tables.
 * RLS enforced via is_super_admin() on both docforge_licenses and docforge_activations.
 */

// ---------------------------------------------------------------------------
// License status — computed from is_active + expires_at, not stored in DB
// ---------------------------------------------------------------------------

const LICENSE_STATUSES = {
  active: 'active',
  expired: 'expired',
  inactive: 'inactive',
} as const

export type LicenseStatus = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES]

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

/** Matches docforge_licenses table columns. */
export type License = {
  id: string
  key: string
  client_name: string | null
  email: string | null
  expires_at: string | null
  is_active: boolean
  max_seats: number
  grace_days: number
  created_at: string
}

/** Matches docforge_activations table columns. */
export type Activation = {
  id: string
  license_id: string
  machine_id: string
  machine_name: string | null
  activated_at: string
  last_seen_at: string
  is_active: boolean
}

// ---------------------------------------------------------------------------
// Composite types
// ---------------------------------------------------------------------------

/** License with its activations and computed seat count. */
export type LicenseWithActivations = License & {
  activations: Activation[]
  active_seats: number
}

// ---------------------------------------------------------------------------
// Form data
// ---------------------------------------------------------------------------

/** Shape for create/edit license forms. */
export type LicenseFormData = {
  key: string
  client_name?: string | null
  email?: string | null
  expires_at?: string | null
  max_seats: number
  grace_days: number
}

export { LICENSE_STATUSES }
