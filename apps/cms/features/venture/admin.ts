import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  createBonusSchema,
  createCampaignSchema,
  createClientSchema,
  idInputSchema,
  listBonusesInputSchema,
  listCampaignsInputSchema,
  reorderBonusesSchema,
  updateBonusInputSchema,
  updateCampaignInputSchema,
  updateClientInputSchema,
} from './validation'
import {
  createBonusHandler,
  createCampaignHandler,
  createClientHandler,
  deleteBonusHandler,
  deleteCampaignHandler,
  deleteClientHandler,
  listBonusesHandler,
  listCampaignsHandler,
  listClientsHandler,
  reorderBonusesHandler,
  updateBonusHandler,
  updateClientHandler,
  updateCampaignHandler,
} from './admin-handlers.server'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — ADMIN CRUD server functions (iter 5a).
//
// Thin createServerFn wrappers over the pure handlers in admin-handlers.server.ts
// (same split as docforge-licenses). All server fns are { method: 'POST' } and use
// the FUNCTION-form inputValidator `(v) => schema.parse(v)` — passing a raw schema
// silently skips validation (features/CLAUDE.md). Auth, permission gating, tenant
// scoping and parent-ownership verification all live in the handlers.
//
// This is the AUTHENTICATED admin layer. The PUBLIC anon read endpoint
// (getPublishedCampaignBySlug) stays in server.ts on the anon client — do not
// route admin CRUD through it.
// ---------------------------------------------------------------------------

// Wire-input wrapper schemas (id + data) live in validation.ts.

// --- Clients --------------------------------------------------------------

export const listClientsFn = createServerFn({ method: 'POST' }).handler(() =>
  listClientsHandler(),
)

// z.input (not z.infer) — createClientSchema has defaulted fields
// (mail_provider). z.input keeps those OPTIONAL at the call site (e.g. the
// inline name+slug quick-create in VentureClientList/VentureClientSelect);
// .parse() still fills the default at runtime, and the handler receives the
// fully-populated z.infer output type.
export const createClientFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.input<typeof createClientSchema>) => createClientSchema.parse(v))
  .handler(({ data }) => createClientHandler(data))

export const updateClientFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof updateClientInputSchema>) =>
    updateClientInputSchema.parse(v),
  )
  .handler(({ data }) => updateClientHandler(data.id, data.data))

export const deleteClientFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof idInputSchema>) => idInputSchema.parse(v))
  .handler(({ data }) => deleteClientHandler(data.id))

// --- Campaigns ------------------------------------------------------------

export const listCampaignsFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof listCampaignsInputSchema>) =>
    listCampaignsInputSchema.parse(v),
  )
  .handler(({ data }) => listCampaignsHandler(data.client_id))

export const createCampaignFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof createCampaignSchema>) => createCampaignSchema.parse(v))
  .handler(({ data }) => createCampaignHandler(data))

export const updateCampaignFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof updateCampaignInputSchema>) =>
    updateCampaignInputSchema.parse(v),
  )
  .handler(({ data }) => updateCampaignHandler(data.id, data.data))

export const deleteCampaignFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof idInputSchema>) => idInputSchema.parse(v))
  .handler(({ data }) => deleteCampaignHandler(data.id))

// --- Bonuses --------------------------------------------------------------

export const listBonusesFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof listBonusesInputSchema>) =>
    listBonusesInputSchema.parse(v),
  )
  .handler(({ data }) => listBonusesHandler(data.campaign_id))

export const createBonusFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof createBonusSchema>) => createBonusSchema.parse(v))
  .handler(({ data }) => createBonusHandler(data))

export const updateBonusFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof updateBonusInputSchema>) =>
    updateBonusInputSchema.parse(v),
  )
  .handler(({ data }) => updateBonusHandler(data.id, data.data))

export const deleteBonusFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof idInputSchema>) => idInputSchema.parse(v))
  .handler(({ data }) => deleteBonusHandler(data.id))

export const reorderBonusesFn = createServerFn({ method: 'POST' })
  .inputValidator((v: z.infer<typeof reorderBonusesSchema>) => reorderBonusesSchema.parse(v))
  .handler(({ data }) => reorderBonusesHandler(data))
