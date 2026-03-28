import { createClient } from '@/lib/supabase/client'
import type { SiteSettings } from './types'
import type { Tables } from '@agency/database'

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Builds a deduplicated keyword pool from two sources:
 * 1. site_settings.default_keywords for current tenant
 * 2. All unique keywords from blog_posts.seo_metadata->'keywords'
 *
 * Supabase JS doesn't support JSONB array extraction natively,
 * so we fetch blog posts with seo_metadata and extract keywords in JS.
 */
export async function getKeywordPool(): Promise<string[]> {
  const supabase = createClient()

  const settingsQuery = supabase.from('site_settings').select('default_keywords').maybeSingle()
  const postsQuery = supabase
    .from('blog_posts')
    .select('seo_metadata')
    .not('seo_metadata', 'is', null)

  const [settingsResult, postsResult] = await Promise.all([settingsQuery, postsQuery])

  if (settingsResult.error) throw settingsResult.error
  if (postsResult.error) throw postsResult.error

  const keywords = new Set<string>()

  // Source 1: default keywords from site settings
  const defaultKeywords = (settingsResult.data as { default_keywords: string[] | null } | null)?.default_keywords
  if (Array.isArray(defaultKeywords)) {
    for (const kw of defaultKeywords) {
      if (typeof kw === 'string' && kw.trim()) {
        keywords.add(kw.trim().toLowerCase())
      }
    }
  }

  // Source 2: keywords from blog post SEO metadata
  const posts = (postsResult.data || []) as Pick<Tables<'blog_posts'>, 'seo_metadata'>[]
  for (const post of posts) {
    const meta = post.seo_metadata as Record<string, unknown> | null
    if (meta && Array.isArray(meta.keywords)) {
      for (const kw of meta.keywords) {
        if (typeof kw === 'string' && kw.trim()) {
          keywords.add(kw.trim().toLowerCase())
        }
      }
    }
  }

  return [...keywords].sort((a, b) => a.localeCompare(b, 'pl'))
}
