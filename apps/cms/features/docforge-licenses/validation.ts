import { z } from 'zod'
import { messages } from '@/lib/messages'

/**
 * Schema for creating a new DocForge license.
 *
 * key: required, DF-XXXX-XXXX-XXXX format
 * client_name: optional
 * email: optional but validated if provided
 * expires_at: optional date string (PostgreSQL handles parsing)
 * max_seats: min 1
 * grace_days: min 0
 */
export const createLicenseSchema = z.object({
  key: z.string().min(1, messages.docforgeLicenses.keyRequired),
  client_name: z.string().min(1, messages.docforgeLicenses.clientNameRequired),
  email: z
    .string()
    .email(messages.validation.invalidEmail)
    .nullable()
    .optional()
    .or(z.literal('')),
  expires_at: z.string().nullable().optional(),
  max_seats: z.coerce.number().int().min(1, messages.docforgeLicenses.maxSeatsMin),
  grace_days: z.coerce.number().int().min(0, messages.docforgeLicenses.graceDaysMin),
})

/**
 * Schema for updating an existing license.
 * Key is excluded — license key is immutable after creation.
 * client_name stays required (not partial).
 */
export const updateLicenseSchema = z.object({
  client_name: z.string().min(1, messages.docforgeLicenses.clientNameRequired),
  email: z
    .string()
    .email(messages.validation.invalidEmail)
    .nullable()
    .optional()
    .or(z.literal('')),
  expires_at: z.string().nullable().optional(),
  max_seats: z.coerce.number().int().min(1, messages.docforgeLicenses.maxSeatsMin),
  grace_days: z.coerce.number().int().min(0, messages.docforgeLicenses.graceDaysMin),
  is_active: z.boolean().optional(),
})

export type CreateLicenseValues = z.infer<typeof createLicenseSchema>
export type UpdateLicenseValues = z.infer<typeof updateLicenseSchema>
