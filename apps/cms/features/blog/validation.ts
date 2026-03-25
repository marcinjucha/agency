import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- SEO metadata schema ---

export const seoMetadataSchema = z.object({
  title: z.string().optional(),
  description: z
    .string()
    .max(160, messages.validation.seoDescriptionMax)
    .optional(),
  ogImage: z.string().url(messages.validation.invalidOgImageUrl).optional().or(z.literal('')),
  keywords: z.array(z.string()).optional(),
})

// --- Blog post schema ---

export const blogPostSchema = z.object({
  title: z.string().min(1, messages.validation.titleRequired),
  slug: z
    .string()
    .min(1, messages.validation.slugRequired)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      messages.validation.slugFormat
    ),
  excerpt: z
    .string()
    .max(300, messages.validation.excerptMax)
    .optional(),
  content: z.any(),
  html_body: z.string().optional(),
  cover_image_url: z
    .string()
    .url(messages.validation.invalidImageUrl)
    .optional()
    .or(z.literal('')),
  category: z.string().optional(),
  author_name: z.string().optional(),
  seo_metadata: seoMetadataSchema.optional(),
  is_published: z.boolean().default(false),
  estimated_reading_time: z
    .number()
    .int(messages.validation.readingTimeMustBeInteger)
    .positive(messages.validation.readingTimeMustBePositive)
    .optional(),
})

// --- Inferred types ---

export type BlogPostFormData = z.infer<typeof blogPostSchema>
export type SeoMetadataFormData = z.infer<typeof seoMetadataSchema>
