import { createServerClient } from '@/lib/supabase/server-start'
import type { BlogPost } from './types'
import { toBlogPost } from './types'

/** Server-side query for use in Server Components (route pages) */
export async function getBlogPostServer(id: string): Promise<BlogPost | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toBlogPost(data)
}
