// =============================================================
// Canonical supabaseGet / supabasePatch helpers for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for the convenience CRUD wrappers around
// supabaseRequest(). Inlined into Code node jsCode strings via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Opt in via marker comments:
//
//   // @inline supabase-crud
//   <helper body — replaced by build tool>
//   // @end-inline supabase-crud
//
// DEPENDENCIES: this helper calls supabaseRequest(). The Code node
// MUST also have a `// @inline supabase-request` marker pair (and
// `// @inline env-supabase-preamble` for SUPABASE_URL / SUPABASE_KEY
// / https). Without supabaseRequest in scope these wrappers throw
// ReferenceError at runtime.
// =============================================================
// supabaseGet — overloaded:
//   1) supabaseGet(table, filterKey, filterValue, select?)
//        → convenience: single-row + limit=1, builds eq.${value}
//   2) supabaseGet(table, queryParams)
//        → generic: queryParams is an object/URLSearchParams-init
//          spelled exactly as PostgREST expects
//          (e.g. { is_active: 'eq.true', token_expires_at: 'lt.X' })
// Both forms throw on 4xx/5xx via supabaseRequest (no silent
// error-swallowing). Returns the parsed array of rows.
//
// supabasePatch — generic:
//   supabasePatch(path, body, opts?)
//     where path is the full PostgREST path including filters
//     (e.g. `shop_marketplace_listings?id=eq.${id}`),
//     opts.prefer optionally overrides the Prefer header
//     ('return=minimal' for write-and-forget — resolves with null,
//      'return=representation' for write-and-read — resolves with rows).
// Throws on 4xx/5xx.
// =============================================================

async function supabaseGet(table, filterOrParams, value, select) {
  let qs;
  if (typeof filterOrParams === 'string') {
    const p = new URLSearchParams();
    p.append(filterOrParams, `eq.${value}`);
    if (select) p.append('select', select);
    p.append('limit', '1');
    qs = p.toString();
  } else {
    qs = new URLSearchParams(filterOrParams).toString();
  }
  return supabaseRequest(`${table}?${qs}`, 'GET');
}

async function supabasePatch(path, body, opts) {
  return supabaseRequest(path, 'PATCH', body, opts);
}
