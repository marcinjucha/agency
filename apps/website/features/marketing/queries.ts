import { cache } from 'react'
import { createAnonClient } from '@/lib/supabase/anon-server'
import { type LandingPage, toLandingPage } from '@agency/database'

export type { LandingPage }

// Fetch published landing page for SSR/ISR. Uses createAnonClient (no cookies) so it
// works at build time in generateStaticParams — same pattern as blog queries.
// Wrapped with React.cache() to deduplicate within a single request —
// generateMetadata() and HomePage both call this function.
export const getPublicLandingPage = cache(async (): Promise<LandingPage | null> => {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', 'home')
    .eq('is_published', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toLandingPage(data)
})
