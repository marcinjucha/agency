import { cache } from 'react'
import { createAnonClient } from '@/lib/supabase/anon-server'
import type { Tables } from '@agency/database'

export type SiteSettings = Tables<'site_settings'>

/** Fetches site settings for the website (single-tenant, first row).
 *  Wrapped with React.cache() to deduplicate within a single request
 *  (layout.tsx calls this from both generateMetadata and RootLayout). */
export const getSiteSettings = cache(async (): Promise<SiteSettings | null> => {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch site_settings:', error.message)
    return null
  }

  return data
})
