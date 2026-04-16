import { createServerFn } from '@tanstack/react-start'
import { ok, err, ResultAsync } from 'neverthrow'
import type { Tables } from '@agency/database'
import { messages } from '@/lib/messages'
import { siteSettingsSchema, type SiteSettingsInput } from './validation'
import type { SiteSettings } from './types'
import { type AuthContext, requireAuthContext } from '@/lib/server-auth'

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// ---------------------------------------------------------------------------
// Server Functions (public API)
// ---------------------------------------------------------------------------

/**
 * Fetch site-wide settings for the current tenant.
 * Returns null if no row exists yet (tenant has not configured settings).
 */
export const getSiteSettingsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<
    { success: true; data: SiteSettings | null } | { success: false; error: string }
  > => {
    const result = await requireAuthContext().andThen((auth) =>
      ResultAsync.fromPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (auth.supabase as any).from('site_settings').select('*').maybeSingle(),
        dbError
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).andThen((res: any) => {
        if (res.error) return err(res.error.message as string)
        return ok(res.data as SiteSettings | null)
      })
    )

    return result.match(
      (data) => ({ success: true, data }),
      (error) => ({ success: false, error: error || messages.siteSettings.saveError })
    )
  }
)

/**
 * Fetch deduplicated keyword pool from site_settings.default_keywords
 * and all blog_posts.seo_metadata keywords.
 *
 * Supabase JS doesn't support JSONB array extraction natively —
 * blog keywords are extracted in JS after fetching seo_metadata.
 */
export const getKeywordPoolFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: true; data: string[] } | { success: false; error: string }> => {
    const result = await requireAuthContext().andThen((auth) =>
      ResultAsync.fromPromise(
        Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('site_settings')
            .select('default_keywords')
            .maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (auth.supabase as any)
            .from('blog_posts')
            .select('seo_metadata')
            .not('seo_metadata', 'is', null),
        ]),
        dbError
      ).andThen(([settingsRes, postsRes]) => {
        if (settingsRes.error) return err(settingsRes.error.message as string)
        if (postsRes.error) return err(postsRes.error.message as string)
        return ok(buildKeywordPool(settingsRes.data, postsRes.data ?? []))
      })
    )

    return result.match(
      (data) => ({ success: true, data }),
      (error) => ({ success: false, error })
    )
  }
)

/**
 * Upsert site-wide settings for the current tenant.
 */
export const updateSiteSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: SiteSettingsInput) => siteSettingsSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ success: true; data: SiteSettings } | { success: false; error: string }> => {
      const result = await requireAuthContext().andThen((auth) =>
        ResultAsync.fromPromise(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TablesInsert<'site_settings'> resolves to `never` in Supabase JS v2.95.2 (known bug)
          (auth.supabase as any)
            .from('site_settings')
            .upsert(
              {
                tenant_id: auth.tenantId,
                organization_name: data.organization_name ?? null,
                logo_url: data.logo_url || null,
                default_og_image_url: data.default_og_image_url || null,
                social_facebook: data.social_facebook || null,
                social_instagram: data.social_instagram || null,
                social_linkedin: data.social_linkedin || null,
                social_twitter: data.social_twitter || null,
                google_site_verification: data.google_site_verification ?? null,
                default_keywords: data.default_keywords ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'tenant_id' }
            )
            .select()
            .single(),
          dbError
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).andThen((res: any) => {
          if (res.error) return err(res.error.message as string)
          return ok(res.data as SiteSettings)
        })
      )

      return result.match(
        (saved) => ({ success: true, data: saved }),
        (error) => ({ success: false, error: error || messages.siteSettings.saveError })
      )
    }
  )

// ---------------------------------------------------------------------------
// Business logic helpers
// ---------------------------------------------------------------------------

function buildKeywordPool(
  settingsData: { default_keywords: string[] | null } | null,
  postsData: Pick<Tables<'blog_posts'>, 'seo_metadata'>[]
): string[] {
  const keywords = new Set<string>()

  const defaultKeywords = settingsData?.default_keywords
  if (Array.isArray(defaultKeywords)) {
    for (const kw of defaultKeywords) {
      if (typeof kw === 'string' && kw.trim()) {
        keywords.add(kw.trim().toLowerCase())
      }
    }
  }

  for (const post of postsData) {
    const meta = post.seo_metadata as Record<string, unknown> | null
    if (meta && Array.isArray(meta.keywords)) {
      for (const kw of meta.keywords) {
        if (typeof kw === 'string' && kw.trim()) {
          keywords.add(kw.trim().toLowerCase())
        }
      }
    }
  }

  return [...keywords].sort((a, b) => a.localeCompare(b, 'pl'))
}
