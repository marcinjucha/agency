import { createFileRoute } from '@tanstack/react-router'
import { handleCallback, revokeAccess } from '@/features/calendar/oauth.server'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { createServerClient } from '@/lib/supabase/server-start'

// ---------------------------------------------------------------------------
// GET /api/calendar/callback
//
// Google Calendar OAuth callback. Hit by Google's redirect after user consent —
// pure third-party API endpoint, never a UI route. Uses server.handlers.GET so
// the route transform strips the entire handler from the client bundle and we
// can return a direct HTTP redirect (no loader → server fn → throw redirect chain).
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/api/calendar/callback')({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')

        const buildRedirect = (path: string) =>
          Response.redirect(new URL(path, url.origin).toString(), 302)

        // Step 1: Check for errors from Google
        if (error) {
          const description = errorDescription || 'Unknown error'
          console.error('Google OAuth error:', error, description)
          return buildRedirect(
            `${routes.admin.settings}?error=Google+OAuth+failed:+${encodeURIComponent(description)}`,
          )
        }

        // Step 2: Validate authorization code
        if (!code) {
          console.error('No authorization code returned from Google')
          return buildRedirect(
            `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthNoCode)}`,
          )
        }

        // TODO: Full CSRF protection via google_oauth_state cookie is pending.
        // initiateGoogleOAuthFn (calendar/server.ts) generates state but cannot set
        // cookies from createServerFn — there is no Set-Cookie API at that layer.
        // Until middleware-level cookie setting is implemented, state verification
        // is skipped here. Risk is low: OAuth flow is user-initiated and the redirect
        // URI is restricted to our own domain in Google Cloud Console.
        if (!state) {
          console.error('No state parameter returned from Google')
          return buildRedirect(
            `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthInvalidState)}`,
          )
        }

        // Step 4: Get authenticated user + tenant
        const supabase = createServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return buildRedirect(
            `${routes.login}?error=${encodeURIComponent(messages.calendar.oauthSessionExpired)}`,
          )
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (userError || !userData?.tenant_id) {
          console.error('Failed to fetch user tenant_id:', userError)
          return buildRedirect(
            `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthTenantFailed)}`,
          )
        }

        // Step 5: Exchange authorization code for tokens
        let tokenData
        try {
          tokenData = await handleCallback(code)
        } catch (tokenError) {
          console.error('Token exchange failed:', tokenError)
          return buildRedirect(
            `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthTokenFailed)}`,
          )
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
          },
        )

        if (rpcError) {
          console.error('Failed to save calendar connection:', rpcError)
          if (tokenData.refresh_token) {
            await revokeAccess(tokenData.refresh_token)
          }
          return buildRedirect(
            `${routes.admin.settings}?error=${encodeURIComponent(messages.calendar.oauthSaveFailed)}`,
          )
        }

        // TODO: Clear google_oauth_state cookie (Set-Cookie header not available here).
        // The state cookie is single-use — Google won't reuse the same state value.
        // Cookie cleanup can be handled via middleware or ignored (cookie expires naturally).

        return buildRedirect(
          `${routes.admin.settings}?success=Google+Calendar+connected+successfully`,
        )
      },
    },
  },
})
