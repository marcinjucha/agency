import { ok, err, type Result } from 'neverthrow'
// MappedLead now lives in the provider-neutral lead-sources contract so every
// lead source returns the identical shape. Re-exported below for existing
// `from './tally'` importers.
import type { MappedLead } from './lead-sources/types'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — Tally FORM_RESPONSE payload mapper (iter 3).
//
// PURE + framework-free (no crypto, no env, no Supabase) so it is unit-testable
// in isolation. The signature check lives in tally-signature.server.ts; the DB
// side-effects live in ingest.server.ts. This module only turns an opaque Tally
// payload into the flat lead shape the ingest orchestrator needs.
//
// Built against the REAL Tally payload
// (__tests__/fixtures/tally-webhook-sample.json), verified 2026-07-08:
//   { eventId, eventType: "FORM_RESPONSE", createdAt,
//     data: { submissionId, responseId, fields: [ { key, label, type, value, options? } ] } }
//
// Field keys are opaque hashes — match DEFENSIVELY by `type` first, then by
// label keyword. The mapper MUST tolerate every other Tally field type
// (CALCULATED_FIELDS, PAYMENT, MATRIX, FILE_UPLOAD, SIGNATURE, RATING, …) — it
// iterates and picks only the fields it needs, ignoring the rest.
//
// Only submissionId is REQUIRED (it keys idempotency). email is now OPTIONAL —
// user decided 2026-07-09: capturing the lead still has value even without an
// email to contact them; ESP-sync and the bonus email are already tolerant of
// missing dependencies (they skip, the lead is kept). The campaign is NO LONGER
// read from the body — the route resolves it from the URL slug ($slug) before
// this runs.
// ---------------------------------------------------------------------------

export interface TallyField {
  key?: string | null
  label?: string | null
  type?: string | null
  value?: unknown
  options?: Array<{ id: string; text: string }>
}

export interface TallyWebhookPayload {
  eventId?: string
  eventType?: string
  createdAt?: string
  data?: {
    submissionId?: string | null
    responseId?: string | null
    fields?: TallyField[]
  }
}

// MappedLead moved to ./lead-sources/types (provider-neutral contract).
// Re-exported so existing `import { MappedLead } from './tally'` consumers keep
// working without churn.
export type { MappedLead }

// Machine-facing reason codes (never surfaced to the caller verbatim — the route
// collapses every mapper failure to a 400 `bad_request`). Kept as a derived
// union from an `as const` map (project rule: no hand-maintained string unions).
export const TALLY_MAP_ERRORS = {
  badPayload: 'bad_payload',
  missingSubmissionId: 'missing_submission_id',
} as const
export type TallyMapError =
  (typeof TALLY_MAP_ERRORS)[keyof typeof TALLY_MAP_ERRORS]

// Hidden-field label for the optional attribution source. Marcin configures this
// as the `label` of a HIDDEN_FIELDS question in Kacper's Tally form.
const SOURCE_FIELD_LABEL = 'source'

// CONFIRMED 2026-07-09 by real Tally webhook payload: Marcin added the label
// "Zgoda RODO" to the single CHECKBOXES question in Kacper's form
// (question_qO9vR2). `labelOrKeyContains(f, 'zgoda')` below already matches
// this label via the main (non-fallback) path, so `CONSENT_FIELD_LABEL`
// itself does NOT need to change — it stays as a universal keyword match
// (works for an English "consent" label too), tested alongside 'zgoda'.
const CONSENT_FIELD_LABEL = 'consent'

const TYPE_EMAIL = 'INPUT_EMAIL'
const TYPE_TEXT = 'INPUT_TEXT'
const TYPE_HIDDEN = 'HIDDEN_FIELDS'
const TYPE_CHECKBOXES = 'CHECKBOXES'

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function typeIs(field: TallyField, type: string): boolean {
  return normalize(field.type) === normalize(type)
}

/** True when a field's configured label OR key contains the keyword. */
function labelOrKeyContains(field: TallyField, keyword: string): boolean {
  return normalize(field.label).includes(keyword) || normalize(field.key).includes(keyword)
}

/** True when a field's label OR key is EXACTLY the keyword. */
function labelOrKeyEquals(field: TallyField, keyword: string): boolean {
  return normalize(field.label) === keyword || normalize(field.key) === keyword
}

/** Coerce a Tally field value to a trimmed non-empty string, or null. */
function asString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Multi-selects arrive as arrays — take the first entry.
  if (Array.isArray(value)) {
    const first = value[0]
    return first == null ? null : String(first)
  }
  return null
}

function isFormResponse(payload: unknown): payload is TallyWebhookPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const candidate = payload as TallyWebhookPayload
  // Only FORM_RESPONSE carries the answer fields we map. Any other Tally event
  // (form edited/deleted, etc.) is rejected → route returns 400.
  if (candidate.eventType !== 'FORM_RESPONSE') return false
  const data = candidate.data
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as { fields?: unknown }).fields)
  )
}

