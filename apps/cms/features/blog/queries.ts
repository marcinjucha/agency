import { createClient } from '@/lib/supabase/client'
import type { BlogPost, BlogPostListItem } from './types'
import { toBlogPost, toBlogPostListItem } from './types'

// TanStack Query key factory
export const blogKeys = {
  all: ['blog-posts'] as const,
  list: ['blog-posts', 'list'] as const,
  detail: (id: string) => ['blog-posts', 'detail', id] as const,
  categories: ['blog-posts', 'categories'] as const,
}

export async function getBlogPosts(): Promise<BlogPostListItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, cover_image_url, category, is_published, published_at, estimated_reading_time, author_name, created_at')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toBlogPostListItem)
}

export async function getBlogCategories(): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('category')

  if (error) throw error

  const rows = (data || []) as { category: string | null }[]
  const categories = [
    ...new Set(
      rows
        .map((d) => d.category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    ),
  ]
  return categories.sort((a, b) => a.localeCompare(b, 'pl'))
}

export async function getBlogPost(id: string): Promise<BlogPost> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Blog post not found')
  return toBlogPost(data)
}
