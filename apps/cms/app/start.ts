// TanStack Start global instance — resolved as `<srcDirectory>/start.ts`.
// Everything in `functionMiddleware` runs on every server fn: keep it short and
// cheap, a fault here is app-wide.

import { createStart } from '@tanstack/react-start'
import { serverFnLoggerMiddleware } from '@/lib/server-fn-logger'

export const startInstance = createStart(() => ({
  functionMiddleware: [serverFnLoggerMiddleware],
}))
