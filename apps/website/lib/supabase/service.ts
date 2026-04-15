import { createClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

/**
 * Service role client for server-only use. Call ONLY inside createServerFn.
 *
 * SECURITY NOTE: Service role bypasses RLS. Safe here because website only:
 * - Reads public data (RLS on is_published + anon-accessible tables)
 * - Writes anonymous survey submissions (tenant_id sourced from survey, not user input)
 *
 * NEVER expose to client components. NEVER use VITE_ prefix for the key.
 * SUPABASE_SERVICE_ROLE_KEY is sourced from process.env (server-only).
 */
export function createServiceClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
