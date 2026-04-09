import { createClient } from '@/lib/supabase/server'
import { handleCallback, revokeAccess } from '@/features/calendar/oauth'
import { cookies } from 'next/headers'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'

type CallbackResult =
  | { success: true; redirectPath: string }
  | { success: false; redirectPath: string }

interface CallbackParams {
  code: string | null
  state: string | null
  error: string | null
  errorDescription: string | null
}

/**
 * Core OAuth callback logic: validates params, verifies CSRF state,
 * exchanges code for tokens, saves to calendar_connections via RPC.
 *
 * Route handler owns HTTP concerns (parsing query params, building redirect URL).
 * This function owns business logic and returns a redirect path.
 */
export async function processOAuthCallback(
  params: CallbackParams
): Promise<CallbackResult> {
  const { code, state, error, errorDescription } = params

  // Step 1: Check for errors from Google (user denied access, etc)
  if (error) {
    const description = errorDescription || 'Unknown error'
    console.error('Google OAuth error:', error, description)
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=Google+OAuth+failed:+${encodeURIComponent(description)}`,
    }
  }

  // Step 2: Validate authorization code
  if (!code) {
    console.error('No authorization code returned from Google')
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthNoCode)}`,
    }
  }

  // Step 3: Verify state parameter (CSRF protection)
  if (!state) {
    console.error('No state parameter returned from Google')
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthInvalidState)}`,
    }
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value

  if (!storedState || storedState !== state) {
    console.error('State mismatch - possible CSRF attack')
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthInvalidState)}`,
    }
  }

  // Step 4: Get authenticated user + tenant
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      redirectPath: `${routes.login}?error=${encodeURIComponent(messages.calendar.oauthSessionExpired)}`,
    }
  }

  // Fetch tenant_id for the user (needed for upsert_calendar_connection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData, error: userError } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.tenant_id) {
    console.error('Failed to fetch user tenant_id:', userError)
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthTenantFailed)}`,
    }
  }

  // Step 5: Exchange authorization code for tokens
  let tokenData
  try {
    tokenData = await handleCallback(code)
  } catch (tokenError) {
    console.error('Token exchange failed:', tokenError)
    return {
      success: false,
      redirectPath: `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthTokenFailed)}`,
    }
  }

  // Step 6: Save tokens to calendar_connections via upsert_calendar_connection RPC
  const credentialsJson = JSON.stringify({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
    scope: tokenData.scope,
    email: tokenData.email,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connectionId, error: rpcError } = await (supabase as any).rpc(
    'upsert_calendar_connection',
    {
      p_tenant_id: userData.tenant_id,
      p_user_id: user.id,
      p_provider: 'google',
      p_display_name: tokenData.email
        ? `Google Calendar (${tokenData.email})`
        : 'Google Calendar',
      p_credentials_json: credentialsJson,
      p_calendar_url: null,
      p_account_identifier: tokenData.email ?? null,
      p_is_default: false,
    }
  )

  if (rpcError) {
    console.error('Failed to save calendar connection:', rpcError)
    // Try to revoke access since we couldn't save tokens
    if (tokenData.refresh_token) {
      await revokeAccess(tokenData.refresh_token)
    }
    return {
      success: false,
      redirectPath:
        `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthSaveFailed)}`,
    }
  }

  // Step 7: Clear state cookie
  cookieStore.delete('google_oauth_state')

  return {
    success: true,
    redirectPath:
      `${routes.admin.settings}?success=Google+Calendar+connected+successfully`,
  }
}
