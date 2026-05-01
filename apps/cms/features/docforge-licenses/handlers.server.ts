/**
 * Pure handler exports for docforge-licenses server functions.
 *
 * WHY a separate `.server.ts` file:
 *   TanStack Start strips `.server.ts` files from the client bundle at compile
 *   time (plugin transform). Pure handlers sitting next to `createServerFn(...)`
 *   wrappers in `server.ts` can leak server-only imports
 *   (`createServiceClient`, `requireAuthContextFull`, `createServerClient`)
 *   into the browser bundle.
 *
 *   Moving every pure handler here guarantees the boundary: this file's
 *   imports NEVER reach the client bundle. server.ts becomes a thin RPC
 *   wrapper layer.
 *
 *   Tests import handlers directly from this file — handler API is unchanged.
 */

import { errAsync, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { createServerClient } from '@/lib/supabase/server-start'
import { requireAuthContextFull } from '@/lib/server-auth'
import { messages } from '@/lib/messages'
import { updateLicenseSchema } from './validation'
import type { LicenseFormData, License, Activation } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LICENSE_COLUMNS =
  'id, key, client_name, email, expires_at, is_active, max_seats, grace_days, created_at'

const ACTIVATION_COLUMNS =
  'id, license_id, machine_id, machine_name, activated_at, last_seen_at, is_active'

// ---------------------------------------------------------------------------
// Query handlers (read via server client — RLS-aware)
// ---------------------------------------------------------------------------

export async function getLicensesHandler(): Promise<License[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('docforge_licenses')
    .select(LICENSE_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as License[]
}

export async function getLicenseHandler(id: string): Promise<License> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('docforge_licenses')
    .select(LICENSE_COLUMNS)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as License
}

export async function getLicenseActivationsHandler(licenseId: string): Promise<Activation[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('docforge_activations')
    .select(ACTIVATION_COLUMNS)
    .eq('license_id', licenseId)
    .order('activated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Activation[]
}

// ---------------------------------------------------------------------------
// Mutation handlers (write via service client — RLS bypassed, super_admin gated)
// ---------------------------------------------------------------------------

export type LicenseMutationResult<T = License> =
  | { success: true; data: T }
  | { success: false; error: string }

export type LicenseVoidResult =
  | { success: true }
  | { success: false; error: string }

export async function createLicenseHandler(
  data: LicenseFormData,
): Promise<LicenseMutationResult> {
  const result = await requireAuthContextFull().andThen((auth) => {
    if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
    return insertLicense(buildCreatePayload(data))
  })

  return result.match<LicenseMutationResult>(
    (created) => ({ success: true, data: created }),
    (error) => ({ success: false, error }),
  )
}

export async function updateLicenseHandler(
  id: string,
  data: Partial<LicenseFormData>,
): Promise<LicenseMutationResult> {
  const parsed = updateLicenseSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Validation error',
    }
  }

  const result = await requireAuthContextFull().andThen((auth) => {
    if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
    return updateLicenseRow(id, parsed.data as Record<string, unknown>)
  })

  return result.match<LicenseMutationResult>(
    (updated) => ({ success: true, data: updated }),
    (error) => ({ success: false, error }),
  )
}

export async function deleteLicenseHandler(id: string): Promise<LicenseVoidResult> {
  const result = await requireAuthContextFull().andThen((auth) => {
    if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
    return deleteLicenseRow(id)
  })

  return result.match<LicenseVoidResult>(
    () => ({ success: true }),
    (error) => ({ success: false, error }),
  )
}

export async function toggleLicenseActiveHandler(
  id: string,
  isActive: boolean,
): Promise<LicenseMutationResult> {
  const result = await requireAuthContextFull().andThen((auth) => {
    if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
    return updateLicenseRow(id, { is_active: isActive })
  })

  return result.match<LicenseMutationResult>(
    (updated) => ({ success: true, data: updated }),
    (error) => ({ success: false, error }),
  )
}

export async function deactivateActivationHandler(
  activationId: string,
): Promise<LicenseVoidResult> {
  const result = await requireAuthContextFull().andThen((auth) => {
    if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
    return deactivateActivationRow(activationId)
  })

  return result.match<LicenseVoidResult>(
    () => ({ success: true }),
    (error) => ({ success: false, error }),
  )
}

// ---------------------------------------------------------------------------
// DB helpers (feature-local)
// ---------------------------------------------------------------------------

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function insertLicense(payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('docforge_licenses')
      .insert(payload)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<License>())
}

function updateLicenseRow(id: string, payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('docforge_licenses')
      .update(payload)
      .eq('id', id)
      .select()
      .single(),
    dbError,
  ).andThen(fromSupabase<License>())
}

function deleteLicenseRow(id: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('docforge_licenses')
      .delete()
      .eq('id', id),
    dbError,
  ).andThen(fromSupabaseVoid())
}

function deactivateActivationRow(activationId: string) {
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from('docforge_activations')
      .update({ is_active: false })
      .eq('id', activationId),
    dbError,
  ).andThen(fromSupabaseVoid())
}

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

function buildCreatePayload(parsed: LicenseFormData) {
  return {
    key: parsed.key,
    client_name: parsed.client_name ?? null,
    email: parsed.email ?? null,
    expires_at: parsed.expires_at ?? null,
    max_seats: parsed.max_seats,
    grace_days: parsed.grace_days,
  }
}
