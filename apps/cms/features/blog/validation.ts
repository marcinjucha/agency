import { z } from 'zod'

// --- SEO metadata schema ---

export const seoMetadataSchema = z.object({
  title: z.string().optional(),
  description: z
    .string()
    .max(160, 'Opis SEO może mieć maksymalnie 160 znaków')
    .optional(),
  ogImage: z.string().url('Nieprawidłowy URL obrazka OG').optional().or(z.literal('')),
  keywords: z.array(z.string()).optional(),
})

// --- Blog post schema ---

export const blogPostSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany'),
  slug: z
    .string()
    .min(1, 'Slug jest wymagany')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug może zawierać tylko małe litery, cyfry i myślniki'
    ),
  excerpt: z
    .string()
    .max(300, 'Zajawka może mieć maksymalnie 300 znaków')
    .optional(),
  content: z.any(),
  html_body: z.string().optional(),
  cover_image_url: z
    .string()
    .url('Nieprawidłowy URL obrazka')
    .optional()
    .or(z.literal('')),
  category: z.string().optional(),
  author_name: z.string().optional(),
  seo_metadata: seoMetadataSchema.optional(),
  is_published: z.boolean().default(false),
  estimated_reading_time: z
    .number()
    .int('Czas czytania musi być liczbą całkowitą')
    .positive('Czas czytania musi być większy od zera')
    .optional(),
})

// --- Inferred types ---

export type BlogPostFormData = z.infer<typeof blogPostSchema>
export type SeoMetadataFormData = z.infer<typeof seoMetadataSchema>
