import { z } from 'zod'
import { messages } from '@/lib/messages'

export const navbarBlockSchema = z.object({
  type: z.literal('navbar'),
  ctaText: z.string().min(1, messages.validation.ctaTextRequired),
  ctaHref: z.string().min(1, messages.validation.ctaLinkRequired),
}).passthrough()

export const heroBlockSchema = z.object({
  type: z.literal('hero'),
  headline: z.string(),
  subheadline: z.string(),
  cta: z.object({
    text: z.string(),
    href: z.string(),
  }),
  trustLine: z.string(),
}).passthrough()

export const identificationBlockSchema = z.object({
  type: z.literal('identification'),
  eyebrow: z.string(),
  items: z.array(
    z.object({
      icon: z.string(),
      text: z.string(),
    })
  ),
  transition: z.string(),
}).passthrough()

export const problemsBlockSchema = z.object({
  type: z.literal('problems'),
  title: z.string(),
  stat: z.string(),
  items: z.array(z.string()),
}).passthrough()

export const processBlockSchema = z.object({
  type: z.literal('process'),
  badge: z.string(),
  headline: z.string(),
  headline2: z.string(),
  steps: z.array(
    z.object({
      icon: z.string(),
      label: z.string(),
      text: z.string(),
    })
  ),
  riskTitle: z.string(),
  riskDescription: z.string(),
  proof: z.string(),
}).passthrough()

export const resultsBlockSchema = z.object({
  type: z.literal('results'),
  title: z.string(),
  metrics: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  outcomes: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    })
  ),
  qualificationTitle: z.string(),
  qualificationItems: z.array(z.string()),
}).passthrough()

export const ctaBlockSchema = z.object({
  type: z.literal('cta'),
  headline: z.string(),
  description: z.string(),
  button: z.object({
    text: z.string(),
    href: z.string(),
  }),
  trustLine: z.string(),
}).passthrough()

export const footerBlockSchema = z.object({
  type: z.literal('footer'),
  description: z.string(),
  privacy: z.string(),
  terms: z.string(),
  copyright: z.string(),
}).passthrough()

export const landingBlockSchema = z.discriminatedUnion('type', [
  navbarBlockSchema,
  heroBlockSchema,
  identificationBlockSchema,
  problemsBlockSchema,
  processBlockSchema,
  resultsBlockSchema,
  ctaBlockSchema,
  footerBlockSchema,
])

export const landingPageSchema = z.object({
  blocks: z.array(landingBlockSchema),
  seo_metadata: z
    .object({
      title: z.string(),
      description: z.string(),
      ogImage: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  is_published: z.boolean().optional(),
})

export type LandingPageFormData = z.infer<typeof landingPageSchema>
