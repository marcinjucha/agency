import { createAnonClient } from '@/lib/supabase/anon-server'
import type { WebsiteLegalPage } from './types'

const PAGE_FIELDS = 'id, slug, title, html_body, updated_at' as const

export async function getPublishedLegalPage(slug: string): Promise<WebsiteLegalPage | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('pages')
    .select(PAGE_FIELDS)
    .eq('slug', slug)
    .eq('page_type', 'legal')
    .eq('is_published', true)
    .maybeSingle()

  if (error) throw error
  return data as unknown as WebsiteLegalPage | null
}

export async function getPublishedLegalSlugs(): Promise<string[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('pages')
    .select('slug')
    .eq('page_type', 'legal')
    .eq('is_published', true)

  if (error) throw error
  return (data as unknown as { slug: string }[] || []).map((row) => row.slug)
}
