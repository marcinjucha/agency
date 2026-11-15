// TanStack Start global instance — resolved as `<srcDirectory>/start.ts`.
// Everything in `functionMiddleware` runs on every server fn: keep it short and
// cheap, a fault here is app-wide.
//
// CSRF: Start installs its CSRF protection for server fns ONLY when this file is
// absent; once it exists, the app must add `createCsrfMiddleware()` itself (Start
// 1.168+ warns at startup otherwise). Server fns are same-origin RPC, so only
// handlerType 'serverFn' is checked (Sec-Fetch-Site / Origin / Referer); /api/
// routes (webhooks, external callers) are left alone. Added with the
// CVE-2026-102989 bump (1.167.41 → 1.168.61, 2026-11-15).

import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { apiRequestLoggerMiddleware, serverFnLoggerMiddleware } from '@/lib/server-fn-logger'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  // Runs on EVERY request (SSR included) — the logger filters to /api/ itself.
  requestMiddleware: [csrfMiddleware, apiRequestLoggerMiddleware],
  functionMiddleware: [serverFnLoggerMiddleware],
}))
