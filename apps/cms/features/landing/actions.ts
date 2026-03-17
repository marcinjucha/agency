'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { toLandingPage } from './queries'
import { landingPageSchema } from './validation'
import type { LandingBlock } from '@agency/database'
import type { SeoMetadata } from './queries'

export async function updateLandingPage(
  id: string,
  data: {
    blocks?: LandingBlock[]
    seo_metadata?: SeoMetadata
    is_published?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = landingPageSchema.partial().safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? 'Nieprawidłowe dane' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nie zalogowany' }

    const updatePayload = {
      ...(parsed.data.blocks !== undefined && { blocks: parsed.data.blocks }),
      ...(parsed.data.seo_metadata !== undefined && { seo_metadata: parsed.data.seo_metadata }),
      ...(parsed.data.is_published !== undefined && { is_published: parsed.data.is_published }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase as any)
      .from('landing_pages')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/admin/landing-page')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd'
    return { success: false, error: message }
  }
}
