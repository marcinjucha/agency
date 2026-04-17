import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import { type LandingPage, toLandingPage } from '@agency/database'

export type { LandingPage }

// React cache() is not needed in TanStack Start — loaders run once per navigation.
// Each createServerFn handler creates createServiceClient() inside the handler
// to avoid module-level initialization (required by TanStack Start convention).

// Tenant-isolation note: `landing_pages` has `slug UNIQUE` globally (see migration
// 20260317210000_create_landing_pages.sql), so only one row per slug can exist
// across the entire DB. No tenant_id filter is needed today. If landing_pages ever
// becomes multi-tenant (tenant_id column + UNIQUE(tenant_id, slug)), this query MUST
// be updated to filter by getTenantId() from @/lib/tenant.
export const getPublicLandingPageFn = createServerFn({ method: 'POST' }).handler(
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
