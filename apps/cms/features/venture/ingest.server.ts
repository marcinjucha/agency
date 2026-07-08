import type { createServiceClient } from '@/lib/supabase/service'
import { EspApiError } from './esp/http.server'
import type { EspProvider, EspProviderId } from './esp/types'
import type { MappedLead } from './tally'
import { buildBonusEmail } from './mail/bonus-email'
import type { SendEmailInput } from './mail/resend.server'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — lead ingest orchestrator (iter 3).
//
// Called by POST /api/venture/leads/$slug AFTER the route has resolved the
// campaign (by URL slug), verified the signature with that campaign's secret, and
// mapped the payload. Runs on the SERVICE-role client (anon cannot write leads by
// design). Dependencies (supabase, ESP provider lookup, mail sender) are INJECTED
// so the orchestrator is unit-testable with mocks — the route wires the real deps.
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
  sendEmail: (input: SendEmailInput) => Promise<void>
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
export type CampaignRow = {
  id: string
  tally_webhook_secret: string | null
  esp_provider: string
  esp_audience_ref: string | null
  esp_tag_launch: string
  display_name: string | null
}

/**
 * Resolve a campaign by its public slug on the service client. Exported so the
 * route can call it FIRST (it needs `tally_webhook_secret` to verify the
 * signature), then pass the resolved row into `ingestLead`.
 */
export async function resolveCampaign(
  supabase: ServiceClient,
  slug: string,
): Promise<CampaignRow | null> {
  const { data, error } = await supabase
    .from('so_campaigns')
    .select(
      'id, tally_webhook_secret, esp_provider, esp_audience_ref, esp_tag_launch, display_name',
    )
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] campaign lookup failed:', error.message)
    return null
  }
  return (data as CampaignRow | null) ?? null
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

/**
 * Send the transactional bonus email. Returns true on success. Never throws —
 * a mail failure is logged and does not fail the request.
 */
async function sendBonusEmail(
  deps: IngestDeps,
  campaign: CampaignRow,
  mapped: MappedLead,
): Promise<boolean> {
  try {
    const bonuses = await fetchPublishedBonuses(deps.supabase, campaign.id)
    const { subject, html } = await buildBonusEmail({
      campaignDisplayName: campaign.display_name,
      bonuses,
    })
    await deps.sendEmail({ to: mapped.email, subject, html })
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
