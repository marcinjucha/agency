import type { Tables, Json } from '@agency/database'
import type { ResolvedTheme } from '@/lib/theme'

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

// Row-level per-user client scoping map (migration 20260709120000). One row =
// one (user_id, client_id) grant; managed by the admin assignment editor
// (assignment-handlers.server.ts). Binding is PER-USER, not role-based.
//
// Narrowed explicit shape (NOT `Tables<'so_client_assignments'>`) — this is the
// exact, frozen iter-1 DB contract (SECTION 1 of the migration). We do NOT use
// the generated `Tables<...>` helper here because `@agency/database` resolves via
// the SHARED pnpm node_modules to the MAIN checkout, whose generated types.ts
// predates this branch's iter-1 table (worktree gotcha — memory.md "pnpm worktree
// + main share node_modules"). The worktree's own types.ts DOES define the table;
// once main's types are regenerated this can become `Tables<'so_client_assignments'>`.
export type ClientAssignment = {
  id: string
  user_id: string
  client_id: string
  created_at: string
}

// What the ADMIN CRUD layer returns to the CMS client. The plaintext
// `tally_webhook_secret` is a defense-in-depth invariant: it is read server-side
// (route verifies the Tally signature) but MUST NEVER be serialized to the
// browser (SSR payload / JS props). Strip it and expose only a derived boolean
// so the editor can show "secret already set" without ever shipping the value.
export type AdminCampaign = Omit<Tables<'so_campaigns'>, 'tally_webhook_secret'> & {
  has_webhook_secret: boolean
  // Explicit until MAIN's generated types.ts is regenerated with iter-2a's
  // lead-source columns. Worktree gotcha (see ClientAssignment above): the shared
  // pnpm node_modules resolves `@agency/database` to the MAIN checkout, whose
  // types.ts predates these columns — the worktree's own types.ts DOES define
  // them. Drop this augmentation once main is regenerated.
  lead_source_provider: string | null
  lead_source_config: Json
  // Explicitly-assigned bonus email template (model B — so_campaigns
  // .email_template_id FK, NULL = NO bonus email is sent; product decision 2026-07-15).
  // Explicit augmentation for the same worktree gotcha as the columns above: the
  // shared pnpm node_modules resolves `@agency/database` to the MAIN checkout,
  // whose generated types.ts may predate this column. No-op intersection (identical
  // `string | null`) once main is regenerated.
  email_template_id: string | null
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
  // Assigned named theme FK (so_clients.theme_id → so_themes; iter D3b). Explicit
  // until MAIN's generated types.ts is regenerated with the theme_id column —
  // same worktree gotcha as AdminCampaign.lead_source_provider above (the shared
  // pnpm node_modules resolves `@agency/database` to the MAIN checkout, whose
  // types.ts predates this column; the worktree's own types.ts DOES define it).
  // Intersecting an identical `string | null` is a no-op once main is regenerated.
  theme_id: string | null
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

/**
 * In-flight (unsaved) campaign theme selection passed to the bonus-email preview
 * as a NON-PERSISTED override, so the "Podgląd e-mail" tab reflects a theme the
 * editor has picked but not yet saved WITHOUT writing to the DB (approach B).
 *
 * Mirrors the 3-way campaign theme card: exactly one of {themeId, brand} carries
 * a value (inherit = both empty, library = themeId set, own = brand set). When
 * absent from a preview request the handler uses the PERSISTED campaign theme.
 * Only the CAMPAIGN tier is overridable — client + tenant tiers always come from
 * the DB.
 */
export interface CampaignThemeOverride {
  themeId: string | null
  brand: CampaignBrand | null
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
  // `theme` (iter E3) is the SERVER-side RESOLVED 3-tier theme (campaign →
  // client → tenant → Halo default): the fully-backfilled `ResolvedTheme` the
  // landing renders. `brand` is DERIVED from `theme` (inverse BRAND_TO_THEME) and
  // kept as an ADDITIVE dual-write — the currently-deployed landing reads
  // `brand.logo_url`/`brand.primary`, so removing it would break prod. New
  // landing code should prefer `theme`; `brand` is the transition surface.
  theme: ResolvedTheme
  brand: CampaignBrand
  bonuses: PublicBonus[]
}
