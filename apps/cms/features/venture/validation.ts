import { z } from 'zod'
import { messages } from '@/lib/messages'
import { BONUS_TYPES } from './types'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — ADMIN CRUD validation (iter 5a).
//
// Schemas are consumed ONLY through the function-form inputValidator in
// admin.server.ts: `.inputValidator((v) => schema.parse(v))`. Never pass a raw
// schema to inputValidator — createServerFn does not call .parse() on a raw
// schema object, so the handler would see unvalidated input (features/CLAUDE.md).
//
// DB-nullable columns use `.nullable().optional()` (accepts null AND undefined):
// Supabase returns null for optional columns and Zod's `.optional()` alone
// rejects null (features/CLAUDE.md gotcha).
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .min(1, messages.validation.slugRequired)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, messages.validation.slugFormat)

// --- Client ---------------------------------------------------------------
// so_clients.tenant_id is set server-side from the auth context, NEVER from
// input — it is intentionally absent from the schema.

export const createClientSchema = z.object({
  name: z.string().min(1, messages.validation.nameRequired),
  // Per-tenant unique (DB: UNIQUE(tenant_id, slug)).
  slug: slugSchema,
})

// `.partial()` on a schema WITHOUT ids — the row id travels in the input
// wrapper (updateClientInputSchema), not here, so no required uuid is dropped.
export const updateClientSchema = createClientSchema.partial()

// --- Campaign brand (so_campaigns.brand JSONB) ----------------------------
// Freeform object; every key optional. Values `.nullable().optional()` because
// the column is Json | null and callers may explicitly clear a token.

export const campaignBrandSchema = z.object({
  primary: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  bg: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  font: z.string().nullable().optional(),
})

// --- Campaign -------------------------------------------------------------

export const createCampaignSchema = z.object({
  // Parent FK — verified against so_clients.tenant_id in the handler before any
  // write (never trusted from input alone).
  client_id: z.string().uuid(),
  // Global unique (DB: UNIQUE(slug)).
  slug: slugSchema,
  display_name: z.string().nullable().optional(),
  brand: campaignBrandSchema.nullable().optional(),
  // Wire boundary uses z.string() (extensible ESP registry) — discriminated
  // downstream, NOT z.enum. DB default 'beehiiv'.
  esp_provider: z.string().min(1).default('beehiiv'),
  esp_audience_ref: z.string().nullable().optional(),
  esp_tag_launch: z.string().min(1).default('launch-notify'),
  published: z.boolean().default(false),
})

// Omit the parent FK BEFORE .partial() — otherwise .partial() would make
// client_id optional and a malformed update could attempt to reparent/null it
// (features/CLAUDE.md: updateSchema.partial() drops required ids silently).
export const updateCampaignSchema = createCampaignSchema
  .omit({ client_id: true })
  .partial()

// --- Bonus ----------------------------------------------------------------

export const createBonusSchema = z.object({
  // Parent FK — verified via campaign → client → tenant chain before write.
  campaign_id: z.string().uuid(),
  title: z.string().min(1, messages.validation.nameRequired),
  description: z.string().nullable().optional(),
  // Fixed DB CHECK ('link' | 'file'). z.enum is safe here because this schema
  // is only ever invoked through the function-form inputValidator.
  type: z.enum(BONUS_TYPES),
  url: z.string().nullable().optional(),
  media_asset_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int(messages.validation.sortOrderMustBeInteger).default(0),
  published: z.boolean().default(false),
})

// Omit parent FK before .partial() (same reasoning as campaign).
export const updateBonusSchema = createBonusSchema
  .omit({ campaign_id: true })
  .partial()

// --- Reorder --------------------------------------------------------------
// campaign_id is required so the handler can verify tenant ownership of the
// parent and confirm every item id belongs to that campaign before writing.

export const reorderBonusesSchema = z.object({
  campaign_id: z.string().uuid(),
  items: z
    .array(z.object({ id: z.string().uuid(), sort_order: z.number().int() }))
    .min(1),
})

// --- Wire-input wrappers --------------------------------------------------
// The row id is a REQUIRED uuid here (never partial) so an update can never drop
// the id — updateSchema.partial() only relaxes the mutable fields, not the id
// (features/CLAUDE.md). The FK parent id (client_id / campaign_id) is already
// omitted from the update*Schema bodies, so it cannot be reparented either.

export const idInputSchema = z.object({ id: z.string().uuid() })
export const updateClientInputSchema = z.object({
  id: z.string().uuid(),
  data: updateClientSchema,
})
export const updateCampaignInputSchema = z.object({
  id: z.string().uuid(),
  data: updateCampaignSchema,
})
export const updateBonusInputSchema = z.object({
  id: z.string().uuid(),
  data: updateBonusSchema,
})
export const listCampaignsInputSchema = z.object({
  client_id: z.string().uuid().optional(),
})
export const listBonusesInputSchema = z.object({ campaign_id: z.string().uuid() })

// --- Inferred types -------------------------------------------------------

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CreateBonusInput = z.infer<typeof createBonusSchema>
export type UpdateBonusInput = z.infer<typeof updateBonusSchema>
export type ReorderBonusesInput = z.infer<typeof reorderBonusesSchema>
