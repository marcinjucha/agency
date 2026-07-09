import type { Tables } from '@agency/database'

// ---------------------------------------------------------------------------
// Admin (authenticated) row types + domain constants (iter 5a).
//
// Reuse the generated Supabase row types — never redefine table shapes locally
// (features/CLAUDE.md). The admin CRUD layer (admin.ts) is tenant-scoped
// and permission-gated; these are the shapes it returns to the CMS UI.
// ---------------------------------------------------------------------------

export type Client = Tables<'so_clients'>
export type Campaign = Tables<'so_campaigns'>
export type Bonus = Tables<'so_bonuses'>

// What the ADMIN CRUD layer returns to the CMS client. The plaintext
// `tally_webhook_secret` is a defense-in-depth invariant: it is read server-side
// (route verifies the Tally signature) but MUST NEVER be serialized to the
// browser (SSR payload / JS props). Strip it and expose only a derived boolean
// so the editor can show "secret already set" without ever shipping the value.
export type AdminCampaign = Omit<Tables<'so_campaigns'>, 'tally_webhook_secret'> & {
  has_webhook_secret: boolean
}

// Single source of truth for the fixed DB CHECK on so_bonuses.type. Derived
// union — NOT a hand-maintained string union (features/CLAUDE.md, ag-coding).
export const BONUS_TYPES = ['link', 'file'] as const
export type BonusType = (typeof BONUS_TYPES)[number]

// Single source of truth for the fixed DB CHECK on so_clients.mail_provider.
// Derived union — NOT a hand-maintained string union (features/CLAUDE.md).
// 'resend_shared' = agency-shared Resend key (default); 'resend_own' = client's
// own Resend API key; 'gmail_smtp' = client's Gmail App Password.
export const MAIL_PROVIDERS = ['resend_shared', 'resend_own', 'gmail_smtp'] as const
export type MailProvider = (typeof MAIL_PROVIDERS)[number]

// What the ADMIN CRUD layer returns to the CMS client for so_clients. Same
// defense-in-depth invariant as AdminCampaign: the plaintext secret columns
// (`resend_api_key`, `gmail_app_password`) are read server-side only (mail
// sender resolution) but MUST NEVER be serialized to the browser. Strip them
// and expose only derived booleans so the editor can show "secret already
// set" without ever shipping the value.
export type AdminClient = Omit<
  Tables<'so_clients'>,
  'resend_api_key' | 'gmail_app_password'
> & {
  has_resend_api_key: boolean
  has_gmail_app_password: boolean
}

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
