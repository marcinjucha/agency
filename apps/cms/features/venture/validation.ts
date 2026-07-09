import { z } from 'zod'
import { messages } from '@/lib/messages'
import { BONUS_TYPES, MAIL_PROVIDERS } from './types'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — ADMIN CRUD validation (iter 5a).
//
// Schemas are consumed ONLY through the function-form inputValidator in
// admin.ts: `.inputValidator((v) => schema.parse(v))`. Never pass a raw
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
  // Mail credentials live on the CLIENT (shared across its campaigns), not the
  // campaign — a mailbox is one account reused by every campaign for that
  // client. Fixed DB CHECK (so_clients.mail_provider) — derived union, not a
  // hand-maintained string union (features/CLAUDE.md, ag-coding).
  mail_provider: z.enum(MAIL_PROVIDERS).default('resend_shared'),
  // Secrets: trimmed + non-empty WHEN present; nullable/optional so the editor
  // can omit them (leave untouched on edit, same masked-field pattern as
  // so_campaigns.tally_webhook_secret) or send null (clear / not set yet).
  // `.or(z.literal(''))` is REQUIRED on all four: `.optional()` accepts ONLY
  // `undefined` and `.nullable()` accepts ONLY `null` — neither matches an
  // empty string `''`, which is a different value-type entirely. RHF always
  // submits `''` for an untouched text input (never `undefined`), so without
  // this a field the user deliberately left blank (e.g. "Resend własny" when
  // the client uses Gmail) fails `.min(1)`/`.email()` — surfacing as an
  // invisible error, since the field's section is conditionally hidden for
  // the inactive provider. Downstream (`onSave` in VentureClientEditor.tsx,
  // `buildClientPatch` in admin-handlers.server.ts) already converts '' to
  // null/omission correctly — this was purely a Zod-schema gap.
  resend_api_key: z.string().trim().min(1).nullable().optional().or(z.literal('')),
  resend_from_email: z
    .string()
    .trim()
    .email(messages.validation.invalidEmail)
    .nullable()
    .optional()
    .or(z.literal('')),
  gmail_address: z
    .string()
    .trim()
    .email(messages.validation.invalidEmail)
    .nullable()
    .optional()
    .or(z.literal('')),
  // Google displays a Gmail App Password in 4 space-separated blocks of 4
  // chars (e.g. `qcfn tnzx owzt irfg`) for readability, but the real secret
  // used for SMTP auth is 16 chars with NO spaces. We normalize on our side
  // (strip ALL whitespace, not just leading/trailing) rather than relying on
  // Google SMTP's tolerance for spaces in the password — `.trim()` alone only
  // strips the edges, leaving internal spaces intact if pasted verbatim.
  gmail_app_password: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.replace(/\s+/g, ''))
    .nullable()
    .optional()
    .or(z.literal('')),
  // Friendly "From" display name (client's brand, e.g. "Przystań Inwestorów").
  // NOT a secret — plain text field, applies regardless of mail_provider.
  // `.or(z.literal(''))` from day one (see comment above re: RHF always
  // submitting '' for an untouched text input).
  sender_name: z.string().trim().nullable().optional().or(z.literal('')),
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
  // Per-campaign Tally webhook signing secret (so_campaigns.tally_webhook_secret).
  // Trimmed + non-empty WHEN present; nullable/optional so the UI can omit it
  // (leave untouched on edit) or send null (create with no secret yet). The
  // editor never submits an empty string — it maps blank → null / absent.
  tally_webhook_secret: z.string().trim().min(1).nullable().optional(),
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

// --- Per-user client assignments (iter 3a) --------------------------------
// REPLACE-SET wire input: userId + the FULL desired set of client ids. The
// handler diffs against the current set (add/remove), verifies the target user
// and EVERY clientId belong to the caller's tenant, and rejects the whole op if
// any is cross-tenant. An empty clientIds array clears all assignments.
// Consumed ONLY through the function-form inputValidator in assignments.ts
// (`.inputValidator((v) => schema.parse(v))`) — a raw schema silently skips
// validation (features/CLAUDE.md).

export const setUserClientAssignmentsSchema = z.object({
  userId: z.string().uuid(),
  clientIds: z.array(z.string().uuid()),
})

export const listAssignmentsInputSchema = z.object({ userId: z.string().uuid() })

// --- Inferred types -------------------------------------------------------

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CreateBonusInput = z.infer<typeof createBonusSchema>
export type UpdateBonusInput = z.infer<typeof updateBonusSchema>
export type ReorderBonusesInput = z.infer<typeof reorderBonusesSchema>
export type SetUserClientAssignmentsInput = z.infer<
  typeof setUserClientAssignmentsSchema
>
