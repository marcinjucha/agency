import type { SeoMetadata } from '@agency/database'

export type { SeoMetadata } from '@agency/database'

/** Full blog post for article detail view */
export type WebsiteBlogPost = {
  slug: string
  title: string
  excerpt: string | null
  html_body: string | null
  cover_image_url: string | null
  category: string | null
  author_name: string | null
  published_at: string | null
  updated_at: string | null
  estimated_reading_time: number | null
  seo_metadata: SeoMetadata | null
}

/** Lightweight blog post for listing pages */
export type WebsiteBlogListItem = {
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  category: string | null
  author_name: string | null
  published_at: string | null
  estimated_reading_time: number | null
}
