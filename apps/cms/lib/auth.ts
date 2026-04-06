import { createClient } from '@/lib/supabase/server'
import { messages } from '@/lib/messages'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type AuthSuccess = { supabase: SupabaseServerClient; userId: string; tenantId: string }
export type AuthError = { error: string }

export type AuthResult = AuthSuccess | AuthError

export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result
}

/**
 * Authenticate current user and fetch their tenant_id.
 * Returns the supabase client so callers can reuse it for subsequent queries.
 * Consolidates the duplicated auth + tenant fetch pattern across action files.
 */
export async function getUserWithTenant(): Promise<AuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: messages.common.notLoggedIn }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData, error } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (error || !userData?.tenant_id) {
    return { error: messages.common.userNotFound }
  }

  return { supabase, userId: user.id, tenantId: userData.tenant_id }
}
