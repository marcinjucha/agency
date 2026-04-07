import { z } from 'zod'
import { ALL_PERMISSION_KEYS } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import { SUBSCRIPTION_STATUSES } from './types'

/**
 * Tenant form validation schema.
 *
 * enabled_features stores PermissionKey[] (parent + child granularity).
 * Dashboard is always included via .refine().
 * WHY refine instead of .default(): form must explicitly send dashboard —
 * default only works on undefined, not on arrays missing an element.
 */
export const tenantSchema = z.object({
  name: z.string().min(1, messages.validation.nameRequired),
  email: z.string().email(messages.validation.invalidEmail),
  domain: z.string().nullable().optional(),
  subscription_status: z.enum(SUBSCRIPTION_STATUSES),
  enabled_features: z
    .array(z.enum(ALL_PERMISSION_KEYS as [string, ...string[]]))
    .refine(
      (features) => features.includes('dashboard'),
      { message: messages.tenants.dashboardRequired },
    ),
})

export type TenantFormValues = z.infer<typeof tenantSchema>
