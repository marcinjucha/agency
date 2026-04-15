import { createClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

/**
 * Creates a Supabase client using the service_role key (bypasses RLS).
 *
 * WHY separate from server.ts: The server client uses cookie-based auth (user session)
 * via @supabase/ssr. The engine runs background writes with no user context —
 * it needs service_role to bypass RLS on workflow_executions and workflow_step_executions
 * (which have SELECT-only policies for authenticated users).
 *
 * Usage: workflow engine writes only. Never expose to client components.
 */
export function createServiceClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing VITE_SUPABASE_URL environment variable.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Required for workflow engine writes.'
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
