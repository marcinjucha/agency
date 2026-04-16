import { createServerClient } from '@/lib/supabase/server-start'
import type { Tables } from '@agency/database'

/** Server-side query for use in Server Components (route pages) */
export async function getSurveyServer(id: string): Promise<Tables<'surveys'> | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}
