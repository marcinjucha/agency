import { createClient } from '@/lib/supabase/client'
import type { LegalPage, LegalPageListItem } from './types'
import { toLegalPage, toLegalPageListItem } from './types'

// TanStack Query key factory
export const legalPageKeys = {
  all: ['legal-pages'] as const,
  detail: (id: string) => ['legal-pages', id] as const,
}

export async function getLegalPages(): Promise<LegalPageListItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('id, slug, title, is_published, updated_at')
    .eq('page_type', 'legal')
    .order('title', { ascending: true })

  if (error) throw error
  return (data || []).map(toLegalPageListItem)
}

export async function getLegalPage(id: string): Promise<LegalPage> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .eq('page_type', 'legal')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Legal page not found')
  return toLegalPage(data)
}
