import { createServerFn } from '@tanstack/react-start'
// Pure handler implementations live in handlers.server.ts — that file's
// `.server.ts` suffix is the canonical TanStack Start signal for "this code
// must NEVER reach the client bundle". Importing the handlers here lets us
// wrap them in `createServerFn` while the vite plugin transform strips the
// `.server.ts` module from any client-side import graph.
//
// Tests import handlers directly from `./handlers.server` — DO NOT add
// re-exports for them here, that would force the module into the client
// bundle through `import { ... } from './server'` in client components.
import {
  getResponsesHandler,
  getResponseHandler,
  getResponsesByLinkHandler,
  getResponsesBySurveyHandler,
  getResponseCountHandler,
  getResponseCountBySurveyHandler,
  getResponseAiActionResultsHandler,
  deleteResponseHandler,
  type DeleteResponseResult,
} from './handlers.server'

// Type-only re-export — TS erases at compile time, safe for client bundle.
export type { DeleteResponseResult } from './handlers.server'

// ---------------------------------------------------------------------------
// Server Functions (public API) — thin createServerFn wrappers around handlers
// ---------------------------------------------------------------------------

export const getResponsesFn = createServerFn({ method: 'POST' }).handler(getResponsesHandler)

export const getResponseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => getResponseHandler(data))

export const getResponsesByLinkFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { surveyLinkId: string }) => input)
  .handler(async ({ data }) => getResponsesByLinkHandler(data))

export const getResponsesBySurveyFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { surveyId: string }) => input)
  .handler(async ({ data }) => getResponsesBySurveyHandler(data))

export const getResponseCountFn = createServerFn({ method: 'POST' }).handler(getResponseCountHandler)

export const getResponseCountBySurveyFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { surveyId: string }) => input)
  .handler(async ({ data }) => getResponseCountBySurveyHandler(data))

export const getResponseAiActionResultsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { responseId: string }) => input)
  .handler(async ({ data }) => getResponseAiActionResultsHandler(data))

export const deleteResponseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<DeleteResponseResult> => deleteResponseHandler(data))
