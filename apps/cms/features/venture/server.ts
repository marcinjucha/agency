import { ResultAsync, ok, err } from 'neverthrow'
import type { Json, Tables } from '@agency/database'
import { createAnonServerClient } from '@/lib/supabase/anon.server'
import type { ResolvedTheme } from '@/lib/theme'
import { resolvePublicCampaignTheme } from './public-theme.server'
import type { CampaignBrand, PublicBonus, PublicCampaign } from './types'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — PUBLIC read layer.
//
// Runs on the ANON Supabase client (publishable key, no session) so RLS +
// the column GRANTs are the enforcement boundary:
//   - anon sees published campaigns only (RLS row policy on so_campaigns),
//   - anon can only read (id, slug, display_name, brand, published, client_id)
//     columns on so_campaigns (column GRANT) — esp_provider/esp_audience_ref/
//     esp_tag_launch are physically ungranted,
//   - anon sees a so_clients row only if it owns a published campaign (RLS row
//     policy), and can only read (id, slug) columns (column GRANT) — name/
//     tenant_id/timestamps are physically ungranted,
//   - so_leads / so_esp_sync_log have NO anon policy → deny-all.
// NEVER use the service-role client here for ROW reads: it bypasses RLS and
// would leak unpublished rows + internal esp_*/client columns.
//
// SINGLE SERVICE-ROLE EXCEPTION (iter E3): `resolvePublicCampaignTheme`
// (public-theme.server.ts) runs on the service client, but ONLY to read a
// dedicated THEME-ONLY, NON-SECRET projection (so_campaigns.theme_id/brand,
// so_clients.theme_id/theme/tenant_id, tenants.theme_id/theme, so_themes.tokens
// — never resend_api_key/gmail_app_password/esp_*), and ONLY AFTER the anon
// Phase A below has confirmed the campaign is published+visible. Do NOT extend
// this exception to any ROW read — the service client must never fetch a
// campaign/client/lead row for the public payload.
//
// Client-scoped slugs: campaign slugs are unique per client (so_campaigns
// UNIQUE(client_id, slug)), not globally — resolving a campaign by public
// slug now requires resolving the owning client's id FIRST.
// ---------------------------------------------------------------------------

// Explicit public-safe column projections. Exported so tests can assert that
// the select lists never include lead / esp_* columns. `.eq('client_id', ...)`
// filters the query independent of the select projection (PostgREST resolves
// WHERE-filter columns from the table, not from the selected columns) — no
// need to add client_id to the projection just to filter by it.
// `brand` IS in the anon projection: the public payload MERGES the raw
// so_campaigns.brand JSONB under the theme-derived brand (see toPublicCampaign) so
// any FREEFORM key the deployed VPS landing still reads survives, while the
// resolved theme wins the 5 canonical keys. `brand` is anon-readable (column
// GRANT) and non-secret. `id` is required to hand Phase B the
// already-published-confirmed campaign id.
export const CAMPAIGN_PUBLIC_COLUMNS = 'id, slug, display_name, brand'
export const BONUS_PUBLIC_COLUMNS = 'title, description, type, url'

type CampaignRow = Pick<Tables<'so_campaigns'>, 'id' | 'slug' | 'display_name' | 'brand'>
type BonusRow = Pick<Tables<'so_bonuses'>, 'title' | 'description' | 'type' | 'url'>
type ClientIdRow = Pick<Tables<'so_clients'>, 'id'>

type AnonClient = ReturnType<typeof createAnonServerClient>

/**
 * Fetch a published campaign + its published bonuses by client slug + public
 * campaign slug.
 *
 * Returns:
 *   ok(PublicCampaign) — campaign is published and visible to anon,
 *   ok(null)           — no client/campaign row visible to anon (missing OR
 *                        unpublished — RLS makes both indistinguishable,
 *                        which maps to 404),
 *   err(message)       — a genuine DB/query failure (maps to 500).
 */
export function getPublishedCampaignBySlug(
  clientSlug: string,
  slug: string,
): ResultAsync<PublicCampaign | null, string> {
  const supabase = createAnonServerClient()

  return fetchClientId(supabase, clientSlug).andThen((clientId) => {
    if (!clientId) return ok<PublicCampaign | null, string>(null)
    return fetchCampaignRow(supabase, clientId, slug).andThen((campaign) => {
      // Phase A gate: no published+visible campaign row → 404. Phase B (the
      // service-role theme resolve) MUST NOT run before this returns non-null,
      // else the RLS-bypassing service client would resolve themes of
      // unpublished campaigns.
      if (!campaign) return ok<PublicCampaign | null, string>(null)
      return fetchPublishedBonuses(supabase, campaign.id).andThen((bonuses) =>
        // Phase B: resolve the theme ONLY for the now-confirmed published
        // campaign, strictly by its already-verified id + owning client id.
        // resolvePublicCampaignTheme never throws (degrades to the Halo default),
        // so a safe promise — a theme hiccup must never turn a valid hit into a
        // 500.
        ResultAsync.fromSafePromise(
          resolvePublicCampaignTheme(campaign.id, clientId),
        ).map((theme) => toPublicCampaign(campaign, bonuses, theme)),
      )
    })
  })
}

