import { z } from 'zod'
import { messages } from '@/lib/messages'

// Single source of truth for the CTA-url shape: a root-relative path
// (e.g. `/survey/<token>`) OR a full http(s) URL. Reused by both the server
// schema below AND the client-side React Hook Form `validate` rule in
// LandingPageEditor, so the inline field error matches the server rejection.
export const isValidCtaUrl = (v: string): boolean =>
  v.startsWith('/') || /^https?:\/\//i.test(v.trim())

// We deliberately do NOT use z.string().url() (it rejects relative paths), but we
// DO restrict the scheme: the value is rendered as a CTA href, so reject
// `javascript:`/`data:`/etc. as defense-in-depth.
export const updateLandingCtaSchema = z.object({
  id: z.string().uuid(),
  cta_url: z
    .string()
    .trim()
    .min(1, { message: messages.landing.ctaUrlRequired })
    .max(2048)
    .refine(isValidCtaUrl, {
      message: messages.landing.ctaUrlInvalid,
    }),
})

export type UpdateLandingCtaInput = z.infer<typeof updateLandingCtaSchema>
