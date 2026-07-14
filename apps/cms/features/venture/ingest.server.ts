import { ResultAsync } from 'neverthrow'
import type { Json } from '@agency/database'
import type { Block } from '@agency/email'
import type { createServiceClient } from '@/lib/supabase/service'
import { EspApiError } from './esp/http.server'
import type { EspProvider, EspProviderId } from './esp/types'
import type { MappedLead } from './lead-sources/types'
import { buildBonusEmail, resolveBonusBrand, type BonusEmail } from './mail/bonus-email'
import { buildBonusEmailFromTemplateHtml } from './mail/bonus-email-template'
import { resolveBonusTemplateByPrecedence } from './mail/resolve-bonus-template'
import { resolveMailSender, type ClientMailConfig } from './mail/resolve.server'
import type { MailSender } from './mail/types'
import { brandToThemeTokens, resolveClientTheme, type ResolvedTheme } from '@/lib/theme'
import { fetchThemeTokens } from '@/lib/theme/fetch.server'
import { isUsableTemplateBlocks } from './utils/template-blocks'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — lead ingest orchestrator (iter 3).
//
// Called by POST /api/venture/leads/$client/$slug AFTER the route has resolved
// the campaign (by URL client slug + campaign slug), verified the signature
// with that campaign's secret, and mapped the payload. Runs on the
// SERVICE-role client (anon cannot write leads by design). Dependencies
// (supabase, ESP provider lookup, mail sender) are INJECTED so the
// orchestrator is unit-testable with mocks — the route wires the real deps.
//
// The route owns campaign resolution (it needs the secret to verify) and passes
// the resolved campaign IN — `resolveCampaign` is exported for that use.
//
// No-lead-drop ordering (spec §7):
//   1. idempotent lead insert  keyed on (campaign_id, tally_submission_id)
//                              (existing submission → early return)
//   2. ESP sync in try/catch   (failure never rolls back the lead)
//   3. transactional bonus email try/catch (failure logged, never fails request)
//
// Failure-mode contract (do NOT conflate two very different insert failures):
//   - unique_violation (23505): a concurrent request (TOCTOU) or a Tally retry
//     already wrote this (campaign_id, tally_submission_id). Benign — the winner
//     owns ESP/email → outcome `duplicate` → route returns 200, side-effects
//     skipped.
//   - ANY OTHER insert error (connection reset, pool/statement timeout, ...): the
//     lead was NOT written by anyone → outcome `insert_error` → route returns 500
//     so Tally RETRIES. Returning 200 here would silently DROP the lead.
// ESP-sync and bonus-email failures are handled independently (their own
// try/catch) and NEVER fail the request — they stay 200 with the lead intact.
//
// Log discipline (carry-forward from iter-2 security validator): on ESP error
// log `status`/`statusText`, NEVER the full EspApiError.body (may echo PII).
// ---------------------------------------------------------------------------

type ServiceClient = ReturnType<typeof createServiceClient>

export interface IngestDeps {
  supabase: ServiceClient
  getProvider: (id: EspProviderId) => EspProvider
  isProviderRegistered: (id: string) => id is EspProviderId
  // Optional injection seam for tests — production callers omit this and get
  // the real `resolveMailSender` (picks the sender from the campaign's client
  // mail config: shared Resend / client's own Resend / client's Gmail SMTP,
  // with safe fallback to the shared Resend account on incomplete config).
  // Kept separate from a plain `sendEmail` hook so `sendBonusEmail` can pick
  // the RIGHT sender per client rather than always the agency-shared one.
  resolveMailSender?: (client: ClientMailConfig) => MailSender
}

// Discriminated outcome. `ingested` + `duplicate` map to HTTP 200 at the route
// (lead persisted — by us or a concurrent winner); `insert_error` maps to 500 so
// Tally retries a genuine (non-23505) write failure. Exposed so the route (and
// tests) can assert what happened without parsing logs. Map via
// `ingestOutcomeStatus` — do NOT re-derive the status→HTTP rule at call sites.
export type IngestOutcome =
  | { status: 'insert_error' }
  | { status: 'duplicate'; leadId: string | null }
  | { status: 'ingested'; leadId: string; espSynced: boolean; emailSent: boolean }

