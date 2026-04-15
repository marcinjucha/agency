import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import { type LandingPage, toLandingPage } from '@agency/database'

export type { LandingPage }

// React cache() is not needed in TanStack Start — loaders run once per navigation.
// Each createServerFn handler creates createServiceClient() inside the handler
// to avoid module-level initialization (required by TanStack Start convention).

export const getPublicLandingPageFn = createServerFn().handler(
  async (): Promise<LandingPage | null> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', 'home')
      .eq('is_published', true)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return null
    return toLandingPage(data)
  }
)
