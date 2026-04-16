'use server'

import { errAsync, ResultAsync } from 'neverthrow'
import { zodParse, fromSupabase, fromSupabaseVoid, requireAuthResult } from '@/lib/result-helpers'
import { createLicenseSchema, updateLicenseSchema } from './validation'
import type { LicenseFormData, License } from './types'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { createServiceClient } from '@/lib/supabase/service'

// --- Server Actions (public API) ---

/**
 * Create a new DocForge license.
 * Double authorization: requireAuth('system.docforge_licenses') + is_super_admin.
 * Uses service client because RLS requires is_super_admin().
 */
export async function createLicense(data: LicenseFormData) {
  const result = await zodParse(createLicenseSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('system.docforge_licenses').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.common.noPermission)
      }
      return insertLicense(buildCreatePayload(parsed))
    })

  return result.match(
    (created) => ({ success: true as const, data: created }),
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Update an existing DocForge license.
 * Key is immutable — excluded from update schema.
 */
export async function updateLicense(id: string, data: Partial<LicenseFormData>) {
  const result = await zodParse(updateLicenseSchema, data)
    .asyncAndThen((parsed) => requireAuthResult('system.docforge_licenses').map((auth) => ({ parsed, auth })))
    .andThen(({ parsed, auth }) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.common.noPermission)
      }
      return updateLicenseRow(id, parsed)
    })

  return result.match(
    (updated) => ({ success: true as const, data: updated }),
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Delete a DocForge license.
 * Cascade deletes activations (FK constraint).
 */
export async function deleteLicense(id: string) {
  const result = await requireAuthResult('system.docforge_licenses')
    .andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.common.noPermission)
      }
      return deleteLicenseRow(id)
    })

  return result.match(
    () => ({ success: true as const }),
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Toggle license is_active status.
 */
export async function toggleLicenseActive(id: string, isActive: boolean) {
  const result = await requireAuthResult('system.docforge_licenses')
    .andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.common.noPermission)
      }
      return updateLicenseRow(id, { is_active: isActive })
    })

  return result.match(
    (updated) => ({ success: true as const, data: updated }),
    (error) => ({ success: false as const, error }),
  )
}

/**
 * Deactivate a specific machine activation.
 */
export async function deactivateActivation(activationId: string) {
  const result = await requireAuthResult('system.docforge_licenses')
    .andThen((auth) => {
      if (!auth.isSuperAdmin) {
        return errAsync(messages.common.noPermission)
      }
      return deactivateActivationRow(activationId)
    })

  return result.match(
    () => ({ success: true as const }),
    (error) => ({ success: false as const, error }),
  )
}

// --- DB helpers (feature-local) ---

const dbError = (e: unknown) =>
  e instanceof Error ? e.message : messages.common.unknownError

function insertLicense(payload: Record<string, unknown>) {
  return ResultAsync.fromPromise(
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
    (createServiceClient() as any)
      .from('docforge_licenses')
      .delete()
      .eq('id', id),
    dbError,
  ).andThen(fromSupabaseVoid())
}

function deactivateActivationRow(activationId: string) {
  return ResultAsync.fromPromise(
    (createServiceClient() as any)
      .from('docforge_activations')
      .update({ is_active: false })
      .eq('id', activationId),
    dbError,
  ).andThen(fromSupabaseVoid())
}

// --- Business logic ---

function buildCreatePayload(parsed: Record<string, unknown>) {
  return {
    key: parsed.key,
    client_name: parsed.client_name ?? null,
    email: parsed.email ?? null,
    expires_at: parsed.expires_at ?? null,
    max_seats: parsed.max_seats,
    grace_days: parsed.grace_days,
  }
}
