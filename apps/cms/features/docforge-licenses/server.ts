import { createServerFn } from '@tanstack/react-start'
import { errAsync, ResultAsync } from 'neverthrow'
import { z } from 'zod'
import { requireAuthContextFull } from '@/lib/server-auth'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { createLicenseSchema, updateLicenseSchema } from './validation'
import { messages } from '@/lib/messages'
import type { LicenseFormData, License } from './types'

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const createLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof createLicenseSchema>) => createLicenseSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await requireAuthContextFull()
      .andThen((auth) => {
        if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
        return insertLicense(buildCreatePayload(data))
      })

    return result.match(
      (created) => ({ success: true as const, data: created }),
      (error) => ({ success: false as const, error }),
    )
  })

export const updateLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; data: Partial<LicenseFormData> }) => input)
  .handler(async ({ data: { id, data: licenseData } }) => {
    const parsed = updateLicenseSchema.safeParse(licenseData)
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Validation error' }
    }

    const result = await requireAuthContextFull()
      .andThen((auth) => {
        if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
        return updateLicenseRow(id, parsed.data as Record<string, unknown>)
      })

    return result.match(
      (updated) => ({ success: true as const, data: updated }),
      (error) => ({ success: false as const, error }),
    )
  })

export const deleteLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => {
    const result = await requireAuthContextFull()
      .andThen((auth) => {
        if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
        return deleteLicenseRow(id)
      })

    return result.match(
      () => ({ success: true as const }),
      (error) => ({ success: false as const, error }),
    )
  })

export const toggleLicenseActiveFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; isActive: boolean }) => input)
  .handler(async ({ data: { id, isActive } }) => {
    const result = await requireAuthContextFull()
      .andThen((auth) => {
        if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
        return updateLicenseRow(id, { is_active: isActive })
      })

    return result.match(
      (updated) => ({ success: true as const, data: updated }),
      (error) => ({ success: false as const, error }),
    )
  })

export const deactivateActivationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { activationId: string }) => input)
  .handler(async ({ data: { activationId } }) => {
    const result = await requireAuthContextFull()
      .andThen((auth) => {
        if (!auth.isSuperAdmin) return errAsync(messages.common.noPermission)
        return deactivateActivationRow(activationId)
      })

    return result.match(
      () => ({ success: true as const }),
      (error) => ({ success: false as const, error }),
    )
  })

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

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
