import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { License, Activation } from './types'

// ---------------------------------------------------------------------------
// Query functions (browser client — TanStack Query)
// ---------------------------------------------------------------------------

/**
 * Fetch all DocForge licenses ordered by created_at desc.
 * Uses (supabase as any) because docforge_licenses is not in generated types.
 */
export async function getLicenses(): Promise<License[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('docforge_licenses')
    .select('id, key, client_name, email, expires_at, is_active, max_seats, grace_days, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as License[]
}

/**
 * Fetch a single license by ID.
 */
export async function getLicense(id: string): Promise<License> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('docforge_licenses')
    .select('id, key, client_name, email, expires_at, is_active, max_seats, grace_days, created_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as License
}

/**
 * Fetch activations for a specific license.
 */
export async function getLicenseActivations(licenseId: string): Promise<Activation[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('docforge_activations')
    .select('id, license_id, machine_id, machine_name, activated_at, last_seen_at, is_active')
    .eq('license_id', licenseId)
    .order('activated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Activation[]
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

export function useLicenses() {
  return useQuery({
    queryKey: queryKeys.docforgeLicenses.all,
    queryFn: getLicenses,
  })
}

export function useLicense(id: string) {
  return useQuery({
    queryKey: queryKeys.docforgeLicenses.detail(id),
    queryFn: () => getLicense(id),
    enabled: !!id,
  })
}

export function useLicenseActivations(licenseId: string) {
  return useQuery({
    queryKey: queryKeys.docforgeLicenses.activations(licenseId),
    queryFn: () => getLicenseActivations(licenseId),
    enabled: !!licenseId,
  })
}
