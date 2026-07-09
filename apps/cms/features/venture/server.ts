import { ResultAsync, ok, err } from 'neverthrow'
import type { Tables } from '@agency/database'
import { createAnonServerClient } from '@/lib/supabase/anon.server'
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
// NEVER use the service-role client here: it bypasses RLS and would leak
// unpublished rows + internal esp_*/client columns.
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
export const CAMPAIGN_PUBLIC_COLUMNS = 'id, slug, display_name, brand'
export const BONUS_PUBLIC_COLUMNS = 'title, description, type, url'

type CampaignRow = Pick<
  Tables<'so_campaigns'>,
  'id' | 'slug' | 'display_name' | 'brand'
>
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
      if (!campaign) return ok<PublicCampaign | null, string>(null)
      return fetchPublishedBonuses(supabase, campaign.id).map((bonuses) =>
        toPublicCampaign(campaign, bonuses),
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
): PublicCampaign {
  return {
    slug: row.slug,
    display_name: row.display_name,
    // brand is freeform JSONB; default to {} so the landing never crashes on brand.primary.
    brand: (row.brand ?? {}) as CampaignBrand,
    bonuses,
  }
}
