import type { Tables } from '@agency/database'

// --- Site settings (one row per tenant, all scalar columns) ---

export type SiteSettings = Tables<'site_settings'>

// --- TanStack Query key factory ---

export const siteSettingsKeys = {
  all: ['site-settings'] as const,
  detail: ['site-settings', 'detail'] as const,
  keywordPool: ['site-settings', 'keyword-pool'] as const,
}
