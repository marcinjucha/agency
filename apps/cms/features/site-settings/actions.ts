'use server'

import { revalidatePath } from 'next/cache'
import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { siteSettingsSchema } from './validation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import type { SiteSettings } from './types'

export async function saveSiteSettings(
  formData: unknown
): Promise<{ success: true; data: SiteSettings } | { success: false; error: string }> {
  try {
    const parsed = siteSettingsSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? messages.common.invalidData }
    }

    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert<'site_settings'> resolves to `never` in Supabase JS v2.95.2 (known bug). Cast required for upsert.
    const { data, error } = await (supabase as any)
      .from('site_settings')
      .upsert(
        {
          tenant_id: tenantId,
          organization_name: parsed.data.organization_name ?? null,
          logo_url: parsed.data.logo_url || null,
          default_og_image_url: parsed.data.default_og_image_url || null,
          social_facebook: parsed.data.social_facebook || null,
          social_instagram: parsed.data.social_instagram || null,
          social_linkedin: parsed.data.social_linkedin || null,
          social_twitter: parsed.data.social_twitter || null,
          google_site_verification: parsed.data.google_site_verification ?? null,
          default_keywords: parsed.data.default_keywords ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[SITE_SETTINGS] Upsert failed:', error.message, error.code, error.details)
      return { success: false, error: messages.siteSettings.saveError }
    }

    revalidatePath(routes.admin.settings)
    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[SITE_SETTINGS] Unexpected error:', message)
    return { success: false, error: messages.siteSettings.saveError }
  }
}