/**
 * Map an ingest outcome to the HTTP status the webhook returns to Tally.
 * `ingested`/`duplicate` are terminal successes → 200 (the lead is persisted,
 * by us or a concurrent winner, so Tally must NOT retry). `insert_error` is a
 * genuine lead-WRITE failure (transient/unknown) → 500 so Tally RETRIES and the
 * lead is not silently dropped. Pure — unit-tested without route scaffolding.
 */
export function ingestOutcomeStatus(outcome: IngestOutcome): 200 | 500 {
  return outcome.status === 'insert_error' ? 500 : 200
}

// so_esp_sync_log.action values — derived union from an `as const` map.
const ESP_SYNC_ACTIONS = {
  upsertContact: 'upsert_contact',
  addTag: 'add_tag',
} as const
type EspSyncAction = (typeof ESP_SYNC_ACTIONS)[keyof typeof ESP_SYNC_ACTIONS]

// Row shape the route resolves by slug and passes into ingestLead. Includes
// `tally_webhook_secret` because the ROUTE (not ingest) reads it to verify the
// signature — ingest ignores it, but sharing one row shape avoids a second query.
// `clientMail` carries the campaign's OWNING CLIENT's plaintext mail-provider
// config (fetched alongside the client id lookup — this is a SERVICE-role
// query, so it bypasses RLS and may read the plaintext secrets; this and the
// admin editor are the only two places in the codebase that need them).
export type CampaignRow = {
  id: string
  // The campaign's OWNING CLIENT's tenant. Attached by `resolveCampaign` from the
  // resolved so_clients row (NOT a so_campaigns column). Scopes the tenant-level
  // `email_templates` lookup for the hybrid `venture_bonus` template.
  tenantId: string
  tally_webhook_secret: string | null
  esp_provider: string
  esp_audience_ref: string | null
  esp_tag_launch: string
  display_name: string | null
  clientMail: ClientMailConfig
  // iter 2: SELECTED from so_campaigns. The route resolves the pluggable
  // lead-source provider from this value via `resolveLeadSource` (NULL → draft →
  // 401; unregistered → 401; registered → verify + parse). Nullable: a draft
  // campaign has no provider yet.
  lead_source_provider: string | null
  // client-theming (iter D2): each brand is now a named-theme FK (`*ThemeId`)
  // with the inline `*Theme` JSONB kept as the transition fallback. Attached by
  // `resolveCampaign` (deferred-resolution pattern, same as `clientMail`);
  // `sendBonusEmail` turns each (id, inline) pair into `ThemeTokens` via
  // `fetchThemeTokens` and resolves client-over-tenant via `resolveClientTheme`.
  // `client*` = the campaign's OWNING CLIENT's own brand (so_clients.theme_id /
  // .theme); `tenant*` = the AGENCY brand (tenants.theme_id / .theme, the neutral
  // fallback). All nullable — an unset FK falls to its inline blob, then default.
  clientThemeId: string | null
  clientTheme: Json | null
  tenantThemeId: string | null
  tenantTheme: Json | null
  // campaign-theme tier (iter E2): the per-launch brand — highest specificity,
  // wins over client + tenant when it carries any override. `campaignThemeId` is
  // the named-theme FK (so_campaigns.theme_id); `campaignBrand` is the legacy
  // `so_campaigns.brand` JSONB kept as the inline fallback (adapted through
  // `brandToThemeTokens` in sendBonusEmail). Both nullable — a campaign with
  // theme_id NULL + brand NULL yields {} → falls to client/tenant (byte-identical
  // to the pre-campaign-tier render).
  campaignThemeId: string | null
  campaignBrand: Json | null
  // Phase 4 (increment 1): the campaign's EXPLICITLY-selected `venture_bonus`
  // template (so_campaigns.email_template_id FK → email_templates.id). NULL when
  // the campaign has no explicit assignment → the send falls back to the tenant's
  // DEFAULT `venture_bonus` template, then to the hardcoded builder. Resolved on
  // the SEND path only (fetchBonusTemplate) — no UI reads it yet.
  email_template_id: string | null
}

// Row shape fetched from so_clients — id + tenant_id + the theme FK + inline
// theme JSONB + the plaintext mail-provider config. `tenant_id` drives the
// tenant-theme lookup; `theme_id`/`theme` are the client's own brand override.
type ClientRow = {
  id: string
  tenant_id: string
  theme_id: string | null
  theme: Json | null
} & ClientMailConfig

