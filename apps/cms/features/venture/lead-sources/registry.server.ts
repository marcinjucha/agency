import type { Result } from 'neverthrow'
import type {
  LeadSourceId,
  MappedLead,
  VerifyInput,
  VerifyResult,
} from './types'

// ---------------------------------------------------------------------------
// Lead-source provider registry — mirrors features/venture/esp/registry.server.ts.
// Makes a campaign's lead source pluggable: Tally now, Google Forms / others
// later, with the ingest route unchanged.
// ---------------------------------------------------------------------------

/**
 * The lead-source provider contract. `verify` AND `parse` are BOTH required —
 * a provider cannot omit signature verification (type-enforced; there is no
 * optional-verify escape hatch).
 *
 * - `verify` is header-agnostic (reads its own header from `VerifyInput.headers`)
 *   and takes `rawBody + headers + secret` — NOT a `Request` — so a future
 *   pull/n8n transport can reuse it without an HTTP Request object.
 * - `parse` returns the provider-neutral `MappedLead`. Errors are a plain
 *   string (the route collapses every parse failure to a 400).
 *
 * Mirrors the `EspProvider` shape in features/venture/esp/types.ts.
 */
export interface LeadSourceProvider {
  id: LeadSourceId
  label: string
  verify(input: VerifyInput): VerifyResult
  parse(payload: unknown): Result<MappedLead, string>
}

// Partial<Record<LeadSourceId, ...>> — typed keys, not Record<string>.
// Mirrors esp/registry.server.ts.
const LEAD_SOURCE_REGISTRY: Partial<Record<LeadSourceId, LeadSourceProvider>> =
  {}

export function getLeadSource(id: LeadSourceId): LeadSourceProvider {
  const provider = LEAD_SOURCE_REGISTRY[id]
  if (!provider) throw new Error(`Lead source "${id}" not registered`)
  return provider
}

export function isLeadSourceRegistered(id: string): id is LeadSourceId {
  return id in LEAD_SOURCE_REGISTRY
}

/**
 * Safe provider resolution for the ingest route: maps a raw DB value
 * (`so_campaigns.lead_source_provider`) to a registered provider, or `null`
 * when there is nothing to ingest.
 *
 *   - null / undefined  → `null` (DRAFT campaign — no lead source selected)
 *   - unregistered id   → `null` (unknown provider — no enumeration oracle)
 *   - registered id     → the provider
 *
 * NEVER throws (unlike `getLeadSource`). This fixes the iter-1 LOW finding: the
 * route resolved the provider via `getLeadSource(...)` OUTSIDE its try/catch, so
 * an unknown id would throw unhandled. The route now maps `null` → uniform 401.
 * Post-iter-2 there is NO tally-fallback for resolution: a NULL/unknown provider
 * is a genuine draft (→ 401), NOT an implicit tally campaign.
 */
export function resolveLeadSource(
  value: string | null | undefined,
): LeadSourceProvider | null {
  if (!value || !isLeadSourceRegistered(value)) return null
  return LEAD_SOURCE_REGISTRY[value] ?? null
}

export function registerLeadSource(provider: LeadSourceProvider): void {
  LEAD_SOURCE_REGISTRY[provider.id] = provider
}
