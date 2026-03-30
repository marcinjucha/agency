import type { Database, Tables, SeoMetadata } from '@agency/database'
import type { TiptapContent } from '../editor/types'

// --- Enums ---

export type ListingType = Database['public']['Enums']['listing_type']
export type DisplayLayout = 'gallery' | 'editorial'

// --- ShopProduct with typed JSONB fields ---

export type ShopProduct = Omit<Tables<'shop_products'>, 'description' | 'images' | 'seo_metadata'> & {
  description: TiptapContent | null
  images: string[] | null
  seo_metadata: SeoMetadata | null
}

// --- List view subset (avoids fetching full description/html_body) ---

export type ShopProductListItem = Pick<
  Tables<'shop_products'>,
  | 'id'
  | 'title'
  | 'slug'
  | 'cover_image_url'
  | 'listing_type'
  | 'display_layout'
  | 'price'
  | 'currency'
  | 'is_published'
  | 'published_at'
  | 'sort_order'
  | 'category_id'
  | 'short_description'
  | 'created_at'
  | 'updated_at'
>

// --- Cast helpers (Supabase returns JSONB as generic Json) ---

export function toShopProduct(raw: unknown): ShopProduct {
  const row = raw as Tables<'shop_products'>
  return {
    ...row,
    description: (row.description && typeof row.description === 'object'
      ? row.description
      : null) as unknown as TiptapContent | null,
    images: (Array.isArray(row.images) ? row.images : null) as string[] | null,
    seo_metadata: row.seo_metadata as unknown as SeoMetadata | null,
  }
}

export function toShopProductListItem(raw: unknown): ShopProductListItem {
  const row = raw as Tables<'shop_products'>
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    cover_image_url: row.cover_image_url,
    listing_type: row.listing_type,
    display_layout: row.display_layout,
    price: row.price,
    currency: row.currency,
    is_published: row.is_published,
    published_at: row.published_at,
    sort_order: row.sort_order,
    category_id: row.category_id,
    short_description: row.short_description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
