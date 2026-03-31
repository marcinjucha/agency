import { createClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

/**
 * Creates a true anonymous Supabase client for public shop pages.
 *
 * Uses NEXT_PUBLIC_ env vars (publishable anon key, NOT service_role).
 * All queries MUST filter by tenant_id + is_published to ensure
 * only this tenant's published products are visible.
 *
 * Safe for ISR/SSG — no cookies, no auth context.
 */
export function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