// Resolve outcome — discriminated on `kind` (as-const single source of truth,
// same convention as INSERT_RESULT_KINDS below). `db_error` MUST be
// distinguished from `not_found`: a transient DB error during resolve is NOT
// "campaign doesn't exist" — conflating them made a genuine DB hiccup collapse
// to the route's 401 path, which Tally does NOT retry, silently dropping a
// validly-signed lead forever. `not_found` stays mapped to 401 (uniform with
// the existing no-secret-configured branch); `db_error` must propagate to a
// retryable 500 instead.
const RESOLVE_RESULT_KINDS = {
  found: 'found',
  notFound: 'not_found',
  dbError: 'db_error',
} as const

type ResolveClientResult =
  | { kind: typeof RESOLVE_RESULT_KINDS.found; row: ClientRow }
  | { kind: typeof RESOLVE_RESULT_KINDS.notFound }
  | { kind: typeof RESOLVE_RESULT_KINDS.dbError }

export type ResolveCampaignResult =
  | { kind: typeof RESOLVE_RESULT_KINDS.found; campaign: CampaignRow }
  | { kind: typeof RESOLVE_RESULT_KINDS.notFound }
  | { kind: typeof RESOLVE_RESULT_KINDS.dbError }

/**
 * Resolve a client's internal id + mail-provider config by its public slug.
 * Campaign slugs are scoped per client (so_campaigns UNIQUE(client_id, slug)),
 * so resolving the campaign requires resolving its owning client first —
 * fetched here in one query since sendBonusEmail needs the client's mail
 * config regardless. Three-way result: `found` (row), `not_found` (no row,
 * no error — genuinely unknown client), `db_error` (query failed — transient,
 * MUST NOT be treated as "unknown client" by the caller).
 */
async function resolveClientRow(
  supabase: ServiceClient,
  clientSlug: string,
): Promise<ResolveClientResult> {
  const { data, error } = await supabase
    .from('so_clients')
    .select(
      'id, tenant_id, theme_id, theme, mail_provider, resend_api_key, resend_from_email, gmail_address, gmail_app_password, sender_name',
    )
    .eq('slug', clientSlug)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] client lookup failed:', error.message)
    return { kind: RESOLVE_RESULT_KINDS.dbError }
  }
  if (!data) return { kind: RESOLVE_RESULT_KINDS.notFound }
  return { kind: RESOLVE_RESULT_KINDS.found, row: data as unknown as ClientRow }
}

/**
 * Fetch a tenant's brand theme reference on the service client: the named-theme
 * FK (`theme_id`) + the inline `theme` JSONB transition fallback. Never throws —
 * a lookup failure degrades to `{ themeId: null, inline: null }`, which
 * `fetchThemeTokens` treats as "no theme" so the resolver falls to the neutral
 * Halo Efekt default (same no-drop safety net as the rest of the ingest path —
 * a missing brand never blocks a send).
 */
async function fetchTenantTheme(
  supabase: ServiceClient,
  tenantId: string,
): Promise<{ themeId: string | null; inline: Json | null }> {
  const { data, error } = await supabase
    .from('tenants')
    .select('theme_id, theme')
    .eq('id', tenantId)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] tenant theme lookup failed:', error.message)
    return { themeId: null, inline: null }
  }
  const row = data as { theme_id: string | null; theme: Json | null } | null
  return { themeId: row?.theme_id ?? null, inline: row?.theme ?? null }
}

/**
 * Resolve a campaign by its public client slug + campaign slug on the service
 * client. Exported so the route can call it FIRST (it needs
 * `tally_webhook_secret` to verify the signature), then pass the resolved row
 * into `ingestLead`. Three-way result:
 *   - `found`     — campaign resolved (client + campaign rows both exist)
 *   - `not_found` — client OR campaign genuinely doesn't exist (no query
 *                   error) — the route maps this to the same uniform 401 as
 *                   a bad signature / missing secret (no enumeration oracle)
 *   - `db_error`  — a query failed (transient/unknown) — MUST propagate as
 *                   `db_error` all the way to the route, which maps it to a
 *                   retryable 500 so Tally does NOT silently lose the lead
 * A `db_error` from the client lookup is propagated immediately — it must
 * NOT collapse into `not_found` just because there's no campaign row to show.
 */
