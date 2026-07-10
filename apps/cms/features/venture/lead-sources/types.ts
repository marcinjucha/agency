// ---------------------------------------------------------------------------
// Venture bonus-funnel — lead-source provider abstraction (CLIENT-SAFE metadata).
//
// This file is deliberately import-free: NO node:crypto, NO Supabase, NO server
// imports. The campaign editor (iter 2) will import THIS file to render the
// lead-source picker, so it must be safe to bundle into the client. The
// server-only verify/parse logic lives in *.server.ts.
//
// Mirrors features/venture/esp/types.ts: an as-const id map → derived union +
// the shared data shapes every provider agrees on.
// ---------------------------------------------------------------------------

// Single source of truth for lead-source provider ids (as const → derived union,
// NOT a hand-maintained string union). Adding a provider = one entry here + one
// *.server.ts + one registry registration.
export const LEAD_SOURCE_IDS = {
  tally: 'tally',
} as const

export type LeadSourceId = (typeof LEAD_SOURCE_IDS)[keyof typeof LEAD_SOURCE_IDS]

/**
 * CLIENT-SAFE registry-membership guard. Narrows an arbitrary wire/DB string to
 * a registered `LeadSourceId` WITHOUT importing the server-only provider
 * registry (registry.server.ts) — the campaign editor (iter 2b) and the Zod
 * validation layer both need membership checking on the client bundle.
 *
 * Project rule: NEVER `z.enum` on a registry (it throws synchronously in the
 * inputValidator). Wire boundary uses `z.string().refine(isLeadSourceId)` and
 * discriminates on the id afterwards.
 */
export function isLeadSourceId(value: string): value is LeadSourceId {
  return Object.prototype.hasOwnProperty.call(LEAD_SOURCE_IDS, value)
}

/**
 * Flat lead shape every provider's `parse` returns — the provider-NEUTRAL
 * contract the ingest orchestrator consumes. Moved here from tally.ts so a
 * second provider (Google Forms, …) returns the identical shape.
 *
 * - `email` is optional (a lead with no email is still worth capturing;
 *   ESP-sync and the bonus email guard on null and skip).
 * - `submissionId` is always a non-empty string — it keys idempotency
 *   (DB UNIQUE(campaign_id, tally_submission_id)); a null would let a resend
 *   re-insert. Each provider's `parse` is responsible for rejecting a missing
 *   dedup id.
 */
export interface MappedLead {
  email: string | null
  name: string | null
  source: string | null
  consentLaunch: boolean
  submissionId: string
}

/**
 * Header-agnostic verify input. The provider reads ITS OWN header name from
 * `headers` internally (Tally → `Tally-Signature`; a future Google Forms
 * provider reads whatever it uses), so the contract never changes per provider.
 *
 * Deliberately NOT a `Request` — a future n8n / pull-based transport can
 * synthesize `rawBody` + `headers` + `secret` without an HTTP Request object.
 */
export interface VerifyInput {
  rawBody: string
  headers: Headers
  secret: string | null
}

/**
 * Provider-neutral verify result. `reason` is a generic string (NOT the
 * tally-specific literal union in tally-signature.server.ts) so a new
 * provider's rejection reasons never force a contract change — the route
 * collapses every invalid result to a uniform 401 regardless.
 */
export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: string }
