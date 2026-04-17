import { createServerFn } from '@tanstack/react-start'
import { createAnonClient } from '@/lib/supabase/anon-server'

export type NavProduct = {
  id: string
  title: string
  slug: string
}

export const getNavProductsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<NavProduct[]> => {
    const tenantId = process.env.TENANT_ID
    if (!tenantId) throw new Error('Missing TENANT_ID environment variable')
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .from('shop_products')
      .select('id, title, slug')
      .eq('tenant_id', tenantId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as NavProduct[]
  }
)
