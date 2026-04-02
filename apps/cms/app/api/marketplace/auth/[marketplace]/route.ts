import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getMarketplaceAdapter,
  isMarketplaceRegistered,
} from '@/features/shop-marketplace/adapters/registry'
import {
  createOAuthState,
  getCallbackRedirectUri,
} from '@/lib/marketplace-oauth'
import { MARKETPLACE_LABELS } from '@/features/shop-marketplace/types'
import type { MarketplaceId } from '@/features/shop-marketplace/types'

const VALID_MARKETPLACES = Object.keys(MARKETPLACE_LABELS)

/**
 * GET /api/marketplace/auth/[marketplace]
 *
 * Initiates OAuth flow for a marketplace. Requires authenticated user session.
 * Generates a signed JWT state token (CSRF protection) and redirects to the
 * marketplace's authorization URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marketplace: string }> }
) {
  const { marketplace } = await params

  // Validate marketplace param
  if (!VALID_MARKETPLACES.includes(marketplace as MarketplaceId)) {
    return NextResponse.json({ error: 'Invalid marketplace' }, { status: 400 })
  }

  const marketplaceId = marketplace as MarketplaceId

  // Check adapter registered
  if (!isMarketplaceRegistered(marketplaceId)) {
    return NextResponse.json(
      { error: 'Marketplace not available' },
      { status: 404 }
    )
  }

  // Auth check — user must be logged in
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant ID from users table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
  }

  // Generate OAuth state + build redirect URL
  const state = await createOAuthState(userData.tenant_id, marketplaceId)
  const redirectUri = getCallbackRedirectUri()
  const adapter = getMarketplaceAdapter(marketplaceId)
  const authUrl = adapter.getAuthUrl(userData.tenant_id, redirectUri)

  // Append state to auth URL
  const url = new URL(authUrl)
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
