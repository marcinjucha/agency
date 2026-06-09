import { z } from 'zod'

// Accept a root-relative path (e.g. `/survey/<token>`) OR a full http(s) URL.
// We deliberately do NOT use z.string().url() (it rejects relative paths), but we
// DO restrict the scheme: the value is rendered as a CTA href, so reject
// `javascript:`/`data:`/etc. as defense-in-depth.
export const updateLandingCtaSchema = z.object({
  id: z.string().uuid(),
  cta_url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), {
      message: 'Podaj ścieżkę zaczynającą się od / lub pełny adres http(s).',
    }),
})

export type UpdateLandingCtaInput = z.infer<typeof updateLandingCtaSchema>
