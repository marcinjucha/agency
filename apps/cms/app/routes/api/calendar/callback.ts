import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/start-server-core'
import { handleCallback, revokeAccess } from '@/features/calendar/oauth'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { createStartClient } from '@/lib/supabase/server-start'

// ---------------------------------------------------------------------------
// Server function: processes the OAuth callback and returns a redirect path
// ---------------------------------------------------------------------------

const processCalendarCallback = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Step 1: Check for errors from Google
    if (error) {
      const description = errorDescription || 'Unknown error'
      console.error('Google OAuth error:', error, description)
      return `${routes.admin.settings}?error=Google+OAuth+failed:+${encodeURIComponent(description)}`
    }

    // Step 2: Validate authorization code
    if (!code) {
      console.error('No authorization code returned from Google')
      return `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthNoCode)}`
    }

    // Step 3: Verify CSRF state from cookie
    if (!state) {
      console.error('No state parameter returned from Google')
      return `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthInvalidState)}`
    }

    const cookieHeader = request.headers.get('cookie') || ''
    const storedState = parseCookie(cookieHeader, 'google_oauth_state')

    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attack')
      return `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthInvalidState)}`
    }

    // Step 4: Get authenticated user + tenant
    const supabase = createStartClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return `${routes.login}?error=${encodeURIComponent(messages.calendar.oauthSessionExpired)}`
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      console.error('Failed to fetch user tenant_id:', userError)
      return `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthTenantFailed)}`
    }

    // Step 5: Exchange authorization code for tokens
    let tokenData
    try {
      tokenData = await handleCallback(code)
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError)
      return `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthTokenFailed)}`
    }

    // Step 6: Save tokens via RPC
    const credentialsJson = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date,
      scope: tokenData.scope,
      email: tokenData.email,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase as any).rpc(
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
      if (tokenData.refresh_token) {
        await revokeAccess(tokenData.refresh_token)
      }
      return `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthSaveFailed)}`
    }

    // TODO: Clear google_oauth_state cookie (Set-Cookie header not available in createServerFn)
    // The state cookie is single-use — Google won't reuse the same state value.
    // Cookie cleanup can be handled via middleware or ignored (cookie expires naturally).

    return `${routes.admin.settings}?success=Google+Calendar+connected+successfully`
  }
)

// ---------------------------------------------------------------------------
// Route: /api/calendar/callback — loader runs server-side, redirects to result
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/api/calendar/callback')({
  loader: async () => {
    const redirectPath = await processCalendarCallback()
    throw redirect({ to: redirectPath as string })
  },
  component: () => null, // Never renders — loader always redirects
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}
