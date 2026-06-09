import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'

// React cache() is not needed in TanStack Start — loaders run once per navigation.
// Each createServerFn handler creates createServiceClient() inside the handler
// to avoid module-level initialization (required by TanStack Start convention).

export const DEFAULT_CTA_URL = '/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4'

// `landing_pages` is accessed via `(supabase as any)` — the table is not in the
// generated types. select('*') stays resilient if the `cta_url` column is absent
// in an environment where the migration hasn't run yet.
export const getLandingCtaUrlFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string> => {
    const supabase = createServiceClient()
    const { data, error } = await (supabase as any)
      .from('landing_pages')
      .select('*')
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
