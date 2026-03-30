import { createClient } from '@/lib/supabase/server'
import type { ShopCategory } from './types'

/** Server-side query for use in Server Components (route pages) */
export async function getShopCategoriesServer(): Promise<ShopCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shop_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/** Server-side query for use in Server Components (route pages) */
export async function getShopCategoryServer(id: string): Promise<ShopCategory | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shop_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return data
}
