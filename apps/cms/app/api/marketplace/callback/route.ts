import { NextRequest, NextResponse } from 'next/server'
import {
  verifyOAuthState,
  getCallbackRedirectUri,
} from '@/lib/marketplace-oauth'
import { getMarketplaceAdapter } from '@/features/shop-marketplace/adapters/registry'
import { createServiceClient } from '@/lib/supabase/service'
import { routes } from '@/lib/routes'

/**
 * GET /api/marketplace/callback
 *
 * OAuth callback handler. Marketplace redirects here after user authorizes.
 * Verifies JWT state (CSRF), exchanges code for tokens, stores encrypted
 * credentials via PostgreSQL function, and redirects to settings page.
 *
 * All errors redirect to settings page with query param (browser redirect flow,
 * not JSON API).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const settingsUrl = new URL(
    routes.admin.shopMarketplace,
    request.nextUrl.origin
  )

  // Handle OAuth error from provider (e.g. user denied access)
  if (error) {
    settingsUrl.searchParams.set('error', 'oauth_denied')
    return NextResponse.redirect(settingsUrl.toString())
  }

  // Validate required params
  if (!code || !state) {
    settingsUrl.searchParams.set('error', 'missing_params')
    return NextResponse.redirect(settingsUrl.toString())
  }

  try {
    // Verify JWT state (CSRF protection + tenant/marketplace recovery)
    const stateData = await verifyOAuthState(state)

    // Exchange authorization code for tokens
    const redirectUri = getCallbackRedirectUri()
    const adapter = getMarketplaceAdapter(stateData.marketplace)
    const credentials = await adapter.exchangeCode(code, redirectUri)

    // Store encrypted tokens via PostgreSQL function (service role bypasses RLS)
    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any).rpc(
      'upsert_marketplace_connection',
      {
        p_tenant_id: stateData.tenantId,
        p_marketplace: stateData.marketplace,
        p_access_token: credentials.accessToken,
        p_refresh_token: credentials.refreshToken || null,
        p_token_expires_at: credentials.expiresAt?.toISOString() || null,
        p_account_id: null, // Populated by adapter in future iterations
        p_account_name: null,
        p_scopes: null,
        p_display_name: null,
      }
    )

    if (dbError) {
      console.error('[marketplace/callback] DB error:', dbError)
      settingsUrl.searchParams.set('error', 'storage_failed')
      return NextResponse.redirect(settingsUrl.toString())
    }

    settingsUrl.searchParams.set('connected', stateData.marketplace)
    return NextResponse.redirect(settingsUrl.toString())
  } catch (err) {
    console.error('[marketplace/callback] Error:', err)
    settingsUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(settingsUrl.toString())
  }
}
