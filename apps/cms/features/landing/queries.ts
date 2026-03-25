import { createClient } from '@/lib/supabase/client'
import { toLandingPage, type LandingPage } from './types'

// Used by TanStack Query in LandingPageEditor (browser client — cannot use server client from client components)
export async function getLandingPage(): Promise<LandingPage | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', 'home')
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toLandingPage(data)
}
