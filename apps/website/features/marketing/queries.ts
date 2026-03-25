import { createAnonClient } from '@/lib/supabase/anon-server'
import type { Tables } from '@agency/database'
import type { LandingBlock } from '@agency/database'

export type LandingPage = Omit<Tables<'landing_pages'>, 'blocks'> & {
  blocks: LandingBlock[]
}

function toLandingPage(raw: unknown): LandingPage {
  const row = raw as Tables<'landing_pages'>
  return {
    ...row,
    blocks: Array.isArray(row.blocks) ? (row.blocks as unknown as LandingBlock[]) : [],
  }
}

// Fetch published landing page for SSR/ISR. Uses createAnonClient (no cookies) so it
// works at build time in generateStaticParams — same pattern as blog queries.
export async function getPublicLandingPage(): Promise<LandingPage | null> {
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
}
