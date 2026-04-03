import { createClient } from '@/lib/supabase/client'
import type { MarketplaceConnection, MarketplaceListing, MarketplaceImport } from './types'
import { toMarketplaceConnection, toMarketplaceListing, toMarketplaceImport } from './types'

// EXCLUDE encrypted columns — never fetch tokens to the client
const CONNECTION_FIELDS = 'id, tenant_id, marketplace, display_name, is_active, token_expires_at, account_id, account_name, scopes, last_synced_at, created_at, updated_at' as const

export async function getMarketplaceConnections(): Promise<MarketplaceConnection[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_connections')
    .select(CONNECTION_FIELDS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toMarketplaceConnection)
}

export async function getMarketplaceConnection(id: string): Promise<MarketplaceConnection> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_connections')
    .select(CONNECTION_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Marketplace connection not found')
  return toMarketplaceConnection(data)
}

export async function getMarketplaceListings(productId: string): Promise<MarketplaceListing[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_listings')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toMarketplaceListing)
}

export async function getMarketplaceListingsByConnection(connectionId: string): Promise<MarketplaceListing[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_listings')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toMarketplaceListing)
}

/**
 * Batch fetch listings for multiple products at once.
 * Used in product list view to avoid N+1 per-card queries.
 */
export async function getMarketplaceListingsForProducts(productIds: string[]): Promise<MarketplaceListing[]> {
  if (productIds.length === 0) return []
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_listings')
    .select('id, product_id, connection_id, marketplace, status, last_sync_error')
    .in('product_id', productIds)

  if (error) throw error
  return (data || []).map(toMarketplaceListing)
}

export async function getMarketplaceImports(connectionId: string): Promise<MarketplaceImport[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_imports not in generated types
  const { data, error } = await (supabase as any)
    .from('shop_marketplace_imports')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toMarketplaceImport)
}
