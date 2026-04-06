import { z } from 'zod'
import { messages } from '@/lib/messages'

export const createUserSchema = z.object({
  email: z.string().email(messages.validation.invalidEmail),
  password: z.string().min(8, messages.users.passwordMinLength),
  fullName: z.string().min(1, messages.validation.nameRequired),
  roleId: z.string().uuid(),
})

export const updateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1, messages.validation.nameRequired).optional(),
  roleId: z.string().uuid().optional(),
})

export const changePasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8, messages.users.passwordMinLength),
})

export type CreateUserFormData = z.infer<typeof createUserSchema>
export type UpdateUserFormData = z.infer<typeof updateUserSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
