import type { createServiceClient } from '@/lib/supabase/service'
import { EspApiError } from './esp/http.server'
import type { EspProvider, EspProviderId } from './esp/types'
import type { MappedLead } from './tally'
import { buildBonusEmail } from './mail/bonus-email'
import type { SendEmailInput } from './mail/resend.server'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — lead ingest orchestrator (iter 3).
//
// Called by POST /api/venture/leads AFTER signature verification + payload
// mapping. Runs on the SERVICE-role client (anon cannot write leads by design).
// Dependencies (supabase, ESP provider lookup, mail sender) are INJECTED so the
// orchestrator is unit-testable with mocks — the route wires the real deps.
//
// No-lead-drop ordering (spec §7):
//   1. resolve campaign by slug           (unknown → 200, no lead written)
//   2. idempotent lead insert             (existing submission → early return)
//   3. ESP sync in try/catch              (failure never rolls back the lead)
//   4. transactional bonus email try/catch(failure logged, never fails request)
//
// Every anomaly is logged (console.warn/error) but the route always returns 200
// so Tally does not retry-storm.
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

// Discriminated outcome — ALL variants map to HTTP 200 at the route. Exposed so
// the route (and tests) can assert what happened without parsing logs.
export type IngestOutcome =
  | { status: 'unknown_campaign' }
  | { status: 'lead_insert_failed' }
  | { status: 'duplicate'; leadId: string }
  | { status: 'ingested'; leadId: string; espSynced: boolean; emailSent: boolean }

// so_esp_sync_log.action values — derived union from an `as const` map.
const ESP_SYNC_ACTIONS = {
  upsertContact: 'upsert_contact',
  addTag: 'add_tag',
} as const
type EspSyncAction = (typeof ESP_SYNC_ACTIONS)[keyof typeof ESP_SYNC_ACTIONS]

type CampaignRow = {
  id: string
  esp_provider: string
  esp_audience_ref: string | null
  esp_tag_launch: string
  display_name: string | null
}

async function resolveCampaign(
  supabase: ServiceClient,
  slug: string,
): Promise<CampaignRow | null> {
  const { data, error } = await supabase
    .from('so_campaigns')
    .select('id, esp_provider, esp_audience_ref, esp_tag_launch, display_name')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] campaign lookup failed:', error.message)
    return null
  }
  return (data as CampaignRow | null) ?? null
}

async function findExistingLeadId(
  supabase: ServiceClient,
  submissionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('so_leads')
    .select('id')
    .eq('tally_submission_id', submissionId)
    .maybeSingle()
  if (error) {
    console.error('[venture-ingest] duplicate lookup failed:', error.message)
    return null
  }
  return (data as { id: string } | null)?.id ?? null
}

async function insertLead(
  supabase: ServiceClient,
  campaign: CampaignRow,
  mapped: MappedLead,
): Promise<string | null> {
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
    console.error('[venture-ingest] lead insert failed:', error.message)
    return null
  }
  return (data as { id: string }).id
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
 * Ingest one mapped Tally lead. See file header for the no-lead-drop ordering.
 * Never throws; always resolves to an IngestOutcome (all → HTTP 200).
 */
export async function ingestLead(
  mapped: MappedLead,
  deps: IngestDeps,
): Promise<IngestOutcome> {
  const campaign = await resolveCampaign(deps.supabase, mapped.campaignSlug)
  if (!campaign) {
    console.warn(
      `[venture-ingest] no campaign for slug "${mapped.campaignSlug}" — lead not written`,
    )
    return { status: 'unknown_campaign' }
  }

  // Idempotency: a resent webhook for the same submission must NOT re-insert,
  // re-sync, or re-send.
  if (mapped.submissionId) {
    const existingId = await findExistingLeadId(deps.supabase, mapped.submissionId)
    if (existingId) return { status: 'duplicate', leadId: existingId }
  }

  const leadId = await insertLead(deps.supabase, campaign, mapped)
  if (!leadId) return { status: 'lead_insert_failed' }

  const espSynced = await syncToEsp(deps, campaign, leadId, mapped)
  const emailSent = await sendBonusEmail(deps, campaign, mapped)

  return { status: 'ingested', leadId, espSynced, emailSent }
}
