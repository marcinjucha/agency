import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- Connect marketplace ---

export const connectMarketplaceSchema = z.object({
  marketplace: z.enum(['olx', 'allegro'], {
    required_error: messages.validation.marketplaceRequired,
  }),
  displayName: z.string().nullable().optional(),
})

export type ConnectMarketplaceFormData = z.infer<typeof connectMarketplaceSchema>

// --- Update connection ---

export const updateConnectionSchema = z.object({
  displayName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type UpdateConnectionFormData = z.infer<typeof updateConnectionSchema>

// --- Publish listing ---

export const publishListingSchema = z.object({
  productId: z.string().uuid(messages.validation.invalidProductId),
  connectionId: z.string().uuid(messages.validation.invalidConnectionId),
  marketplaceCategoryId: z.string().nullable().optional(),
  marketplaceLocation: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
    })
    .nullable()
    .optional(),
  marketplaceParams: z.record(z.unknown()).nullable().optional(),
})

export type PublishListingFormData = z.infer<typeof publishListingSchema>

// --- Update listing ---

export const updateListingSchema = publishListingSchema
  .omit({ productId: true, connectionId: true })
  .partial()

export type UpdateListingFormData = z.infer<typeof updateListingSchema>

// --- Create import ---

export const createImportSchema = z.object({
  connectionId: z.string().uuid(messages.validation.invalidConnectionId),
})

export type CreateImportFormData = z.infer<typeof createImportSchema>
