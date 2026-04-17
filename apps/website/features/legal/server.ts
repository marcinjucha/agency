import { createServerFn } from '@tanstack/react-start'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantId } from '@/lib/tenant'
import type { WebsiteLegalPage } from './types'

const PAGE_FIELDS = 'id, slug, title, html_body, updated_at' as const

export const getPublishedLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<WebsiteLegalPage | null> => {
    const supabase = createServiceClient()
    const { data: row, error } = await supabase
      .from('pages')
      .select(PAGE_FIELDS)
      .eq('tenant_id', getTenantId())
      .eq('slug', data.slug)
      .eq('page_type', 'legal')
      .eq('is_published', true)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return row as unknown as WebsiteLegalPage | null
  })

export const getPublishedLegalSlugsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<string[]> => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('pages')
      .select('slug')
      .eq('tenant_id', getTenantId())
      .eq('page_type', 'legal')
      .eq('is_published', true)

    if (error) throw new Error(error.message)
    return ((data as unknown as { slug: string }[]) || []).map((row) => row.slug)
  }
)