function fetchClientId(
  supabase: AnonClient,
  clientSlug: string,
): ResultAsync<string | null, string> {
  return ResultAsync.fromPromise(
    supabase.from('so_clients').select('id').eq('slug', clientSlug).maybeSingle(),
    () => 'venture_client_query_failed',
  ).andThen((res) => {
    const { data, error } = res as {
      data: ClientIdRow | null
      error: { message: string } | null
    }
    if (error) return err(error.message)
    return ok<string | null, string>(data?.id ?? null)
  })
}

function fetchCampaignRow(
  supabase: AnonClient,
  clientId: string,
  slug: string,
): ResultAsync<CampaignRow | null, string> {
  return ResultAsync.fromPromise(
    supabase
      .from('so_campaigns')
      .select(CAMPAIGN_PUBLIC_COLUMNS)
      .eq('client_id', clientId)
      .eq('slug', slug)
      // Defense-in-depth: RLS is the boundary, but make published-only visible
      // at the query layer so a hypothetical RLS misconfig can't leak drafts.
      .eq('published', true)
      .maybeSingle(),
    () => 'venture_campaign_query_failed',
  ).andThen((res) => {
    const { data, error } = res as {
      data: CampaignRow | null
      error: { message: string } | null
    }
    if (error) return err(error.message)
    return ok<CampaignRow | null, string>(data)
  })
}

function fetchPublishedBonuses(
  supabase: AnonClient,
  campaignId: string,
): ResultAsync<PublicBonus[], string> {
  return ResultAsync.fromPromise(
    supabase
      .from('so_bonuses')
      .select(BONUS_PUBLIC_COLUMNS)
      .eq('campaign_id', campaignId)
      .eq('published', true)
      .order('sort_order', { ascending: true }),
    () => 'venture_bonuses_query_failed',
  ).andThen((res) => {
    const { data, error } = res as {
      data: BonusRow[] | null
      error: { message: string } | null
    }
    if (error) return err(error.message)
    return ok((data ?? []).map(toPublicBonus))
  })
}

function toPublicBonus(row: BonusRow): PublicBonus {
  return {
    title: row.title,
    description: row.description,
    type: row.type,
    url: row.url,
  }
}

function toPublicCampaign(
  row: CampaignRow,
  bonuses: PublicBonus[],
  theme: ResolvedTheme,
): PublicCampaign {
  return {
    slug: row.slug,
    display_name: row.display_name,
    theme,
    // brand MERGES the raw so_campaigns.brand JSONB UNDER the theme-derived brand:
    // the resolved theme WINS the 5 canonical keys (primary/accent/bg/logo_url/font
    // — inverse BRAND_TO_THEME, so a named-theme-only campaign still yields a
    // populated brand and the landing never crashes on brand.primary), while any
    // extra FREEFORM key the deployed landing still consumes passes through
    // untouched. so_campaigns.brand is a LIVE public contract (memory 2026-07-11) —
    // do NOT drop freeform keys.
    brand: { ...toRawBrand(row.brand), ...brandFromResolvedTheme(theme) } as CampaignBrand,
    bonuses,
  }
}

// Narrow the freeform `brand` JSONB to a plain object for spreading. A null /
// primitive / array `brand` (never the shape the landing reads) → {} so the merge
// contributes nothing beyond the theme-derived keys.
function toRawBrand(brand: Json | null): Record<string, unknown> {
  return brand && typeof brand === 'object' && !Array.isArray(brand)
    ? (brand as Record<string, unknown>)
    : {}
}

// Inverse of BRAND_TO_THEME (lib/theme/types.ts): project the resolved theme
// back onto the legacy CampaignBrand shape the deployed landing consumes.
// primary/accent 1:1, background→bg, logoUrl→logo_url, fontFamily→font. The 9
// colour tokens are always present on a ResolvedTheme; logoUrl/fontFamily are
// optional → null when absent (the brand shape is nullable, not optional).
function brandFromResolvedTheme(theme: ResolvedTheme): CampaignBrand {
  return {
    primary: theme.primary,
    accent: theme.accent,
    bg: theme.background,
    logo_url: theme.logoUrl ?? null,
    font: theme.fontFamily ?? null,
  }
}
