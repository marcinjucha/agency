import { createClient } from '@/lib/supabase/client'
import type { Tables, LandingBlock, SeoMetadata } from '@agency/database'

// LandingPage with typed blocks replacing the generic JSONB
export type LandingPage = Omit<Tables<'landing_pages'>, 'blocks' | 'seo_metadata'> & {
  blocks: LandingBlock[]
  seo_metadata: SeoMetadata | null
}

// Supabase returns blocks/seo_metadata as generic Json (JSONB) — cast to typed LandingPage once here
export function toLandingPage(raw: unknown): LandingPage {
  const row = raw as Tables<'landing_pages'>
  return {
    ...row,
    blocks: Array.isArray(row.blocks) ? (row.blocks as unknown as LandingBlock[]) : [],
    seo_metadata: row.seo_metadata as unknown as SeoMetadata | null,
  }
}

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
