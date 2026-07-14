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
