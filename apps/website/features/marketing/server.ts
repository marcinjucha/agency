import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'

// React cache() is not needed in TanStack Start — loaders run once per navigation.
// Each createServerFn handler creates createServiceClient() inside the handler
// to avoid module-level initialization (required by TanStack Start convention).

export const DEFAULT_CTA_URL = '/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4'

// `landing_pages` holds only the configurable survey CTA URL (cta_url column).
export const getLandingCtaUrlFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('landing_pages')
      .select('cta_url')
      .eq('slug', 'home')
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch landing cta_url:', error.message)
      return DEFAULT_CTA_URL
    }

    const url = data?.cta_url
    return typeof url === 'string' && url.trim() ? url : DEFAULT_CTA_URL
  }
)
