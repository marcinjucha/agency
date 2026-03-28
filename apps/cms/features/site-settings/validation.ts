import { z } from 'zod'

const optionalUrl = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z.union([
      z.literal(''),
      z.string().url(),
    ])
  )
  .optional()
  .nullable()

export const siteSettingsSchema = z.object({
  organization_name: z.string().optional().nullable(),
  logo_url: optionalUrl,
  default_og_image_url: optionalUrl,
  social_facebook: optionalUrl,
  social_instagram: optionalUrl,
  social_linkedin: optionalUrl,
  social_twitter: optionalUrl,
  google_site_verification: z.string().optional().nullable(),
  default_keywords: z.array(z.string()).optional().nullable(),
})

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>
