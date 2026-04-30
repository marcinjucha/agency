// =============================================================
// Canonical supabaseRequest helper for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for all Code nodes that need to talk to Supabase
// REST API. Inlined into Code node jsCode strings via:
//
//   npm run n8n:build -- regenerate-helpers
//   npm run n8n:build -- regenerate-helpers --target "n8n-workflows/workflows/Workflows/<file>.json"
//
// Code nodes opt in by including the inline markers:
//
//   // @inline supabase-request
//   <helper body — replaced by build tool>
//   // @end-inline supabase-request
//
// IMPORTANT: edit the helper here, never inline copies — they will
// be regenerated and your edits to the JSON will be overwritten.
// =============================================================
// Behavior:
//   - GET (default) — parses JSON, returns parsed value (or null if empty body)
//   - POST/PATCH/DELETE — same; PostgREST returns the row(s) when
//     Prefer: return=representation
//   - 4xx/5xx — rejects with detailed error
//   - Callers that don't need the result (e.g. Save Input Payload PATCH)
//     can simply ignore the resolved value
// =============================================================

async function supabaseRequest(path, method, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  return new Promise((resolve, reject) => {
    const match = url.match(/^https?:\/\/([^/]+)(\/.*)$/);
    if (!match) { reject(new Error('Invalid SUPABASE_URL')); return; }
    const options = {
      hostname: match[1],
      path: match[2],
      method: method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Supabase ${method || 'GET'} ${path} ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          reject(new Error(`Parse error for ${path}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined && body !== null) req.write(JSON.stringify(body));
    req.end();
  });
}
