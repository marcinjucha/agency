// ---------------------------------------------------------------------------
// Global observability for server functions.
//
// Registered ONCE as `functionMiddleware` in app/start.ts, so it wraps EVERY
// `createServerFn` in the CMS (~170 call sites) with zero per-handler edits.
//
// WHY a middleware and not console.* per handler:
//   - one place to change the format / thresholds / redaction rules; 170
//     hand-written log lines would drift within a month
//   - `serverFnMeta` gives the ORIGINAL function name + source file, so the log
//     identifies the caller without anyone naming it by hand
//   - the server fn's own base (INCLUDING its `inputValidator`) is appended as
//     the INNERMOST middleware, while global `functionMiddleware` runs FIRST —
//     so this wrapper also catches a THROWING inputValidator. That is the one
//     failure the codebase could previously not diagnose at all: the validator
//     throws before the handler, so any logging inside the handler is dead code
//     and the client only sees a generic 500.
//
// REDACTION — hard rules, do not relax:
//   - NEVER log `data` (the server fn input). Inputs carry user content, lead
//     PII, and outright secrets — the venture client editor posts
//     `gmail_app_password` / `resend_api_key` as plain server fn input. Logging
//     inputs would copy live credentials into Vercel logs.
//   - NEVER log the handler's return value, for the same reason.
//   - Metadata only: which function, which file, method, duration, outcome, and
//     the error's own discriminators.
//
// This module is deliberately NOT named `*.server.ts`. app/start.ts is reachable
// from the client graph (function middleware may carry `.client()` hooks), so
// the module has to be safe there. A production build was checked and the
// compiler DOES strip this `.server()` body out of the client bundle — but the
// guarded `process` read in `readEnv` stays as a cheap safety net, because
// adding a `.client()` hook here later would pull the module across that line
// and a bare `process.env` would then throw in the browser.
// ---------------------------------------------------------------------------

import { createMiddleware } from '@tanstack/react-start'

/**
 * A server fn slower than this is logged at `warn` even when it succeeded.
 * Set just under the point where a CMS interaction stops feeling instant —
 * the goal is to surface a creeping N+1 or a missing index before a user
 * reports "the panel got slow", not to police every query.
 */
const SLOW_SERVER_FN_MS = 1000

/**
 * Read an env var without assuming `process` exists. This module is evaluated in
 * the client bundle as well, where a bare `process.env.X` throws a ReferenceError
 * and would take down the whole app — a logging utility must never be able to do
 * that.
 */
function readEnv(key: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined
}

/**
 * Which build is actually running. Logged on every failure because a past
 * incident was chased for hours as a logic bug when the real cause was Vercel
 * serving a STALE branch deploy — the fix is making "is this the code I just
 * pushed?" answerable at a glance instead of by hypothesis.
 */
function deploymentTag(): { sha: string; env: string } {
  return {
    sha: readEnv('VERCEL_GIT_COMMIT_SHA')?.slice(0, 7) ?? 'local',
    env: readEnv('VERCEL_ENV') ?? 'local',
  }
}

/**
 * Verbose mode logs EVERY successful call, not just the slow and failed ones.
 * Off by default in production: a single CMS page can fan out to a dozen server
 * fns, and a per-call success line at that volume buries the lines that matter.
 * On in dev (where the timeline IS the value), and switchable in a deployed
 * environment via `SERVER_FN_LOG=all` when reproducing something specific.
 */
function isVerbose(): boolean {
  if (readEnv('SERVER_FN_LOG') === 'all') return true
  return import.meta.env?.DEV === true
}

/**
 * Pull the safe, actionable fields off an unknown thrown value.
 *
 * The message alone routinely under-determines the cause: a Postgres error
 * carries `code` (e.g. 42501 RLS denial, 23505 unique violation), a redirect or
 * notFound thrown by the framework carries neither and must not be reported as a
 * crash. None of these fields can contain a secret or the request payload.
 */
function describeThrown(error: unknown): {
  name?: string
  code?: string
  message: string
} {
  const message = error instanceof Error ? error.message : String(error)
  if (typeof error !== 'object' || error === null) return { message }
  const extras = error as { name?: unknown; code?: unknown }
  return {
    name: typeof extras.name === 'string' ? extras.name : undefined,
    code: typeof extras.code === 'string' ? extras.code : undefined,
    message,
  }
}

/**
 * TanStack Start signals redirects and not-found through THROWN control-flow
 * objects. They travel the same path as a real error, so without this check
 * every `throw redirect(...)` would be logged as a server fn failure and the
 * error log would be mostly noise. Detected structurally — these objects are not
 * exported as classes we can `instanceof`.
 */
function isFrameworkControlFlow(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { isRedirect?: unknown; isNotFound?: unknown; routerCode?: unknown }
  return (
    candidate.isRedirect === true ||
    candidate.isNotFound === true ||
    typeof candidate.routerCode === 'string'
  )
}

export const serverFnLoggerMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, serverFnMeta, method }) => {
    const startedAt = Date.now()
    // `name`/`filename` come from the compiler, but stay defensive: an
    // observability wrapper must not be the reason a request fails.
    const fn = serverFnMeta?.name ?? 'unknown'
    const file = serverFnMeta?.filename ?? 'unknown'

    try {
      const result = await next()
      const ms = Date.now() - startedAt

      if (ms >= SLOW_SERVER_FN_MS) {
        console.warn('[server-fn] slow', { fn, file, method, ms })
      } else if (isVerbose()) {
        console.info('[server-fn] ok', { fn, file, method, ms })
      }
      return result
    } catch (error) {
      const ms = Date.now() - startedAt

      // redirect() / notFound() are intended control flow, not failures.
      if (isFrameworkControlFlow(error)) {
        if (isVerbose()) {
          console.info('[server-fn] control-flow (redirect/notFound)', { fn, file, method, ms })
        }
        throw error
      }

      console.error('[server-fn] FAILED', {
        fn,
        file,
        method,
        ms,
        ...describeThrown(error),
        ...deploymentTag(),
      })
      // Rethrow unchanged — this middleware observes, it never alters behaviour.
      throw error
    }
  },
)
