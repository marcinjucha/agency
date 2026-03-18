import { createClient } from '@/lib/supabase/client'
import type { BlogPost, BlogPostListItem } from './types'
import { toBlogPost, toBlogPostListItem } from './types'

// TanStack Query key factory
export const blogKeys = {
  all: ['blog-posts'] as const,
  list: ['blog-posts', 'list'] as const,
  detail: (id: string) => ['blog-posts', 'detail', id] as const,
}

export async function getBlogPosts(): Promise<BlogPostListItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, cover_image_url, category, is_published, published_at, estimated_reading_time, author_name')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toBlogPostListItem)
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
