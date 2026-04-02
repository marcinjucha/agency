import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- Shop product schemas ---

export const createShopProductSchema = z.object({
  title: z.string().min(1, messages.validation.titleRequired),
  slug: z
    .string()
    .min(1, messages.validation.slugRequired)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, messages.validation.slugFormat),
  listing_type: z.enum(['external_link', 'digital_download'], {
    required_error: messages.validation.listingTypeRequired,
  }),
  display_layout: z.enum(['gallery', 'editorial'], {
    required_error: messages.validation.displayLayoutRequired,
  }),
  short_description: z
    .string()
    .max(300, messages.validation.shortDescriptionMax)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  description: z.any().nullable().optional(),
  html_body: z.string().nullable().optional(),
  cover_image_url: z
    .string()
    .url(messages.validation.invalidImageUrl)
    .nullable()
    .optional()
    .or(z.literal('')),
  images: z.array(z.string()).nullable().optional(),
  price: z
    .number()
    .nonnegative(messages.validation.priceMustBeNonNegative)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null))
    .or(z.nan().transform(() => null)),
  currency: z.string().default('PLN'),
  external_url: z
    .string()
    .url(messages.validation.invalidUrl)
    .nullable()
    .optional()
    .or(z.literal('')),
  digital_file_url: z.string().nullable().optional(),
  digital_file_name: z.string().nullable().optional(),
  digital_file_size: z
    .number()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null))
    .or(z.nan().transform(() => null)),
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  sort_order: z
    .number()
    .int(messages.validation.sortOrderMustBeInteger)
    .default(0),
  seo_metadata: z
    .object({
      title: z.string().optional(),
      description: z
        .string()
        .max(160, messages.validation.seoDescriptionMax)
        .optional(),
      ogImage: z.string().url(messages.validation.invalidOgImageUrl).optional().or(z.literal('')),
      keywords: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  is_featured: z.boolean().default(false),
  is_published: z.boolean().default(false),
  published_at: z.string().nullable().optional(),
})

export const updateShopProductSchema = createShopProductSchema.partial().required({ slug: true })

// --- Inferred types ---

export type CreateShopProductFormData = z.infer<typeof createShopProductSchema>
export type UpdateShopProductFormData = z.infer<typeof updateShopProductSchema>
