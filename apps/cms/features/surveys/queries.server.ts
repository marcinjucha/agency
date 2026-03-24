import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@agency/database'

/** Server-side query for use in Server Components (route pages) */
export async function getSurveyServer(id: string): Promise<Tables<'surveys'> | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}