export async function resolveCampaign(
  supabase: ServiceClient,
  clientSlug: string,
  slug: string,
): Promise<ResolveCampaignResult> {
  const clientResult = await resolveClientRow(supabase, clientSlug)
  // Diagnostic (prefix `[venture-webhook]`) — this is the ONLY place the
  // client-vs-campaign resolution discriminator exists; the route collapses both
  // to a single uniform outcome. Logs the outcome only (safe: clientSlug is in
  // the URL) — no secret / row content.
  if (clientResult.kind === RESOLVE_RESULT_KINDS.dbError) {
    console.error('[venture-webhook] client resolution: db_error', { client: clientSlug })
    return { kind: RESOLVE_RESULT_KINDS.dbError }
  }
  if (clientResult.kind === RESOLVE_RESULT_KINDS.notFound) {
    console.error('[venture-webhook] client resolution: not_found', { client: clientSlug })
    return { kind: RESOLVE_RESULT_KINDS.notFound }
  }
  const clientRow = clientResult.row

  const { data, error } = await supabase
    .from('so_campaigns')
    .select(
      // iter 2: lead_source_provider is now selected — the route resolves the
      // pluggable provider from it (NULL → draft → 401; unknown → 401). This is
      // the SERVICE-role verify path, so the plaintext secret column IS read
      // here (it is not exposed to the authenticated/admin layer). iter E2:
      // theme_id + brand are the campaign-theme tier (FK + inline fallback).
      // email_template_id (Phase 4) is the campaign's explicit venture_bonus
      // template assignment — read on the send path (fetchBonusTemplate).
      'id, tally_webhook_secret, esp_provider, esp_audience_ref, esp_tag_launch, display_name, lead_source_provider, theme_id, brand, email_template_id',
    )
    .eq('client_id', clientRow.id)
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] campaign lookup failed:', error.message)
    console.error('[venture-webhook] campaign resolution: db_error', { client: clientSlug, slug })
    return { kind: RESOLVE_RESULT_KINDS.dbError }
  }
  if (!data) {
    console.error('[venture-webhook] campaign resolution: not_found', { client: clientSlug, slug })
    return { kind: RESOLVE_RESULT_KINDS.notFound }
  }

  // Tenant (agency) theme is the neutral fallback under the client's own brand.
  // Fetched only once the campaign is confirmed to exist — never throws.
  const tenantTheme = await fetchTenantTheme(supabase, clientRow.tenant_id)


  const {
    mail_provider,
    resend_api_key,
    resend_from_email,
    gmail_address,
    gmail_app_password,
    sender_name,
  } = clientRow

  // `as unknown as` (not a plain cast): the worktree shares node_modules with the
  // MAIN checkout, whose generated @agency/database types.ts predates the iter-2a
  // `lead_source_provider` + iter-E1 `theme_id` columns — so the literal
  // `.select(...)` string above infers a SelectQueryError here. Runtime
  // (staging/prod) has the columns. Same worktree types-divergence pattern as
  // ClientAssignment in features/venture/types.ts; removable once main's types
  // are regenerated. The DB row uses column names `theme_id`/`brand`; they are
  // remapped to the domain `campaignThemeId`/`campaignBrand` below (destructured
  // out of the spread so no stray column names land on the domain row).
  const { theme_id, brand, ...campaignRow } = data as unknown as Omit<
    CampaignRow,
    | 'tenantId'
    | 'clientMail'
    | 'clientThemeId'
    | 'clientTheme'
    | 'tenantThemeId'
    | 'tenantTheme'
    | 'campaignThemeId'
    | 'campaignBrand'
  > & { theme_id: string | null; brand: Json | null }

  return {
    kind: RESOLVE_RESULT_KINDS.found,
    campaign: {
      ...campaignRow,
      tenantId: clientRow.tenant_id,
      clientMail: {
        mail_provider,
        resend_api_key,
        resend_from_email,
        gmail_address,
        gmail_app_password,
        sender_name,
      },
      // Named-theme FK + inline fallback — resolved in sendBonusEmail via
      // fetchThemeTokens + resolveClientTheme. `client*`/`tenant*` come from
      // so_clients / tenants; `campaign*` is the campaign row's own theme tier.
      clientThemeId: clientRow.theme_id,
      clientTheme: clientRow.theme,
      tenantThemeId: tenantTheme.themeId,
      tenantTheme: tenantTheme.inline,
      campaignThemeId: theme_id,
      campaignBrand: brand,
    },
  }
}

