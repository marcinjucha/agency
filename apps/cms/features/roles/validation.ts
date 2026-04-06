import { z } from 'zod'
import { messages } from '@/lib/messages'

export const createRoleSchema = z.object({
  name: z.string().min(2, messages.roles.nameMinLength),
  description: z.string().nullable().optional(),
  permissions: z
    .array(z.string().min(1))
    .min(1, messages.roles.permissionRequired),
})

export const updateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(2, messages.roles.nameMinLength),
  description: z.string().nullable().optional(),
  permissions: z
    .array(z.string().min(1))
    .min(1, messages.roles.permissionRequired),
})

export type CreateRoleFormData = z.infer<typeof createRoleSchema>
export type UpdateRoleFormData = z.infer<typeof updateRoleSchema>
