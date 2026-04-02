import { createServiceClient } from '@/lib/supabase/service'
import type { MarketplaceCredentials } from './types'

/**
 * Fetches decrypted marketplace credentials via service role (bypasses RLS).
 * Only used server-side by adapter methods that need to call external APIs.
 */
export async function getMarketplaceCredentials(
  connectionId: string
): Promise<MarketplaceCredentials & { marketplace: string }> {
  const supabase = createServiceClient()

  // Read from decrypted view (service_role bypasses RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections_decrypted not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_connections_decrypted')
    .select('access_token, refresh_token, token_expires_at, marketplace')
    .eq('id', connectionId)
    .single()

  if (error || !data) throw new Error('Connection not found')

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresAt: data.token_expires_at
      ? new Date(data.token_expires_at)
      : undefined,
    marketplace: data.marketplace,
  }
}

export function isTokenExpired(credentials: MarketplaceCredentials): boolean {
  if (!credentials.expiresAt) return false
  // 1 min buffer before actual expiry
  return credentials.expiresAt.getTime() < Date.now() + 60_000
}
