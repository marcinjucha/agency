import type { Tables } from '@agency/database'

// ---------------------------------------------------------------------------
// Admin (authenticated) row types + domain constants (iter 5a).
//
// Reuse the generated Supabase row types — never redefine table shapes locally
// (features/CLAUDE.md). The admin CRUD layer (admin.server.ts) is tenant-scoped
// and permission-gated; these are the shapes it returns to the CMS UI.
// ---------------------------------------------------------------------------

export type Client = Tables<'so_clients'>
export type Campaign = Tables<'so_campaigns'>
export type Bonus = Tables<'so_bonuses'>

// Single source of truth for the fixed DB CHECK on so_bonuses.type. Derived
// union — NOT a hand-maintained string union (features/CLAUDE.md, ag-coding).
export const BONUS_TYPES = ['link', 'file'] as const
export type BonusType = (typeof BONUS_TYPES)[number]

// Public (unauthenticated) contract shapes for the venture bonus-funnel landing.
// The landing front on the VPS consumes GET /api/venture/campaigns/:slug and reads
// these exact fields — keep them in sync with the endpoint response (spec §7).

/** Brand tokens stored in so_campaigns.brand (JSONB). All keys optional — freeform. */
export interface CampaignBrand {
  primary?: string | null
  accent?: string | null
  bg?: string | null
  logo_url?: string | null
  font?: string | null
}

/** A published bonus, projected to the public-safe columns only. */
export interface PublicBonus {
  title: string | null
  description: string | null
  type: string | null
  url: string | null
}

/** The full public payload for a single published campaign. */
export interface PublicCampaign {
  slug: string
  display_name: string | null
  brand: CampaignBrand
  bonuses: PublicBonus[]
}
