import type { Tables, SeoMetadata } from '@agency/database'

// --- Tiptap ProseMirror JSON structure ---

export type TiptapMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type TiptapNode = {
  type: string
  content?: TiptapNode[]
  attrs?: Record<string, unknown>
  marks?: TiptapMark[]
  text?: string
}

export type TiptapContent = {
  type: 'doc'
  content: TiptapNode[]
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
  }
}