// Idempotency is scoped per campaign: the DB UNIQUE is (campaign_id,
// tally_submission_id), so dedup MUST match both — the same Tally submission id
// could legitimately recur across different campaigns/forms.
async function findExistingLeadId(
  supabase: ServiceClient,
  campaignId: string,
  submissionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('so_leads')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('tally_submission_id', submissionId)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] duplicate lookup failed:', error.message)
    return null
  }
  return (data as { id: string } | null)?.id ?? null
}

// Postgres unique_violation — the (campaign_id, tally_submission_id) UNIQUE
// already holds a row. Benign under concurrency (TOCTOU) / Tally retries.
const PG_UNIQUE_VIOLATION = '23505'

// insertLead result — discriminated on `kind` (as-const single source of truth).
// `duplicate` = benign 23505 race (winner owns ESP/email); `error` = any OTHER
// insert failure the caller must make retryable. Distinguishing the two is the
// whole point of this function — a bare `string | null` conflated them.
const INSERT_RESULT_KINDS = {
  inserted: 'inserted',
  duplicate: 'duplicate',
  error: 'error',
} as const

type InsertLeadResult =
  | { kind: typeof INSERT_RESULT_KINDS.inserted; id: string }
  | { kind: typeof INSERT_RESULT_KINDS.duplicate }
  | { kind: typeof INSERT_RESULT_KINDS.error }

async function insertLead(
  supabase: ServiceClient,
  campaign: CampaignRow,
  mapped: MappedLead,
): Promise<InsertLeadResult> {
  const { data, error } = await supabase
    .from('so_leads')
    .insert({
      campaign_id: campaign.id,
      email: mapped.email,
      name: mapped.name,
      source: mapped.source,
      consent_launch: mapped.consentLaunch,
      // GDPR basis for holding the lead to deliver the requested bonus.
      legal_basis_bonus: 'art6-1-b',
      tally_submission_id: mapped.submissionId,
      esp_synced: false,
    })
    .select('id')
    .single()
  if (error) {
    // 23505 = a concurrent/retried insert already won — benign, no error log
    // and no side-effects (the winner handles ESP/email).
    if (error.code === PG_UNIQUE_VIOLATION) {
      return { kind: INSERT_RESULT_KINDS.duplicate }
    }
    // Genuine (transient/unknown) write failure — log the message (never the
    // row/PII) and signal retryable to the caller.
    console.error('[venture-ingest] lead insert failed:', error.message)
    return { kind: INSERT_RESULT_KINDS.error }
  }
  return { kind: INSERT_RESULT_KINDS.inserted, id: (data as { id: string }).id }
}

async function writeSyncLog(
  supabase: ServiceClient,
  row: {
    leadId: string
    provider: string
    action: EspSyncAction
    status: 'ok' | 'error'
    error: string | null
  },
): Promise<void> {
  const { error } = await supabase.from('so_esp_sync_log').insert({
    lead_id: row.leadId,
    provider: row.provider,
    action: row.action,
    status: row.status,
    error: row.error,
  })
  if (error) {
    console.error('[venture-ingest] sync log write failed:', error.message)
  }
}

async function markLeadSynced(supabase: ServiceClient, leadId: string): Promise<void> {
  const { error } = await supabase
    .from('so_leads')
    .update({ esp_synced: true })
    .eq('id', leadId)
  if (error) {
    console.error('[venture-ingest] mark esp_synced failed:', error.message)
  }
}

/** Extract the safe (non-PII) fields from an unknown ESP error for logging. */
function describeEspError(error: unknown): { status?: number; statusText?: string; message: string } {
  if (error instanceof EspApiError) {
    return { status: error.status, statusText: error.statusText, message: error.message }
  }
  return { message: error instanceof Error ? error.message : String(error) }
}

/**
 * Sync the lead to the campaign's ESP. Returns true on full success. Never
 * throws — provider errors are caught, logged (status/statusText only) and
 * recorded to so_esp_sync_log, leaving the lead intact with esp_synced=false.
 * Tags with the launch tag ONLY when consent_launch is true.
 */
