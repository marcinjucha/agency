import { err, ok, Result, ResultAsync } from 'neverthrow'
import {
  requireAuthContextFull,
  type AuthContextFull,
} from '@/lib/server-auth.server'
import { hasPermission, type PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — SHARED handler infrastructure (extracted iter 3a).
//
// Generic, domain-agnostic building blocks used by BOTH admin-handlers.server.ts
// (clients/campaigns/bonuses CRUD) and assignment-handlers.server.ts (per-user
// client assignments). Rule of Two: the auth-gating wrapper, the untyped table
// accessor, the Result→plain-object adapters, and the DB-error mappers were
// near-verbatim copies across the two handler files; consolidated here.
//
// Pure server infrastructure — NO createServerFn wrapper lives here (the `.server`
// suffix is the import-protection boundary; this module is genuinely server-only
// and never imported by client code). The thin createServerFn wrappers stay in
// admin.ts / assignments.ts; the domain-specific handlers stay in their own files.
// ---------------------------------------------------------------------------

/** Plain result shape returned to callers for a value-producing mutation. */
export type MutationResult<T> = { success: boolean; data?: T; error?: string }

/** Plain result shape returned to callers for a void mutation. */
export type VoidResult = { success: boolean; error?: string }

/** Raw Supabase/Postgres error shape (has `code` at runtime — `message` at type level). */
export type DbErrorShape = { message?: string; code?: string } | null

/**
 * Translate a raw Supabase/Postgres error into a generic, client-safe, localized
 * message. The RAW error (constraint/schema names, RLS policy text like
 * "new row violates row-level security policy …") is logged for developers via
 * console.error and NEVER returned to the client. 23505 (unique_violation) →
 * friendly slug message. Mirrors features/email/server.ts (23505 handling).
 */
export function mapDbError(error: DbErrorShape, context: string): string {
  // Developer-facing, English — full raw error preserved for debugging.
  console.error(`[venture] ${context} failed:`, error)
  if (error?.code === '23505') return messages.venture.slugTaken
  return messages.venture.operationFailed
}

// Reject handler for ResultAsync.fromPromise (thrown/network errors — Supabase
// resolves with `{ error }` rather than throwing, so this is the rare path).
// Never surfaces the raw thrown message to the client.
export const dbError = (e: unknown): string => {
  console.error('[venture] unexpected DB error:', e)
  return messages.venture.operationFailed
}

/**
 * Local, error-mapping variant of `fromSupabase` — routes the raw DB error
 * through mapDbError instead of leaking `res.error.message` to the client.
 * (The shared @/lib/result-helpers versions propagate the raw string.)
 */
export const fromSupabaseSafe =
  <T>(context: string) =>
  (response: unknown): Result<T, string> => {
    const res = response as { data: T | null; error: DbErrorShape }
    if (res.error) return err(mapDbError(res.error, context))
    if (!res.data) return err(messages.venture.operationFailed)
    return ok(res.data)
  }

/**
 * Local, error-mapping variant of `fromSupabaseVoid` (delete/void mutations).
 * Single consolidated void-response mapper for both handler files (formerly
 * admin's `fromSupabaseVoidSafe` + assignment's `checkVoid`, which were the same
 * concept).
 */
export const fromSupabaseVoidSafe =
  (context: string) =>
  (response: unknown): Result<undefined, string> => {
    const res = response as { error: DbErrorShape }
    if (res.error) return err(mapDbError(res.error, context))
    return ok(undefined)
  }

// so_* insert/update types resolve to `never` in this Supabase JS version
// (same incompatibility documented in shop-categories). Route table access
// through an untyped accessor; reads stay correct at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tbl = (auth: AuthContextFull, name: string) => (auth.supabase as any).from(name)

/**
 * Gate a handler on a permission, then run the body with the auth context.
 * requireAuthContextFull() → hasPermission(permission) → body(auth).
 */
export function gated<T>(
  permission: PermissionKey,
  body: (auth: AuthContextFull) => ResultAsync<T, string>,
): ResultAsync<T, string> {
  return requireAuthContextFull().andThen((auth) =>
    hasPermission(permission, auth.permissions)
      ? body(auth)
      : err<T, string>(messages.common.noPermission),
  )
}

/**
 * Resolve the tenant a handler must scope its reads/writes to.
 *
 * SECURITY INVARIANT: a super_admin (the CMS Scope Bar cross-tenant edit) may
 * pass an explicit `tenantId` to operate on ANOTHER tenant — the intended
 * behaviour when editing a user who belongs to a different organization. A
 * NON-super caller's `tenantId` param is IGNORED and forced to `auth.tenantId`,
 * so a regular tenant admin can never pass `tenantId=<other>` to read/write
 * another tenant's clients or assignment map (cross-tenant read exploit). When
 * `tenantId` is omitted, the caller's own tenant is used for everyone.
 *
 * Mirrors the users feature's `assertSameTenant` super_admin exemption, but as a
 * value (the tenant to scope to) rather than a boolean assertion — the same
 * source of truth (`auth.isSuperAdmin`) gates both.
 */
export function resolveEffectiveTenantId(
  auth: AuthContextFull,
  tenantId?: string,
): string {
  return auth.isSuperAdmin ? tenantId ?? auth.tenantId : auth.tenantId
}

/** Adapt a value-producing ResultAsync to the plain MutationResult contract. */
export const toMutation = <T>(r: ResultAsync<T, string>): Promise<MutationResult<T>> =>
  r.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error }),
  )

/** Adapt a void ResultAsync to the plain VoidResult contract. */
export const toVoid = (r: ResultAsync<unknown, string>): Promise<VoidResult> =>
  r.match(
    () => ({ success: true as const }),
    (error) => ({ success: false as const, error }),
  )
