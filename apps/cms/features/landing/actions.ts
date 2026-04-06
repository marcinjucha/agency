'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { landingPageSchema } from './validation'
import type { LandingBlock, SeoMetadata } from '@agency/database'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

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
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await requireAuth('content.landing_page')
    if (!auth.success) return auth
    const { supabase } = auth.data

    const updatePayload = {
      ...(parsed.data.blocks !== undefined && { blocks: parsed.data.blocks }),
      ...(parsed.data.seo_metadata !== undefined && { seo_metadata: parsed.data.seo_metadata }),
      ...(parsed.data.is_published !== undefined && { is_published: parsed.data.is_published }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- landing_pages not in generated types
    const { data: updated, error } = await (supabase as any)
      .from('landing_pages')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.landingPage)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    return { success: false, error: message }
  }
}
