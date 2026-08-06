// TanStack Start global instance — resolved as `<srcDirectory>/start.ts`.
// Everything in `functionMiddleware` runs on every server fn: keep it short and
// cheap, a fault here is app-wide.
//
// UPGRADE TRAP: newer Start versions auto-install CSRF protection for server fns
// ONLY when this file is absent, and expect an explicit `createCsrfMiddleware()`
// in `requestMiddleware` once it exists. 1.167.41 ships no CSRF machinery at all
// (verified — no `csrf`/`sec-fetch-site` anywhere in @tanstack), so there is
// nothing to opt out of today. When bumping Start, add it here.

import { createStart } from '@tanstack/react-start'
import { apiRequestLoggerMiddleware, serverFnLoggerMiddleware } from '@/lib/server-fn-logger'

export const startInstance = createStart(() => ({
  // Runs on EVERY request (SSR included) — the middleware itself filters to /api/.
  requestMiddleware: [apiRequestLoggerMiddleware],
  functionMiddleware: [serverFnLoggerMiddleware],
}))
