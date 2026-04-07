/**
 * Tenant management types.
 *
 * Tenant = organization in the multi-tenant system.
 * enabled_features maps to PermissionKey[] from permissions.ts — controls
 * which feature groups and individual features are available for the tenant.
 */

import type { PermissionKey } from '@/lib/permissions'

/** Tenant row from DB — matches tenants table schema. */
export type Tenant = {
  id: string
  name: string
  email: string
  domain: string | null
  subscription_status: 'trial' | 'active' | 'cancelled'
  enabled_features: PermissionKey[]
  created_at: string
  updated_at: string
}

/** Shape for list views — same as Tenant (small table, no joins needed). */
export type TenantListItem = Tenant

/** Form data for create/update tenant forms. */
export type TenantFormData = {
  name: string
  email: string
  domain?: string | null
  subscription_status: 'trial' | 'active' | 'cancelled'
  enabled_features: PermissionKey[]
}

/** Subscription status options — single source of truth for UI + validation. */
export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'cancelled'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
