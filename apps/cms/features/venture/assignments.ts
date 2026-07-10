import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  listAssignmentsInputSchema,
  setUserClientAssignmentsSchema,
} from './validation'
import {
  listAssignmentsForUserHandler,
  setUserClientAssignmentsHandler,
} from './assignment-handlers.server'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — per-user CLIENT-ASSIGNMENT server functions (iter 3a).
//
// PLAIN .ts (NOT .server.ts): iter 3b's assignment-editor UI component imports
// this module. A `.server.ts` suffix is a TanStack Start import-protection
// boundary → every client import is denied at the production build (memory.md:
// ".server.ts suffix & production build gate"). createServerFn wrappers are
// client-importable and MUST be a plain `.ts` file; only the pure handlers
// (assignment-handlers.server.ts) carry the server-only suffix.
//
// Thin wrappers over the pure handlers. All server fns are { method: 'POST' }
// and use the FUNCTION-form inputValidator `(v) => schema.parse(v)` — passing a
// raw schema silently skips validation (features/CLAUDE.md). Auth, permission
// gating, unscoped-actor gating, tenant scoping and the replace-set diff all
// live in the handlers.
// ---------------------------------------------------------------------------

export const getUserClientAssignmentsFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof listAssignmentsInputSchema>) =>
    listAssignmentsInputSchema.parse(v),
  )
  .handler(({ data }) => listAssignmentsForUserHandler(data.userId, data.tenantId))

export const setUserClientAssignmentsFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof setUserClientAssignmentsSchema>) =>
    setUserClientAssignmentsSchema.parse(v),
  )
  .handler(({ data }) =>
    setUserClientAssignmentsHandler(data.userId, data.clientIds, data.tenantId),
  )
