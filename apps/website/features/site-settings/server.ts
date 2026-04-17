import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantId } from '@/lib/tenant'
import type { Tables } from '@agency/database'

export type SiteSettings = Tables<'site_settings'>

export const getSiteSettingsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<SiteSettings | null> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('tenant_id', getTenantId())
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch site_settings:', error.message)
      return null
    }

    return data
  }
)