function findEmailField(fields: TallyField[]): TallyField | undefined {
  // INPUT_EMAIL is the reliable signal. Fall back to a label keyword match only
  // if the form lacks an email-typed field entirely.
  return (
    fields.find((f) => typeIs(f, TYPE_EMAIL)) ??
    fields.find((f) => labelOrKeyContains(f, 'email'))
  )
}

/** Match a routing hidden field, preferring an exact label/key over a contains. */
function findHiddenField(
  fields: TallyField[],
  label: string,
): TallyField | undefined {
  const hidden = fields.filter((f) => typeIs(f, TYPE_HIDDEN))
  return (
    hidden.find((f) => labelOrKeyEquals(f, label)) ??
    hidden.find((f) => labelOrKeyContains(f, label)) ??
    // Tolerate Tally omitting the type on a hidden field.
    fields.find((f) => labelOrKeyEquals(f, label))
  )
}

/** Name is best-effort — restricted to INPUT_TEXT so it never grabs an
 *  unrelated field whose label happens to contain "name" (e.g. Payment (name)). */
function findNameField(fields: TallyField[]): TallyField | undefined {
  return fields.find(
    (f) =>
      typeIs(f, TYPE_TEXT) &&
      (labelOrKeyContains(f, 'name') ||
        labelOrKeyContains(f, 'imię') ||
        labelOrKeyContains(f, 'imie')),
  )
}

/**
 * The consent AGGREGATE row: a CHECKBOXES field whose value is the array of
 * selected option ids. Per-option boolean rows (`type: CHECKBOXES`, value
 * boolean) are intentionally excluded via the Array.isArray guard.
 *
 * Fallback safety: the "single CHECKBOXES aggregate" fallback is ONLY applied
 * when there is EXACTLY ONE aggregate candidate (campaign/source are
 * HIDDEN_FIELDS, never CHECKBOXES, so a single-aggregate form has no other
 * candidate). When there are 2+ aggregates and NONE match the label keyword,
 * we deliberately return undefined instead of guessing `aggregates[0]` — a
 * false-positive RODO consent (treating an unrelated checkbox as consent) is
 * worse than a false negative (treating an actual consent as not given).
 */
function findConsentAggregate(fields: TallyField[]): TallyField | undefined {
  const aggregates = fields.filter(
    (f) => typeIs(f, TYPE_CHECKBOXES) && Array.isArray(f.value),
  )
  const labelMatch = aggregates.find(
    (f) =>
      labelOrKeyContains(f, CONSENT_FIELD_LABEL) || labelOrKeyContains(f, 'zgoda'),
  )
  if (labelMatch) return labelMatch
  // Unambiguous fallback: exactly one candidate, safe to assume it's consent.
  return aggregates.length === 1 ? aggregates[0] : undefined
}

/**
 * Extract consent from the aggregate row + its per-option boolean rows.
 * Consent given when the aggregate selection array is non-empty OR any matching
 * per-option boolean row is true. Handles boolean / array / array-of-ids shapes.
 */
function extractConsent(fields: TallyField[]): boolean {
  const aggregate = findConsentAggregate(fields)
  if (!aggregate) return false

  const { value, key } = aggregate
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    if (value.length > 0) return true
    // Aggregate empty — defensively check the per-option boolean rows
    // (key = `${aggregateKey}_${optionId}`).
    const prefix = normalize(key)
    return prefix !== '' &&
      fields.some(
        (f) => normalize(f.key).startsWith(`${prefix}_`) && f.value === true,
      )
  }
  // Any other scalar shape → truthy check via string coercion.
  const scalar = asString(value)
  return scalar != null && scalar.toLowerCase() !== 'false' && scalar.toLowerCase() !== 'no'
}

/**
 * Map a raw Tally FORM_RESPONSE payload to the flat lead shape.
 * Returns err(TallyMapError) when the payload is unusable — the route collapses
 * any error to a 400 `bad_request`.
 */
export function mapTallyPayload(
  payload: unknown,
): Result<MappedLead, TallyMapError> {
  if (!isFormResponse(payload)) return err(TALLY_MAP_ERRORS.badPayload)

  const fields = payload.data?.fields ?? []

  // Optional — missing/unparseable email no longer blocks ingest (see file
  // header). null flows into MappedLead; downstream ESP-sync/email skip it.
  const email = asString(findEmailField(fields)?.value)

  // Idempotency dedup keys on submissionId; a missing/empty one would let a
  // resend re-insert (DB UNIQUE allows multiple NULLs) → reject as bad_request.
  const submissionId = asString(payload.data?.submissionId)
  if (!submissionId) return err(TALLY_MAP_ERRORS.missingSubmissionId)

  const source = asString(findHiddenField(fields, SOURCE_FIELD_LABEL)?.value)
  const name = asString(findNameField(fields)?.value)
  const consentLaunch = extractConsent(fields)

  return ok({ email, name, source, consentLaunch, submissionId })
}
