import type { Tables } from '@agency/database'

/**
 * Public-facing shop product — lighter than CMS ShopProduct.
 * No Tiptap JSON (use html_body for rendering).
 */
export type ShopProductPublic = Pick<
  Tables<'shop_products'>,
  | 'id'
  | 'title'
  | 'slug'
  | 'short_description'
  | 'html_body'
  | 'cover_image_url'
  | 'images'
  | 'listing_type'
  | 'display_layout'
  | 'price'
  | 'currency'
  | 'external_url'
  | 'tags'
  | 'category_id'
  | 'published_at'
>

export type ShopCategoryPublic = Pick<
  Tables<'shop_categories'>,
  | 'id'
  | 'name'
  | 'slug'
  | 'description'
>
