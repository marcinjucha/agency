import { createClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

/**
 * Anon (publishable-key) Supabase client for PUBLIC, unauthenticated server routes.
 *
 * WHY a 4th client (separate from client.ts / server-start.server.ts / service.ts):
 *   - client.ts            → browser client (TanStack Query fallback). Not for server routes.
 *   - server-start.server  → cookie-bound user session. A public endpoint has no cookie/session,
 *                            and it drags in @tanstack/start-server-core cookie plumbing we don't
 *                            want on a stateless public route.
 *   - service.ts           → service_role, BYPASSES RLS. Using it on a public endpoint would leak
 *                            unpublished campaigns AND the ungranted esp_* columns. NEVER for public reads.
 *
 * This client authenticates as the Postgres `anon` role via the publishable key, so RLS enforces
 * published-only rows and the column GRANT on so_campaigns hides internal esp_* columns
 * (see migration 20260705120000_create_venture_bonus_funnel.sql). No session is persisted —
 * it is stateless per request.
 *
 * Usage: public, unauthenticated server routes ONLY (e.g. GET /api/venture/campaigns/:slug).
 */
export function createAnonServerClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required for the anon server client.',
    )
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
