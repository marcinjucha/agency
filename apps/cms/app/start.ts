// ---------------------------------------------------------------------------
// TanStack Start global instance.
//
// Resolved by the plugin as `<srcDirectory>/start.ts` (srcDirectory: 'app' —
// see vite.config.ts). The entry is OPTIONAL, which is why the project ran
// without it until now; adding it is what makes global middleware possible.
//
// `functionMiddleware` wraps EVERY createServerFn in the app. Keep this list
// short and keep each entry cheap — anything registered here runs on all ~170
// server functions, so a slow or throwing middleware is an app-wide outage, not
// a local bug.
// ---------------------------------------------------------------------------

import { createStart } from '@tanstack/react-start'
import { serverFnLoggerMiddleware } from '@/lib/server-fn-logger'

export const startInstance = createStart(() => ({
  functionMiddleware: [serverFnLoggerMiddleware],
}))
