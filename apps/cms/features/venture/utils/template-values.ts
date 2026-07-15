/**
 * Coerce a free-form JSONB value into a flat string→string map, dropping any
 * non-string entry defensively (the `so_campaigns.template_variable_values`
 * column is free-form JSONB; only string scalars are meaningful substitution
 * values). Null / non-object / array → {}.
 *
 * Single source of truth for the per-campaign template-variable coercion shared
 * by the AUTHENTICATED admin/preview layer (`admin-handlers.server.ts`) AND the
 * SERVICE-role send path (`ingest.server.ts`). Lifted to this pure, import-free
 * util so the send path does not have to import the whole admin-handlers module
 * (which drags server-auth / permissions / messages into the ingest path).
 *
 * Pure + client-safe (no imports).
 */
export function coerceStringRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}