async function syncToEsp(
  deps: IngestDeps,
  campaign: CampaignRow,
  leadId: string,
  mapped: MappedLead,
): Promise<boolean> {
  if (!mapped.email) {
    console.warn('[venture-ingest] lead has no email — skipping ESP sync (lead kept)')
    return false
  }
  if (!deps.isProviderRegistered(campaign.esp_provider)) {
    console.warn(
      `[venture-ingest] unknown ESP provider "${campaign.esp_provider}" — skipping sync (lead kept)`,
    )
    return false
  }
  if (!campaign.esp_audience_ref) {
    console.warn('[venture-ingest] campaign has no esp_audience_ref — skipping sync (lead kept)')
    return false
  }

  const audienceRef = campaign.esp_audience_ref
  let action: EspSyncAction = ESP_SYNC_ACTIONS.upsertContact
  try {
    const provider = deps.getProvider(campaign.esp_provider)
    const { contactId } = await provider.upsertContact({
      audienceRef,
      email: mapped.email,
      name: mapped.name ?? undefined,
      fields: mapped.source ? { source: mapped.source } : undefined,
    })
    await writeSyncLog(deps.supabase, {
      leadId,
      provider: campaign.esp_provider,
      action: ESP_SYNC_ACTIONS.upsertContact,
      status: 'ok',
      error: null,
    })

    if (mapped.consentLaunch) {
      action = ESP_SYNC_ACTIONS.addTag
      await provider.tag({ audienceRef, contactId, tag: campaign.esp_tag_launch })
      await writeSyncLog(deps.supabase, {
        leadId,
        provider: campaign.esp_provider,
        action: ESP_SYNC_ACTIONS.addTag,
        status: 'ok',
        error: null,
      })
    }

    await markLeadSynced(deps.supabase, leadId)
    return true
  } catch (error) {
    const described = describeEspError(error)
    console.error('[venture-ingest] ESP sync failed:', {
      action,
      status: described.status,
      statusText: described.statusText,
    })
    await writeSyncLog(deps.supabase, {
      leadId,
      provider: campaign.esp_provider,
      action,
      status: 'error',
      // Log the coarse status, NOT the raw provider body.
      error: described.status
        ? `${described.status} ${described.statusText ?? ''}`.trim()
        : described.message,
    })
    return false
  }
}

async function fetchPublishedBonuses(
  supabase: ServiceClient,
  campaignId: string,
): Promise<Array<{ title: string | null; url: string | null }>> {
  const { data, error } = await supabase
    .from('so_bonuses')
    .select('title, url')
    .eq('campaign_id', campaignId)
    .eq('published', true)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('[venture-ingest] bonus fetch failed:', error.message)
    return []
  }
  return (data as Array<{ title: string | null; url: string | null }> | null) ?? []
}

// email_templates.type slug for the hybrid bonus email's surrounding copy.
const BONUS_TEMPLATE_TYPE = 'venture_bonus'

type BonusTemplateRow = { blocks: Block[]; subject: string }

/**
 * Coerce a raw `email_templates` row into a usable BonusTemplateRow, or null when
 * unusable. `blocks` is JSONB → a non-array or empty blob is treated as ABSENT
 * (no-drop: an unusable template must fall through to the next tier / builder,
 * never render broken copy). Pure.
 */
function coerceBonusTemplateRow(data: unknown): BonusTemplateRow | null {
  if (!data) return null
  const row = data as { blocks: unknown; subject: string | null }
  if (!isUsableTemplateBlocks(row.blocks)) return null
  return { blocks: row.blocks as Block[], subject: row.subject ?? '' }
}

/**
 * Read the campaign's EXPLICITLY-selected template by id, SCOPED to the tenant
 * (F3 — the tenant id comes from the campaign ROW, never the payload, so the
 * service-role read cannot surface another tenant's content). Model B: a campaign
 * may select ANY tenant-owned template by id (NOT only the `venture_bonus` slug),
 * so this read does NOT filter on `type` — the id + tenant scope is the whole
 * guard. NEVER throws — any query/thrown error degrades to null so the caller
 * falls to the next tier.
 */
