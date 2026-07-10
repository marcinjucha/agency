import { z } from 'zod'
import { messages } from '@/lib/messages'

export const createUserSchema = z.object({
  email: z.string().email(messages.validation.invalidEmail),
  password: z.string().min(8, messages.users.passwordMinLength),
  fullName: z.string().min(1, messages.validation.nameRequired),
  roleId: z.string().uuid(),
  /** Super admin only — create user in a specific tenant. */
  tenantId: z.string().uuid().optional(),
  /**
   * Client-access tier → written to the coarse users.role that venture RLS +
   * getAuthFull key off. 'all' → users.role='admin' (unscoped), 'selected' →
   * 'member' (scoped). Required, but defaults to the least-privilege 'selected'.
   */
  clientAccess: z.enum(['all', 'selected']).default('selected'),
})

export const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1, messages.validation.nameRequired).optional(),
  roleId: z.string().uuid().optional(),
  /**
   * Client-access tier → writes users.role ('all'→'admin', 'selected'→'member').
   * Optional so partial updates (name-only, role-only) skip the write; a seeded
   * 'owner' is preserved server-side even when this is sent.
   */
  clientAccess: z.enum(['all', 'selected']).optional(),
})

export const changePasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8, messages.users.passwordMinLength),
})

export type CreateUserFormData = z.infer<typeof createUserSchema>
export type UpdateUserFormData = z.infer<typeof updateUserSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
