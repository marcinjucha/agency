// =============================================================
// Canonical env+Supabase preamble for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for the boilerplate that opens any Code node
// talking to Supabase REST. Inlined via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Code nodes opt in by including the inline markers:
//
//   // @inline env-supabase-preamble
//   <helper body — replaced by build tool>
//   // @end-inline env-supabase-preamble
//
// Note: `$env` is n8n-specific (not process.env) — keep as-is.
// Several earlier copies used the shorter message
// "SUPABASE_URL not configured"; the canonical message is
// "SUPABASE_URL environment variable not configured".
// regenerate-helpers normalizes drifted copies.
// =============================================================

const https = require('https');

const SUPABASE_URL = $env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error('SUPABASE_URL environment variable not configured');
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;
