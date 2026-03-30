import { createClient } from '@/lib/supabase/client'
import type { ShopProduct, ShopProductListItem } from './types'
import { toShopProduct, toShopProductListItem } from './types'

const LIST_FIELDS = 'id, title, slug, cover_image_url, listing_type, display_layout, price, currency, is_published, published_at, sort_order, category_id, short_description, created_at, updated_at' as const

export async function getShopProducts(): Promise<ShopProductListItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shop_products')
    .select(LIST_FIELDS)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toShopProductListItem)
}

export async function getShopProduct(id: string): Promise<ShopProduct> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shop_products')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Shop product not found')
  return toShopProduct(data)
}
