import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createLicenseSchema } from './validation'
import type { LicenseFormData } from './types'
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
  getLicensesHandler,
  getLicenseHandler,
  getLicenseActivationsHandler,
  createLicenseHandler,
  updateLicenseHandler,
  deleteLicenseHandler,
  toggleLicenseActiveHandler,
  deactivateActivationHandler,
} from './handlers.server'

// ---------------------------------------------------------------------------
// Query server functions
// ---------------------------------------------------------------------------

export const getLicensesFn = createServerFn({ method: 'POST' }).handler(
  async () => getLicensesHandler(),
)

export const getLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => getLicenseHandler(id))

export const getLicenseActivationsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { licenseId: string }) => input)
  .handler(async ({ data: { licenseId } }) => getLicenseActivationsHandler(licenseId))

// ---------------------------------------------------------------------------
// Mutation server functions
// ---------------------------------------------------------------------------

export const createLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof createLicenseSchema>) =>
    createLicenseSchema.parse(input),
  )
  .handler(async ({ data }) => createLicenseHandler(data))

export const updateLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; data: Partial<LicenseFormData> }) => input)
  .handler(async ({ data: { id, data: licenseData } }) =>
    updateLicenseHandler(id, licenseData),
  )

export const deleteLicenseFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: { id } }) => deleteLicenseHandler(id))

export const toggleLicenseActiveFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; isActive: boolean }) => input)
  .handler(async ({ data: { id, isActive } }) =>
    toggleLicenseActiveHandler(id, isActive),
  )

export const deactivateActivationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { activationId: string }) => input)
  .handler(async ({ data: { activationId } }) =>
    deactivateActivationHandler(activationId),
  )
