'use server'

import { requireAuth } from '@/lib/auth'
import { messages } from '@/lib/messages'
import { getMarketplaceCredentials } from './adapters/credentials'
import { getMarketplaceAdapter } from './adapters/registry'
import type { MarketplaceId } from './types'
import type { MarketplaceCategory } from './adapters/types'

/**
 * Fetch categories from a marketplace adapter.
 *
 * Uses service role via getMarketplaceCredentials (decrypted OAuth tokens).
 * Separated from actions.ts because it has no mutation side-effects and
 * is called on-demand during publish flow (CategorySelector component).
 *
 * @param connectionId - UUID of the shop_marketplace_connections row
 * @param parentId - Optional parent category ID (fetches top-level if omitted)
 */
export async function getMarketplaceCategories(
  connectionId: string,
  parentId?: string
): Promise<{ success: boolean; data?: { categories: MarketplaceCategory[] }; error?: string }> {
  try {
    const auth = await requireAuth('shop.marketplace')
    if (!auth.success) return auth
    const { supabase, tenantId } = auth.data

    // Verify connection belongs to tenant before fetching credentials
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
    const { data: connection, error: connError } = await (supabase as any)
      .from('shop_marketplace_connections')
      .select('id, marketplace')
      .eq('id', connectionId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (connError || !connection) {
      return { success: false, error: messages.marketplace.connectionNotFound }
    }

    // Fetch decrypted credentials via service role (bypasses RLS, reads BYTEA tokens)
    const credentials = await getMarketplaceCredentials(connectionId)

    // Get the registered adapter for this marketplace
    const adapter = getMarketplaceAdapter(connection.marketplace as MarketplaceId)

    const categories = await adapter.getCategories(credentials, parentId)

    return { success: true, data: { categories } }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[marketplace-categories] fetch failed:', err)
    return { success: false, error: message }
  }
}
