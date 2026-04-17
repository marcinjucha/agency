import { z } from 'zod'
import { messages } from '@/lib/messages'

// Kebab-case slug: lowercase letters/digits separated by single hyphens.
// No leading/trailing/double hyphens. 2–100 chars.
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const legalPageSchema = z.object({
  slug: z
    .string()
    .min(2, messages.validation.slugRequired)
    .max(100, messages.validation.slugFormat)
    .regex(slugRegex, messages.validation.slugFormat),
  title: z.string().min(1, messages.validation.titleRequired),
  content: z.any(),
  is_published: z.boolean().default(false),
})

// Alias — create uses same shape as update (both require slug).
export const createLegalPageSchema = legalPageSchema

export type LegalPageFormData = z.infer<typeof legalPageSchema>

// ---------------------------------------------------------------------------
// Presets — single source of truth for preset kinds used by the create form.
// UI resolves titleKey via messages.legalPages.presets.
// ---------------------------------------------------------------------------

export const LEGAL_PAGE_PRESETS = {
  privacy_policy: { slug: 'polityka-prywatnosci', titleKey: 'privacyPolicy' },
  terms: { slug: 'regulamin', titleKey: 'terms' },
  cookies: { slug: 'polityka-cookies', titleKey: 'cookies' },
} as const

export type LegalPagePresetKey = keyof typeof LEGAL_PAGE_PRESETS
