import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- Shop category schemas ---

export const createShopCategorySchema = z.object({
  name: z.string().min(1, messages.validation.nameRequired),
  slug: z
    .string()
    .min(1, messages.validation.slugRequired)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, messages.validation.slugFormat),
  description: z.string().nullable().optional(),
  sort_order: z
    .number()
    .int(messages.validation.sortOrderMustBeInteger)
    .default(0),
})

export const updateShopCategorySchema = createShopCategorySchema.partial().required({ slug: true })

// --- Inferred types ---

export type CreateShopCategoryFormData = z.infer<typeof createShopCategorySchema>
export type UpdateShopCategoryFormData = z.infer<typeof updateShopCategorySchema>
