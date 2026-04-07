import { z } from 'zod'
import { messages } from '@/lib/messages'
import { ALL_PERMISSION_KEYS } from '@/lib/permissions'

const permissionKeySchema = z.enum(
  ALL_PERMISSION_KEYS as [string, ...string[]],
)

export const createRoleSchema = z.object({
  name: z.string().min(2, messages.roles.nameMinLength),
  description: z.string().nullable().optional(),
  permissions: z
    .array(permissionKeySchema)
    .min(1, messages.roles.permissionRequired),
  tenantId: z.string().uuid().optional(),
})

export const updateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(2, messages.roles.nameMinLength),
  description: z.string().nullable().optional(),
  permissions: z
    .array(permissionKeySchema)
    .min(1, messages.roles.permissionRequired),
})

export type CreateRoleFormData = z.infer<typeof createRoleSchema>
export type UpdateRoleFormData = z.infer<typeof updateRoleSchema>
