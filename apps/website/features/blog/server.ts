import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import type { WebsiteBlogPost, WebsiteBlogListItem, SeoMetadata, BlogSitemapEntry } from './types'

// ---------------------------------------------------------------------------
// Field selectors (mirrors queries.ts)
// ---------------------------------------------------------------------------

const LIST_FIELDS =
  'slug, title, excerpt, cover_image_url, category, author_name, published_at, estimated_reading_time' as const

const POST_FIELDS = `${LIST_FIELDS}, html_body, seo_metadata, updated_at` as const

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Server functions (public API)
// ---------------------------------------------------------------------------

export const getPublishedBlogPostsFn = createServerFn().handler(
  async (): Promise<WebsiteBlogListItem[]> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select(LIST_FIELDS)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as WebsiteBlogListItem[]) || []
  }
)

export const getPublishedBlogPostFn = createServerFn()
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<WebsiteBlogPost | null> => {
    const supabase = createServiceClient()
    const { data: row, error } = await supabase
      .from('blog_posts')
      .select(POST_FIELDS)
      .eq('slug', data.slug)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!row) return null
    return toBlogPost(row as unknown as Record<string, unknown>)
  })

export const getBlogPostByPreviewTokenFn = createServerFn()
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }): Promise<WebsiteBlogPost | null> => {
    const supabase = createServiceClient()
    const { data: row, error } = await supabase
      .from('blog_posts')
      .select(POST_FIELDS)
      .eq('preview_token', data.token)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!row) return null
    return toBlogPost(row as unknown as Record<string, unknown>)
  })

export const getPublishedBlogSlugsFn = createServerFn().handler(
  async (): Promise<string[]> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())

    if (error) throw new Error(error.message)
    return ((data as unknown as { slug: string }[]) || []).map((row) => row.slug)
  }
)

export const getPublishedBlogSlugsForSitemapFn = createServerFn().handler(
  async (): Promise<BlogSitemapEntry[]> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())

    if (error) throw new Error(error.message)
    return (data as unknown as BlogSitemapEntry[]) || []
  }
)
