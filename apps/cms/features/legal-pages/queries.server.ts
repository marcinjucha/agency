import { createClient } from '@/lib/supabase/server'
import type { LegalPage } from './types'
import { toLegalPage } from './types'

/** Server-side query for use in Server Components (route pages) */
export async function getLegalPageServer(id: string): Promise<LegalPage | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .eq('page_type', 'legal')
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toLegalPage(data)
}
