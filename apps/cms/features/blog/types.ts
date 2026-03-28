import type { Tables, SeoMetadata } from '@agency/database'
export type { TiptapContent, TiptapNode, TiptapMark } from '../editor/types'
import type { TiptapContent } from '../editor/types'

// --- Blog post status ---

export type BlogPostStatus = 'draft' | 'scheduled' | 'published'

export function getPostStatus(isPublished: boolean, publishedAt: string | null): BlogPostStatus {
  if (!isPublished) return 'draft'
  if (publishedAt && new Date(publishedAt) > new Date()) return 'scheduled'
  return 'published'
}

// --- BlogPost with typed JSONB fields ---

export type BlogPost = Omit<Tables<'blog_posts'>, 'content' | 'seo_metadata'> & {
  content: TiptapContent
  seo_metadata: SeoMetadata | null
}

// --- List view subset (avoids fetching full content) ---

export type BlogPostListItem = Pick<
  Tables<'blog_posts'>,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'cover_image_url'
  | 'category'
  | 'is_published'
  | 'published_at'
  | 'estimated_reading_time'
  | 'author_name'
  | 'created_at'
>

// --- Cast helpers (Supabase returns JSONB as generic Json) ---

export function toBlogPost(raw: unknown): BlogPost {
  const row = raw as Tables<'blog_posts'>
  return {
    ...row,
    content: (row.content && typeof row.content === 'object' ? row.content : { type: 'doc', content: [] }) as unknown as TiptapContent,
    seo_metadata: row.seo_metadata as unknown as SeoMetadata | null,
  }
}

export function toBlogPostListItem(raw: unknown): BlogPostListItem {
  const row = raw as Tables<'blog_posts'>
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image_url: row.cover_image_url,
    category: row.category,
    is_published: row.is_published,
    published_at: row.published_at,
    estimated_reading_time: row.estimated_reading_time,
    author_name: row.author_name,
    created_at: row.created_at,
  }
}
