import { createAnonClient } from '@/lib/supabase/anon-server'
import type { ShopProductPublic, ShopCategoryPublic } from './types'

function getTenantId(): string {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    throw new Error('Missing TENANT_ID environment variable')
  }
  return tenantId
}

const PRODUCT_SELECT = `
  id, title, slug, short_description, html_body,
  cover_image_url, images, listing_type, display_layout,
  price, currency, external_url, tags, category_id, published_at,
  is_featured, seo_metadata
` as const

/**
 * Get all published products for this tenant.
 * Optionally filter by category slug.
 */
export async function getPublishedProducts(
  categorySlug?: string
): Promise<ShopProductPublic[]> {
  const tenantId = getTenantId()
  const supabase = createAnonClient()

  let query = supabase
    .from('shop_products')
    .select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })

  if (categorySlug) {
    const { data: category } = await supabase
      .from('shop_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', categorySlug)
      .single()

    if (!category) return []
    query = query.eq('category_id', category.id)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ShopProductPublic[]
}

/**
 * Get featured published products for homepage/highlights.
 * Limited to 8 items, sorted by sort_order.
 */
export async function getFeaturedProducts(): Promise<ShopProductPublic[]> {
  const tenantId = getTenantId()
  const supabase = createAnonClient()

  const { data, error } = await supabase
    .from('shop_products')
    .select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(8)

  if (error) throw error
  return (data ?? []) as unknown as ShopProductPublic[]
}

/**
 * Get a single published product by slug.
 */
export async function getProductBySlug(
  slug: string
): Promise<ShopProductPublic | null> {
  const tenantId = getTenantId()
  const supabase = createAnonClient()

  const { data, error } = await supabase
    .from('shop_products')
    .select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('is_published', true)
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as unknown as ShopProductPublic
}

/**
 * Get all published product slugs — for sitemap.
 */
export async function getProductSlugs(): Promise<string[]> {
  const tenantId = getTenantId()
  const supabase = createAnonClient()

  const { data, error } = await supabase
    .from('shop_products')
    .select('slug')
    .eq('tenant_id', tenantId)
    .eq('is_published', true)

  if (error) throw error
  return (data ?? []).map((p) => p.slug)
}

/**
 * Get all categories for this tenant.
 */
export async function getCategories(): Promise<ShopCategoryPublic[]> {
  const tenantId = getTenantId()
  const supabase = createAnonClient()

  const { data, error } = await supabase
    .from('shop_categories')
    .select('id, name, slug, description')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as ShopCategoryPublic[]
}
