import type { Json } from '@agency/database'
import { createServiceClient } from '@/lib/supabase/service'
import {
  brandToThemeTokens,
  HALO_EFEKT_DEFAULT,
  resolveClientTheme,
  type ResolvedTheme,
} from '@/lib/theme'
import { fetchThemeTokens } from '@/lib/theme/fetch.server'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — PUBLIC campaign theme resolve (iter E3).
//
// The public landing needs the RESOLVED campaign theme (3-tier: campaign →
// client → tenant → Halo default), but `so_themes` is anon-REVOKEd and the
// `so_clients` secret columns (resend_api_key / gmail_app_password) are never
// exposed to anon. This is the GRANT-free bridge: it runs on the SERVICE-role
// client (which bypasses RLS) but reads a DEDICATED, NON-SECRET theme-only
// projection of each table.
//
// SECURITY CONTRACT (council-ratified — see docs/THEME_MANAGER_DESIGN.md
// "Public/anon path"):
//   • This function MUST be called ONLY AFTER the anon client has confirmed the
//     campaign is published+visible (Phase A in features/venture/server.ts).
//     The service client bypasses RLS, so resolving BEFORE the published-check
//     would leak themes of unpublished campaigns. Callers pass the ALREADY
//     published-confirmed campaignId + clientId — never a raw URL slug.
//   • It selects EXACTLY the theme columns below and NOTHING else. It does NOT
//     reuse `resolveClientRow` / `resolveCampaign` (ingest.server.ts) — those
//     select `resend_api_key` / `gmail_app_password`. Reuse is FORBIDDEN here.
//     A dedicated projection guarantees no secret column is ever in flight, and
//     a test asserts the so_clients select excludes the secret columns.
//   • The return type is `ResolvedTheme` — only the 9 hex colour tokens plus the
//     optional logoUrl / fontFamily. No secret is reachable from the output.
//
// NEVER throws — any DB/query failure degrades to HALO_EFEKT_DEFAULT (same
// no-drop safety net as the rest of the venture path). A public read must never
// 500 because a theme lookup hiccuped.
// ---------------------------------------------------------------------------

type ServiceClient = ReturnType<typeof createServiceClient>

// Exported so tests can assert the EXACT non-secret projections. so_clients in
// particular MUST list only theme_id / theme / tenant_id — NEVER resend_api_key,
// gmail_app_password, or any other secret column.
export const PUBLIC_CAMPAIGN_THEME_COLUMNS = 'theme_id, brand'
export const PUBLIC_CLIENT_THEME_COLUMNS = 'theme_id, theme, tenant_id'
export const PUBLIC_TENANT_THEME_COLUMNS = 'theme_id, theme'

type CampaignThemeRow = { themeId: string | null; brand: Json | null }
type ClientThemeRow = {
  themeId: string | null
  inline: Json | null
  tenantId: string | null
}
type TenantThemeRow = { themeId: string | null; inline: Json | null }

/**
 * Resolve the RESOLVED public theme for an ALREADY-published campaign, on the
 * service client, using only the non-secret theme projections. Returns a fully
 * backfilled `ResolvedTheme` — never throws, degrading to HALO_EFEKT_DEFAULT on
 * any failure. Callers MUST have confirmed the campaign is published first.
 */
export async function resolvePublicCampaignTheme(
  campaignId: string,
  clientId: string,
): Promise<ResolvedTheme> {
  try {
    const supabase = createServiceClient()

    // Campaign + client rows are independent → fetch in parallel. Tenant depends
    // on the client's tenant_id, so it follows.
    const [campaign, client] = await Promise.all([
      fetchCampaignThemeRow(supabase, campaignId),
      fetchClientThemeRow(supabase, clientId),
    ])
    const tenant = await fetchTenantThemeRow(supabase, client.tenantId)

    // Turn each tier's (themeId, inline) into ThemeTokens. The campaign tier's
    // inline fallback is the legacy `brand` JSONB adapted via brandToThemeTokens.
    // fetchThemeTokens never throws → {} on any failure, so a bad/missing theme
    // degrades to the neutral default. Mirrors ingest.server.ts's sendBonusEmail.
    const [tenantTheme, clientTheme, campaignTheme] = await Promise.all([
      fetchThemeTokens(supabase, tenant.themeId, tenant.inline),
      fetchThemeTokens(supabase, client.themeId, client.inline),
      fetchThemeTokens(
        supabase,
        campaign.themeId,
        brandToThemeTokens(campaign.brand) as unknown as Json,
      ),
    ])

    return resolveClientTheme({ tenantTheme, clientTheme, campaignTheme })
  } catch (error) {
    console.error(
      '[venture-public-theme] resolve failed — falling back to default:',
      error instanceof Error ? error.message : String(error),
    )
    return HALO_EFEKT_DEFAULT
  }
}

// so_campaigns: theme_id + brand ONLY, by campaign id. Never throws → nulls.
async function fetchCampaignThemeRow(
  supabase: ServiceClient,
  campaignId: string,
): Promise<CampaignThemeRow> {
  const { data, error } = await supabase
    .from('so_campaigns')
    .select(PUBLIC_CAMPAIGN_THEME_COLUMNS)
    .eq('id', campaignId)
    .maybeSingle()
  if (error || !data) return { themeId: null, brand: null }
  // `as unknown as` — the shared node_modules resolves @agency/database to MAIN,
  // whose types.ts predates so_campaigns.theme_id (worktree gotcha, mirrors
  // ingest.server.ts). Runtime has the column.
  const row = data as unknown as { theme_id: string | null; brand: Json | null }
  return { themeId: row.theme_id ?? null, brand: row.brand ?? null }
}

// so_clients: theme_id + theme + tenant_id ONLY, by client id. NEVER selects a
// secret column (resend_api_key / gmail_app_password). Never throws → nulls.
async function fetchClientThemeRow(
  supabase: ServiceClient,
  clientId: string,
): Promise<ClientThemeRow> {
  const { data, error } = await supabase
    .from('so_clients')
    .select(PUBLIC_CLIENT_THEME_COLUMNS)
    .eq('id', clientId)
    .maybeSingle()
  if (error || !data) return { themeId: null, inline: null, tenantId: null }
  const row = data as unknown as {
    theme_id: string | null
    theme: Json | null
    tenant_id: string | null
  }
  return {
    themeId: row.theme_id ?? null,
    inline: row.theme ?? null,
    tenantId: row.tenant_id ?? null,
  }
}

// tenants: theme_id + theme ONLY, by id. Short-circuits when tenantId is null
// (client row missing). Never throws → nulls.
async function fetchTenantThemeRow(
  supabase: ServiceClient,
  tenantId: string | null,
): Promise<TenantThemeRow> {
  if (!tenantId) return { themeId: null, inline: null }
  const { data, error } = await supabase
    .from('tenants')
    .select(PUBLIC_TENANT_THEME_COLUMNS)
    .eq('id', tenantId)
    .maybeSingle()
  if (error || !data) return { themeId: null, inline: null }
  const row = data as { theme_id: string | null; theme: Json | null }
  return { themeId: row.theme_id ?? null, inline: row.theme ?? null }
}
