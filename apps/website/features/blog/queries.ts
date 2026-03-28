import { createAnonClient } from '@/lib/supabase/anon-server'
import type { WebsiteBlogPost, WebsiteBlogListItem, SeoMetadata } from './types'

const LIST_FIELDS = 'slug, title, excerpt, cover_image_url, category, author_name, published_at, estimated_reading_time' as const

const POST_FIELDS = `${LIST_FIELDS}, html_body, seo_metadata, updated_at` as const

function toBlogPost(raw: Record<string, unknown>): WebsiteBlogPost {
  return {
    slug: raw.slug as string,
    title: raw.title as string,
    excerpt: raw.excerpt as string | null,
    html_body: raw.html_body as string | null,
    cover_image_url: raw.cover_image_url as string | null,
    category: raw.category as string | null,
    author_name: raw.author_name as string | null,
    published_at: raw.published_at as string | null,
    updated_at: raw.updated_at as string | null,
    estimated_reading_time: raw.estimated_reading_time as number | null,
    seo_metadata: raw.seo_metadata as SeoMetadata | null,
  }
}

export async function getPublishedBlogPosts(): Promise<WebsiteBlogListItem[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(LIST_FIELDS)
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  if (error) throw error
  return (data as unknown as WebsiteBlogListItem[]) || []
}

export async function getPublishedBlogPost(slug: string): Promise<WebsiteBlogPost | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_FIELDS)
    .eq('slug', slug)
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toBlogPost(data as unknown as Record<string, unknown>)
}

/** Fetches post by preview_token using service role client (bypasses RLS for draft access) */
export async function getBlogPostByPreviewToken(token: string): Promise<WebsiteBlogPost | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_FIELDS)
    .eq('preview_token', token)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toBlogPost(data as unknown as Record<string, unknown>)
}

/** Returns all published slugs for static generation */
export async function getPublishedBlogSlugs(): Promise<string[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())

  if (error) throw error
  return (data as unknown as { slug: string }[] || []).map((row) => row.slug)
}

export type BlogSitemapEntry = {
  slug: string
  updated_at: string | null
  published_at: string | null
}

/** Returns published blog entries with timestamps for sitemap */
export async function getPublishedBlogSlugsForSitemap(): Promise<BlogSitemapEntry[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, published_at')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())

  if (error) throw error
  return (data as unknown as BlogSitemapEntry[]) || []
}
