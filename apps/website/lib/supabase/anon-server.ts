import { createClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

/**
 * Creates a service role Supabase client for public form submissions
 *
 * SECURITY NOTE: Service role bypasses RLS, which is SAFE here because:
 * - Only used for public survey submissions (no sensitive data access)
 * - tenant_id is fetched from the survey (not user-provided)
 * - CMS queries still use RLS for multi-tenant isolation
 *
 * Use this for:
 * - Survey form submission (public, no auth required)
 *
 * DO NOT use this for:
 * - Reading data (use browser client with RLS)
 * - CMS operations (use createClient from server.ts)
 */
export function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    )
  }

  // Service role client bypasses RLS - safe for public submissions
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
