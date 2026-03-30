import { createClient } from '@/lib/supabase/client'
import type { ShopCategory } from './types'

export async function getShopCategories(): Promise<ShopCategory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shop_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getShopCategory(id: string): Promise<ShopCategory> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shop_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Shop category not found')
  return data
}
