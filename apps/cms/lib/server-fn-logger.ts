// Global observability for server functions — registered as `functionMiddleware`
// in app/start.ts, so it wraps every createServerFn.
//
// NEVER log `data` or the return value: server fn inputs carry lead PII and live
// secrets (the venture client editor posts gmail_app_password as plain input).
// Metadata only.
//
// Runs OUTSIDE the server fn's own base middleware, so it also catches a
// throwing inputValidator — which fires before the handler and is otherwise
// undiagnosable.

import { isNotFound, isRedirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

const SLOW_SERVER_FN_MS = 1000

// Guarded: not `.server.ts`, so it must not assume `process` exists.
function readEnv(key: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined
}

// Logged on failure so "is this the code I just pushed?" is answerable at a
// glance — a stale Vercel deploy once cost hours as a suspected logic bug.
function deploymentTag(): { sha: string; env: string } {
  return {
    sha: readEnv('VERCEL_GIT_COMMIT_SHA')?.slice(0, 7) ?? 'local',
    env: readEnv('VERCEL_ENV') ?? 'local',
  }
}

// Off in prod: one CMS page fans out to a dozen server fns, and per-call success
// lines bury the ones that matter.
function isVerbose(): boolean {
  return readEnv('SERVER_FN_LOG') === 'all' || import.meta.env?.DEV === true
}

function describeThrown(error: unknown): { name?: string; code?: string; message: string } {
  const message = error instanceof Error ? error.message : String(error)
  if (typeof error !== 'object' || error === null) return { message }
  const extras = error as { name?: unknown; code?: unknown }
  return {
    name: typeof extras.name === 'string' ? extras.name : undefined,
    // e.g. Postgres 42501 (RLS denial) / 23505 (unique violation).
    code: typeof extras.code === 'string' ? extras.code : undefined,
    message,
  }
}

// redirect()/notFound() are thrown control flow, not failures. Use the router's
// own predicates — a redirect is a `Response` subtype, so a hand-rolled
// structural check gets it wrong.
function isFrameworkControlFlow(error: unknown): boolean {
  return isRedirect(error) || isNotFound(error)
}

export const serverFnLoggerMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, serverFnMeta, method }) => {
    const startedAt = Date.now()
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

      if (isFrameworkControlFlow(error)) {
        if (isVerbose()) {
          console.info('[server-fn] control-flow', { fn, file, method, ms })
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
      throw error
    }
  },
)