async function readBonusTemplateById(
  supabase: ServiceClient,
  tenantId: string,
  templateId: string,
): Promise<BonusTemplateRow | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('blocks, subject')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) return null
    return coerceBonusTemplateRow(data)
  } catch (error) {
    console.error(
      '[venture-ingest] bonus template by-id lookup failed:',
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

/**
 * Read the tenant's DEFAULT bonus template — the `venture_bonus` SINGLETON slug
 * row (model B: `venture_bonus` is a unique-per-tenant slug = the tenant default,
 * NOT an is_default flag). The UNIQUE(tenant_id, type) guarantees ≤1 such row, so
 * `maybeSingle` is safe. NEVER throws — degrades to null (no-drop → hardcoded
 * builder).
 */
async function readDefaultBonusTemplate(
  supabase: ServiceClient,
  tenantId: string,
): Promise<BonusTemplateRow | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('blocks, subject')
      .eq('type', BONUS_TEMPLATE_TYPE)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error) return null
    return coerceBonusTemplateRow(data)
  } catch (error) {
    console.error(
      '[venture-ingest] default bonus template lookup failed:',
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

/**
 * Resolve the `venture_bonus` copy template for a send, honouring the INV-4
 * precedence via the SHARED `resolveBonusTemplateByPrecedence` mechanism (the
 * SAME one the effective-send card uses, so the two cannot drift): the campaign's
 * EXPLICITLY assigned template wins, else the tenant's DEFAULT, else null.
 *   1. `campaignTemplateId` set + a usable row found (tenant match, ANY type) → use it
 *   2. otherwise the tenant's `venture_bonus` singleton slug row, if usable
 *   3. otherwise null → caller uses the hardcoded builder (INV-1 NO-DROP)
 * Each reader (`readBonusTemplateById`/`readDefaultBonusTemplate`) already
 * degrades to null on error and NEVER throws — wrapped here in `fromSafePromise`
 * so the shared resolver's error channel is `never`; `unwrapOr(null)` restores the
 * caller's `Promise<… | null>` contract. The default read is LAZY (only when
 * by-id yields nothing), so a resolved assignment still short-circuits it.
 * `tenantId` MUST originate from the campaign row (F3 — cross-tenant leak guard
 * on the service-role read).
 */
function fetchBonusTemplate(
  supabase: ServiceClient,
  tenantId: string,
  campaignTemplateId: string | null,
): Promise<BonusTemplateRow | null> {
  const readById = (): ResultAsync<BonusTemplateRow | null, never> =>
    ResultAsync.fromSafePromise(
      campaignTemplateId
        ? readBonusTemplateById(supabase, tenantId, campaignTemplateId)
        : Promise.resolve(null),
    )
  const readDefault = (): ResultAsync<BonusTemplateRow | null, never> =>
    ResultAsync.fromSafePromise(readDefaultBonusTemplate(supabase, tenantId))
  return resolveBonusTemplateByPrecedence(readById, readDefault).unwrapOr(null)
}

/**
 * Build subject + HTML for the bonus email. HYBRID: when a `venture_bonus`
 * template exists, render the editable copy from it + splice the programmatic
 * bonus list; on ANY error building from it, fall back to the hardcoded builder.
 * When absent, use the hardcoded builder directly. Either way the dynamic list
 * (0 / 1 / many, no cap) and the resolved theme are identical.
 */
async function buildBonusEmailBody(
  template: BonusTemplateRow | null,
  campaign: CampaignRow,
  bonuses: Array<{ title: string | null; url: string | null }>,
  theme: ResolvedTheme,
): Promise<BonusEmail> {
  if (template) {
    try {
      return await buildBonusEmailFromTemplateHtml({
        templateBlocks: template.blocks,
        subjectTemplate: template.subject,
        bonuses,
        theme,
        values: { companyName: resolveBonusBrand(campaign.display_name) },
      })
    } catch (error) {
      // A broken/edited template must NEVER degrade a live send — fall through.
      console.error(
        '[venture-ingest] bonus template render failed — falling back to hardcoded builder:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }
  return buildBonusEmail({ campaignDisplayName: campaign.display_name, bonuses, theme })
}

/**
 * Send the transactional bonus email. Returns true on success. Never throws —
 * a mail failure is logged and does not fail the request.
 */
async function sendBonusEmail(
  deps: IngestDeps,
  campaign: CampaignRow,
  mapped: MappedLead,
): Promise<boolean> {
  // Guard BEFORE any work — the sender's `to` is typed as a non-null string;
  // never pass null. Nowhere to send the bonus without an email. This guard
  // runs regardless of which mail provider the client is configured for.
  if (!mapped.email) {
    console.warn('[venture-ingest] lead has no email — skipping bonus email (lead kept)')
    return false
  }
  try {
    // All five reads derive SOLELY from the already-resolved campaign row and are
    // mutually independent — issue them concurrently to cut ~2 sequential DB
    // round-trips from the webhook-timeout window. Order of EFFECTS is preserved
    // (build + send run only after all reads resolve); every reader never throws
    // (each degrades: bonuses → [], theme tokens → {}, template → null), so the
    // no-drop contract is intact. Per tier: resolve tokens from the named-theme FK
    // (falling back to the inline JSONB), then resolve
    // campaign-over-client-over-tenant with the neutral default backfilling any
    // absent token. The campaign tier's inline fallback is the legacy `brand`
    // JSONB adapted via brandToThemeTokens; theme_id NULL + brand NULL yields {} →
    // falls to client/tenant exactly as before the campaign tier. The template is
    // resolved by INV-4 precedence (campaign assignment → tenant default →
    // hardcoded builder); tenantId comes from the campaign ROW (F3 guard).
    const [bonuses, tenantTheme, clientTheme, campaignTheme, template] = await Promise.all([
      fetchPublishedBonuses(deps.supabase, campaign.id),
      fetchThemeTokens(deps.supabase, campaign.tenantThemeId, campaign.tenantTheme),
      fetchThemeTokens(deps.supabase, campaign.clientThemeId, campaign.clientTheme),
      fetchThemeTokens(
        deps.supabase,
        campaign.campaignThemeId,
        brandToThemeTokens(campaign.campaignBrand) as unknown as Json,
      ),
      fetchBonusTemplate(deps.supabase, campaign.tenantId, campaign.email_template_id),
    ])
    const theme = resolveClientTheme({ tenantTheme, clientTheme, campaignTheme })
    const { subject, html } = await buildBonusEmailBody(template, campaign, bonuses, theme)
    const resolveSender = deps.resolveMailSender ?? resolveMailSender
    const sender = resolveSender(campaign.clientMail)
    await sender.send({ to: mapped.email, subject, html })
    return true
  } catch (error) {
    console.error(
      '[venture-ingest] bonus email send failed:',
      error instanceof Error ? error.message : String(error),
    )
    return false
  }
}

/**
 * Ingest one mapped Tally lead into an ALREADY-resolved campaign. See file header
 * for the no-lead-drop ordering and failure-mode contract. Never throws; always
 * resolves to an IngestOutcome (`ingested`/`duplicate` → 200, `insert_error` →
 * 500 via `ingestOutcomeStatus`). The campaign is resolved by the route (which
 * needs its secret to verify the signature) and injected here.
 */
export async function ingestLead(
  deps: IngestDeps,
  campaign: CampaignRow,
  mapped: MappedLead,
): Promise<IngestOutcome> {
  // Idempotency: a resent webhook for the same submission must NOT re-insert,
  // re-sync, or re-send. Keyed on (campaign_id, tally_submission_id).
  const existingId = await findExistingLeadId(
    deps.supabase,
    campaign.id,
    mapped.submissionId,
  )
  if (existingId) return { status: 'duplicate', leadId: existingId }

  const insertResult = await insertLead(deps.supabase, campaign, mapped)
  // 23505 race → same benign duplicate semantics as the findExistingLeadId
  // early-return (200, no ESP/email). We didn't fetch the winner's row, so no id.
  if (insertResult.kind === INSERT_RESULT_KINDS.duplicate) {
    return { status: 'duplicate', leadId: null }
  }
  // Genuine insert failure → must be retried (route maps insert_error → 500).
  if (insertResult.kind === INSERT_RESULT_KINDS.error) {
    return { status: 'insert_error' }
  }

  const leadId = insertResult.id
  const espSynced = await syncToEsp(deps, campaign, leadId, mapped)
  const emailSent = await sendBonusEmail(deps, campaign, mapped)

  return { status: 'ingested', leadId, espSynced, emailSent }
}
