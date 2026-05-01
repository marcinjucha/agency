import { createFileRoute } from '@tanstack/react-router'
import {
  getMarketplaceAdapter,
  isMarketplaceRegistered,
} from '@/features/shop-marketplace/adapters/registry.server'
import { createServerClient } from '@/lib/supabase/server-start'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import type { MarketplaceId } from '@/features/shop-marketplace/types'

// ---------------------------------------------------------------------------
// GET /api/marketplace/$marketplace/callback
//
// OAuth callback for marketplace integrations (OLX, Allegro). Hit by the
// third-party provider's redirect after user consent — pure API endpoint,
// never a UI route. Uses server.handlers.GET so the route transform strips
// the handler from the client bundle and returns a direct HTTP redirect.
//
// `$marketplace` route param is parsed from the request URL pathname to keep
// the handler self-contained (no reliance on TanStack Start params propagation
// into server handlers).
// ---------------------------------------------------------------------------

const MARKETPLACE_PATH_REGEX = /^\/api\/marketplace\/([^/]+)\/callback\/?$/

export const Route = createFileRoute('/api/marketplace/$marketplace/callback')({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)

        const buildRedirect = (path: string) =>
          Response.redirect(new URL(path, url.origin).toString(), 302)

        const errorRedirect = () =>
          buildRedirect(
            `${routes.admin.shopMarketplace}?error=${encodeURIComponent(messages.marketplace.oauthFailed)}`,
          )

        // Parse $marketplace from URL pathname (server.handlers does not surface
        // route params directly; URL-derived parsing is the safe approach)
        const pathMatch = url.pathname.match(MARKETPLACE_PATH_REGEX)
        const marketplace = pathMatch?.[1] ?? ''

        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        // Step 1: Check for errors from marketplace provider
        if (error) {
          console.error('[marketplace] OAuth error from provider:', error)
          const isDenied = error === 'access_denied'
          const errorMsg = isDenied
            ? messages.marketplace.oauthDenied
            : messages.marketplace.oauthFailed
          return buildRedirect(
            `${routes.admin.shopMarketplace}?error=${encodeURIComponent(errorMsg)}`,
          )
        }

        // Step 2: Validate marketplace param
        if (!marketplace || !isMarketplaceRegistered(marketplace as MarketplaceId)) {
          console.error('[marketplace] Unknown or unregistered marketplace:', marketplace)
          return errorRedirect()
        }

        // Step 3: Validate authorization code
        if (!code) {
          console.error('[marketplace] No authorization code returned from provider')
          return errorRedirect()
        }

        // Step 4: State validation
        // TODO: Validate OAuth state param against session-stored value (CSRF protection).
        // Full implementation requires cookie-based state storage during OAuth initiation
        // (when /api/marketplace/auth/$marketplace is implemented). Deferred until then.
        if (!state) {
          console.error('[marketplace] No state parameter returned from provider')
          return errorRedirect()
        }

        // Step 5: Get authenticated user + tenant
        const supabase = createServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return buildRedirect(
            `${routes.login}?error=${encodeURIComponent(messages.marketplace.oauthFailed)}`,
          )
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (userError || !userData?.tenant_id) {
          console.error('[marketplace] Failed to fetch user tenant_id:', userError)
          return errorRedirect()
        }

        // Step 6: Exchange authorization code for tokens
        const adapter = getMarketplaceAdapter(marketplace as MarketplaceId)
        const redirectUri = `${url.origin}/api/marketplace/${marketplace}/callback`

        let credentials
        try {
          credentials = await adapter.exchangeCode(code, redirectUri)
        } catch (tokenError) {
          console.error('[marketplace] Token exchange failed:', tokenError)
          return errorRedirect()
        }

        // Step 7: Save connection to Supabase
        // Tokens are stored in encrypted columns (pgp_sym_encrypt via DB trigger/view).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
        const { error: upsertError } = await (supabase as any)
          .from('shop_marketplace_connections')
          .upsert(
            {
              tenant_id: userData.tenant_id,
              marketplace,
              display_name: adapter.name,
              is_active: true,
              access_token_encrypted: credentials.accessToken,
              refresh_token_encrypted: credentials.refreshToken ?? null,
              token_expires_at: credentials.expiresAt?.toISOString() ?? null,
            },
            { onConflict: 'tenant_id,marketplace', ignoreDuplicates: false },
          )

        if (upsertError) {
          console.error('[marketplace] Failed to save connection:', upsertError)
          return errorRedirect()
        }

        return buildRedirect(`${routes.admin.shopMarketplace}?connected=true`)
      },
    },
  },
})
