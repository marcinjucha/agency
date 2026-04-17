import { createServerFn } from '@tanstack/react-start'
import { createAnonClient } from '@/lib/supabase/anon-server'

export type LegalPage = {
  id: string
  slug: string
  title: string
  html_body: string | null
  updated_at: string
}

export const getPublishedLegalPageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<LegalPage | null> => {
    const supabase = createAnonClient()
    const { data: row, error } = await supabase
      .from('pages')
      .select('id, slug, title, html_body, updated_at')
      .eq('slug', data.slug)
      .eq('page_type', 'legal')
      .eq('is_published', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return row as unknown as LegalPage | null
  })
