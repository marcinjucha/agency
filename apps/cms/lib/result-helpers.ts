import { ok, err, Result, ResultAsync } from 'neverthrow'
import { getUserWithTenant, isAuthError, requireAuth, type AuthResult, type AuthSuccess } from '@/lib/auth'
import type { PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'

/**
 * Wraps getUserWithTenant() into ResultAsync.
 * Single auth helper for all Server Actions using neverthrow.
 */
export const authResult = (): ResultAsync<AuthSuccess, string> =>
  ResultAsync.fromPromise(
    getUserWithTenant(),
    () => messages.common.unknownError
  ).andThen((auth: AuthResult) =>
    isAuthError(auth) ? err(auth.error) : ok(auth)
  )

/**
 * Wraps requireAuth(permission) into ResultAsync.
 * Combines auth + permission check in one step for Server Actions.
 */
export const requireAuthResult = (permission: PermissionKey): ResultAsync<AuthSuccess, string> =>
  ResultAsync.fromPromise(
    requireAuth(permission),
    () => messages.common.unknownError,
  ).andThen((result) =>
    result.success ? ok(result.data) : err(result.error),
  )

/**
 * Wraps Zod safeParse into Result.
 * Returns first error message on failure.
 */
export const zodParse = <T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { errors: { message: string }[] } } },
  data: unknown
): Result<T, string> => {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? messages.common.invalidData)
  return ok(parsed.data)
}

/**
 * Wraps Supabase query response into Result.
 * Handles both error and null-data cases.
 *
 * Usage: ResultAsync.fromPromise(supabase.from(...).select().single(), mapErr).andThen(fromSupabase<MyType>())
 */
export const fromSupabase = <T>() =>
  (response: unknown): Result<T, string> => {
    const res = response as { data: T | null; error: { message: string } | null }
    if (res.error) return err(res.error.message)
    if (!res.data) return err('Brak danych')
    return ok(res.data)
  }

/**
 * Wraps Supabase void response (delete, update without .select()) into Result.
 * Checks error field only — no data expected.
 *
 * Usage: ResultAsync.fromPromise(supabase.from(...).delete().eq('id', id), mapErr).andThen(fromSupabaseVoid())
 */
export const fromSupabaseVoid = () =>
  (response: unknown): Result<undefined, string> => {
    const res = response as { error: { message: string } | null }
    if (res.error) return err(res.error.message)
    return ok(undefined)
  }
