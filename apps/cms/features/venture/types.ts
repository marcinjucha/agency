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
