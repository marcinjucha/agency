import { z } from 'zod'

export const navbarBlockSchema = z.object({
  type: z.literal('navbar'),
  ctaText: z.string().min(1, 'Tekst CTA jest wymagany'),
  ctaHref: z.string().min(1, 'Link CTA jest wymagany'),
})

export const heroBlockSchema = z.object({
  type: z.literal('hero'),
  metric1Value: z.string(),
  metric1Label: z.string(),
  metric2Value: z.string(),
  metric2Label: z.string(),
  qualifiers: z.array(z.string()),
  badNews: z.string(),
  goodNews: z.string(),
  valueProp: z.string(),
  guarantee: z.string(),
  cta: z.string(),
})

export const problemsBlockSchema = z.object({
  type: z.literal('problems'),
  title: z.string(),
  stat: z.string(),
  items: z.array(z.string()),
  framing: z.string(),
  hook: z.string(),
})

export const guaranteeBlockSchema = z.object({
  type: z.literal('guarantee'),
  badge: z.string(),
  headline: z.string(),
  headline2: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  proof: z.string(),
})

export const riskReversalBlockSchema = z.object({
  type: z.literal('riskReversal'),
  title: z.string(),
  step1Label: z.string(),
  step1Text: z.string(),
  step2Label: z.string(),
  step2Text: z.string(),
  closing: z.string(),
  bold: z.string(),
  transparency: z.string(),
})

export const benefitsBlockSchema = z.object({
  type: z.literal('benefits'),
  title: z.string(),
  items: z.array(z.string()),
  closing: z.string(),
})

export const qualificationBlockSchema = z.object({
  type: z.literal('qualification'),
  title: z.string(),
  items: z.array(z.string()),
  separator: z.string(),
  techItem: z.string(),
})

export const ctaBlockSchema = z.object({
  type: z.literal('cta'),
  headline: z.string(),
  description: z.string(),
  button: z.string(),
  subtext: z.string(),
})

export const footerBlockSchema = z.object({
  type: z.literal('footer'),
  description: z.string(),
  privacy: z.string(),
  terms: z.string(),
  copyright: z.string(),
})

export const landingBlockSchema = z.discriminatedUnion('type', [
  navbarBlockSchema,
  heroBlockSchema,
  problemsBlockSchema,
  guaranteeBlockSchema,
  riskReversalBlockSchema,
  benefitsBlockSchema,
  qualificationBlockSchema,
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
    })
    .optional(),
  is_published: z.boolean().optional(),
})

export type LandingPageFormData = z.infer<typeof landingPageSchema>
