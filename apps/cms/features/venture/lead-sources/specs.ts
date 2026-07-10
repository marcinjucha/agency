import { z } from 'zod'
import { LEAD_SOURCE_IDS, isLeadSourceId, type LeadSourceId } from './types'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — lead-source provider CONFIG specs (CLIENT-SAFE).
//
// Deliberately import-free of server code: only `zod` + the client-safe id map
// in ./types. The campaign editor (iter 2b) imports THIS file to render the
// per-provider config form AND the publish-gate hint; the admin handlers import
// it to enforce the publish gate + sanitize the non-secret JSONB config
// server-side. It must therefore stay safe to bundle into the client — NO
// node:crypto, NO Supabase, NO *.server import.
//
// STORAGE SPLIT (critical): a config field's `type` decides WHERE its value
// persists.
//   - `type: 'secret'`  → the DEDICATED column (Tally → so_campaigns
//                         .tally_webhook_secret). NEVER into lead_source_config.
//   - `type: 'text'`    → so_campaigns.lead_source_config (JSONB, non-secret).
// `configSchema` validates ONLY the non-secret JSONB shape (secret fields are
// excluded — they live in their own column and are never round-tripped here).
// ---------------------------------------------------------------------------

/**
 * A single config input for a lead-source provider. `labelKey` is a dotted
 * `messages` bridge key (resolved by the editor via lib/messages) — not raw
 * copy, so the descriptor stays i18n-friendly and free of app imports.
 */
export interface LeadSourceConfigField {
  key: string
  /** `secret` → dedicated column; `text` → lead_source_config JSONB. */
  type: 'secret' | 'text'
  required: boolean
  labelKey: string
}

/**
 * Everything the UI + validation need for one provider, WITHOUT the server-only
 * verify/parse logic (that lives in the LeadSourceProvider registry). Mirrors
 * the split between esp/types.ts (client-safe) and esp/*.server.ts.
 */
export interface LeadSourceSpec {
  id: LeadSourceId
  /** Dotted `messages` bridge key for the provider's display name. */
  labelKey: string
  configFields: LeadSourceConfigField[]
  /**
   * Validates the NON-SECRET config persisted to lead_source_config (JSONB).
   * Unknown keys are stripped (default Zod object behavior) so a secret can
   * never survive into the JSONB column even if a caller crams it in.
   */
  configSchema: z.ZodTypeAny
}

// Tally has exactly one required config value — its webhook signing secret —
// and that value is a `secret` → it persists to so_campaigns.tally_webhook_secret,
// NOT into lead_source_config. Hence NO non-secret fields today → empty object
// schema (strips anything sent). A future provider with non-secret settings
// (e.g. a Google Forms form id) adds a `type:'text'` field here + a matching key
// in configSchema.
const tallySpec: LeadSourceSpec = {
  id: LEAD_SOURCE_IDS.tally,
  labelKey: 'venture.leadSourceTallyLabel',
  configFields: [
    {
      key: 'secret',
      type: 'secret',
      required: true,
      labelKey: 'venture.tallySecretLabel',
    },
  ],
  configSchema: z.object({}),
}

// Full typed map — every LeadSourceId MUST have a spec (compile-time exhaustive
// via Record<LeadSourceId, ...>, NOT Record<string>). Adding a provider = one
// entry here alongside the ./types id + the *.server provider.
const LEAD_SOURCE_SPECS: Record<LeadSourceId, LeadSourceSpec> = {
  tally: tallySpec,
}

export function getLeadSourceSpec(id: LeadSourceId): LeadSourceSpec {
  return LEAD_SOURCE_SPECS[id]
}

/**
 * CLIENT-SAFE spec resolution for an arbitrary DB/wire value. Returns `null`
 * for a null/absent value (draft — no provider selected) OR an unregistered
 * id. Never throws (unlike the server registry's `getLeadSource`) — used by the
 * publish gate + editor where "no/unknown provider" is a valid state, not an
 * error.
 */
export function resolveLeadSourceSpec(
  value: string | null | undefined,
): LeadSourceSpec | null {
  if (!value || !isLeadSourceId(value)) return null
  return LEAD_SOURCE_SPECS[value]
}

/** Current config state a provider's PUBLISH requirements are checked against. */
export interface PublishConfigState {
  /** The dedicated secret column is set (e.g. so_campaigns.has_webhook_secret). */
  hasSecret: boolean
  /** The non-secret JSONB config (lead_source_config). */
  config: Record<string, unknown>
}

/**
 * True when every REQUIRED config field for the provider is satisfied:
 *   - a required `secret` field → the dedicated secret column must be set
 *   - a required `text` field   → its key must be present + non-empty in JSONB
 * Drives the server-side publish gate AND the editor's publish-button enablement.
 */
export function isPublishConfigSatisfied(
  spec: LeadSourceSpec,
  state: PublishConfigState,
): boolean {
  for (const field of spec.configFields) {
    if (!field.required) continue
    if (field.type === 'secret') {
      if (!state.hasSecret) return false
    } else {
      const value = state.config[field.key]
      if (value === undefined || value === null || value === '') return false
    }
  }
  return true
}

export interface PublishGateInput {
  provider: string | null | undefined
  hasSecret: boolean
  config: Record<string, unknown>
}

export type PublishGateResult =
  | { ok: true }
  | { ok: false; reason: 'no_provider' | 'incomplete_config' }

/**
 * The PUBLISH gate: a campaign may go `published=true` ONLY when a provider is
 * selected AND its required config is satisfied. Pure + client-safe so the
 * editor (2b) can gate the button and the server can enforce it — single source
 * of truth for the rule.
 */
export function evaluatePublishGate(input: PublishGateInput): PublishGateResult {
  const spec = resolveLeadSourceSpec(input.provider)
  if (!spec) return { ok: false, reason: 'no_provider' }
  if (
    !isPublishConfigSatisfied(spec, {
      hasSecret: input.hasSecret,
      config: input.config,
    })
  ) {
    return { ok: false, reason: 'incomplete_config' }
  }
  return { ok: true }
}

/**
 * Strip a raw config object down to the provider's non-secret shape before it is
 * written to lead_source_config (JSONB). Unknown keys (including any smuggled
 * `secret`) are dropped by the provider's `configSchema`. A null/unknown
 * provider → `{}` (draft campaigns store an empty non-secret config). Applied at
 * the DB-write boundary in the admin handlers.
 */
export function sanitizeLeadSourceConfig(
  provider: string | null | undefined,
  config: unknown,
): Record<string, unknown> {
  const spec = resolveLeadSourceSpec(provider)
  if (!spec) return {}
  const parsed = spec.configSchema.safeParse(config ?? {})
  return parsed.success ? (parsed.data as Record<string, unknown>) : {}
}
