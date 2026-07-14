import { okAsync, type ResultAsync } from 'neverthrow'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — the single decision point for WHICH `venture_bonus`
// template a campaign send uses (Phase 4, increment 1).
//
// INV-4 (one-rule): the choice is exactly ONE precedence rule, documented and
// unit-tested in ONE place instead of being re-derived at call sites — the
// campaign's explicitly-assigned template wins; otherwise the tenant's DEFAULT
// template; otherwise none.
//
// INV-1 (no-drop): `null` is a valid, safe outcome — the caller (sendBonusEmail
// / fetchBonusTemplate) then renders the hardcoded builder and NEVER drops a
// lead. This function only expresses the precedence; it does not read the DB.
// ---------------------------------------------------------------------------

/**
 * Resolve which `venture_bonus` template id a campaign send should use.
 *
 * Precedence (INV-4): campaign-assigned → tenant default → none. Returning
 * `null` is the deliberate no-template signal (INV-1 no-drop): the caller falls
 * back to the hardcoded builder.
 *
 * `fetchBonusTemplate` (ingest.server.ts) implements this same precedence as a
 * short-circuiting tiered DB read (by-id first, default second) because the
 * default's id is not known until queried — this pure function is the canonical
 * statement of the rule the tiered read must honour.
 */
export function resolveVentureBonusTemplateId(
  campaignTemplateId: string | null,
  defaultTemplateId: string | null,
): string | null {
  return campaignTemplateId ?? defaultTemplateId ?? null
}

// ---------------------------------------------------------------------------
// SHARED tiered-precedence MECHANISM (INV-4 drift fix).
//
// The by-id → default → null precedence used to be re-implemented independently
// by the SEND path (ingest.server.ts `fetchBonusTemplate`, service-role readers)
// and the effective-send CARD (admin-handlers.server.ts
// `resolveEffectiveVentureTemplate`, authed `tbl(auth)` readers) — a parallel
// copy that could drift so the card names a template the send would skip. This
// is the ONE definition both now call.
//
// Generic over the row type `T` and error type `E`: each caller supplies readers
// that already encode their OWN tenant-scope (F3/F5), blocks-usability degrade,
// and never-throw semantics. This function owns ONLY the precedence sequencing.
//
// LAZY short-circuit: `readDefault` runs ONLY when `readById` yields nothing, so
// the send path never issues the default read when an explicit assignment
// resolves (the card supplies a NO-QUERY cached default reader — see [7]).
// ---------------------------------------------------------------------------

/**
 * Apply the venture_bonus tiered precedence: the explicitly-assigned template
 * (by id, usable) wins, else the tenant DEFAULT (usable), else null. Each reader
 * returns the usable row or null; a null from `readById` triggers `readDefault`.
 */
export function resolveBonusTemplateByPrecedence<T, E>(
  readById: () => ResultAsync<T | null, E>,
  readDefault: () => ResultAsync<T | null, E>,
): ResultAsync<T | null, E> {
  return readById().andThen((byId) =>
    byId ? okAsync<T | null, E>(byId) : readDefault(),
  )
}
