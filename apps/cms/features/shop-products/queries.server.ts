import { createServerClient } from '@/lib/supabase/server-start'
import type { ShopProduct, ShopProductListItem } from './types'
import { toShopProduct, toShopProductListItem } from './types'

const LIST_FIELDS = 'id, title, slug, cover_image_url, listing_type, display_layout, price, currency, is_published, published_at, sort_order, category_id, short_description, created_at, updated_at' as const

/** Server-side query for use in Server Components (route pages) */
export async function getShopProductsServer(): Promise<ShopProductListItem[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('shop_products')
    .select(LIST_FIELDS)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toShopProductListItem)
}

/** Server-side query for use in Server Components (route pages) */
export async function getShopProductServer(id: string): Promise<ShopProduct | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('shop_products')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toShopProduct(data)
}
