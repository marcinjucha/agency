import { ok, err, Result } from 'neverthrow'
import { messages } from '@/lib/messages'

// NOTE: keep this module PURE (client-safe). It is imported by feature `server.ts`
// files for the Supabase/Zod result helpers below, and the createServerFn compiler
// only strips `.handler()` bodies — helpers referenced by non-handler exports (e.g.
// `parseTemplateVariables` in features/email/server.ts) are retained in the CLIENT
// bundle. In dev Vite does not tree-shake, so any server-only top-level import here
// evaluates in the browser. A pair of dead `authResult`/`requireAuthResult` wrappers
// used to import `@/lib/auth` (→ `server-start.server` → `@tanstack/start-server-core`
// → `node:async_hooks`), which crashed the block editor route with
// "Cannot access node:async_hooks.AsyncLocalStorage in client code". They had zero
// importers and were removed. Do NOT re-introduce a `@/lib/auth` (or any `*.server`)
// import here — use `requireAuthContext()` from `@/lib/server-auth.server` INSIDE a
// createServerFn handler instead.

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
