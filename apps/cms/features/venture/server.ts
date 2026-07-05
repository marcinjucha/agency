import { ResultAsync, ok, err } from 'neverthrow'
import type { Tables } from '@agency/database'
import { createAnonServerClient } from '@/lib/supabase/anon.server'
import type { CampaignBrand, PublicBonus, PublicCampaign } from './types'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — PUBLIC read layer.
//
// Runs on the ANON Supabase client (publishable key, no session) so RLS +
// the column GRANT on so_campaigns are the enforcement boundary:
//   - anon sees published campaigns only (RLS row policy),
//   - anon can only read (id, slug, display_name, brand, published) columns
//     (column GRANT) — esp_provider/esp_audience_ref/esp_tag_launch/client_id
//     are physically ungranted,
//   - so_leads / so_esp_sync_log have NO anon policy → deny-all.
// NEVER use the service-role client here: it bypasses RLS and would leak
// unpublished rows + internal esp_* columns.
// ---------------------------------------------------------------------------

// Explicit public-safe column projections. Exported so tests can assert that
// the select lists never include lead / esp_* columns.
export const CAMPAIGN_PUBLIC_COLUMNS = 'id, slug, display_name, brand'
export const BONUS_PUBLIC_COLUMNS = 'title, description, type, url'

type CampaignRow = Pick<
  Tables<'so_campaigns'>,
  'id' | 'slug' | 'display_name' | 'brand'
>
type BonusRow = Pick<Tables<'so_bonuses'>, 'title' | 'description' | 'type' | 'url'>

type AnonClient = ReturnType<typeof createAnonServerClient>

/**
 * Fetch a published campaign + its published bonuses by public slug.
 *
 * Returns:
 *   ok(PublicCampaign) — campaign is published and visible to anon,
 *   ok(null)           — no row visible to anon (missing OR unpublished — RLS
 *                        makes both indistinguishable, which maps to 404),
 *   err(message)       — a genuine DB/query failure (maps to 500).
 */
export function getPublishedCampaignBySlug(
  slug: string,
): ResultAsync<PublicCampaign | null, string> {
  const supabase = createAnonServerClient()

  return fetchCampaignRow(supabase, slug).andThen((campaign) => {
    if (!campaign) return ok<PublicCampaign | null, string>(null)
    return fetchPublishedBonuses(supabase, campaign.id).map((bonuses) =>
      toPublicCampaign(campaign, bonuses),
    )
  })
}

function fetchCampaignRow(
  supabase: AnonClient,
  slug: string,
): ResultAsync<CampaignRow | null, string> {
  return ResultAsync.fromPromise(
    supabase
      .from('so_campaigns')
      .select(CAMPAIGN_PUBLIC_COLUMNS)
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
