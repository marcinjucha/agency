import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// Isolate the orchestrator from @react-email rendering — the real builder is
// covered in bonus-email.test.ts. Here we only assert send-vs-not.
vi.mock('../mail/bonus-email', () => ({
  buildBonusEmail: vi.fn(async () => ({ subject: 'Subj', html: '<p>html</p>' })),
}))

import { ingestLead, type IngestDeps } from '../ingest.server'
import { EspApiError } from '../esp/http.server'
import type { EspProvider } from '../esp/types'
import type { MappedLead } from '../tally'

const LEAD: MappedLead = {
  campaignSlug: 'kacper',
  email: 'jan@example.com',
  name: 'Jan',
  source: 'youtube',
  consentLaunch: true,
  submissionId: 'sub_1',
}

const CAMPAIGN = {
  id: 'campaign-1',
  esp_provider: 'beehiiv',
  esp_audience_ref: 'pub_123',
  esp_tag_launch: 'launch-notify',
  display_name: 'Kacper Launch',
}

type Result = { data: unknown; error: { message: string } | null }

// A per-table Supabase mock. so_leads carries 3 distinct ops disambiguated by
// which entry method is called first (select / insert / update).
function makeSupabase(cfg: {
  campaign?: Result
  duplicate?: Result
  insert?: Result
  bonuses?: Result
}) {
  const campaignBuilder = {
    select: vi.fn(() => campaignBuilder),
    eq: vi.fn(() => campaignBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(cfg.campaign ?? { data: CAMPAIGN, error: null })),
  }

  const leadsSelectChain = {
    eq: vi.fn(() => leadsSelectChain),
    maybeSingle: vi.fn(() => Promise.resolve(cfg.duplicate ?? { data: null, error: null })),
  }
  const leadsInsertChain = {
    select: vi.fn(() => leadsInsertChain),
    single: vi.fn(() => Promise.resolve(cfg.insert ?? { data: { id: 'lead-1' }, error: null })),
  }
  const leadsUpdateChain = { eq: vi.fn(() => Promise.resolve({ error: null })) }
  const leadsBuilder = {
    select: vi.fn(() => leadsSelectChain),
    insert: vi.fn(() => leadsInsertChain),
    update: vi.fn(() => leadsUpdateChain),
  }

  const bonusesBuilder = {
    select: vi.fn(() => bonusesBuilder),
    eq: vi.fn(() => bonusesBuilder),
    order: vi.fn(() => Promise.resolve(cfg.bonuses ?? { data: [], error: null })),
  }

  const syncLogInsert = vi.fn(() => Promise.resolve({ error: null }))
  const syncLogBuilder = { insert: syncLogInsert }

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'so_campaigns':
        return campaignBuilder
      case 'so_leads':
        return leadsBuilder
      case 'so_bonuses':
        return bonusesBuilder
      case 'so_esp_sync_log':
        return syncLogBuilder
      default:
        throw new Error(`unexpected table ${table}`)
    }
  })

  return { from, campaignBuilder, leadsBuilder, leadsUpdateChain, bonusesBuilder, syncLogInsert }
}

function makeProvider(overrides?: Partial<EspProvider>): EspProvider {
  return {
    id: 'beehiiv',
    name: 'beehiiv',
    upsertContact: vi.fn(async () => ({ contactId: 'sub_987' })),
    tag: vi.fn(async () => undefined),
    ...overrides,
  }
}

function makeDeps(
  supabase: ReturnType<typeof makeSupabase>,
  provider: EspProvider,
  sendEmail = vi.fn(async () => undefined),
): IngestDeps {
  return {
    supabase: supabase as unknown as IngestDeps['supabase'],
    getProvider: () => provider,
    isProviderRegistered: (id: string): id is 'beehiiv' => id === 'beehiiv',
    sendEmail,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ingestLead', () => {
  it('inserts the lead, syncs to the ESP, tags on consent, sends the email (happy path)', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const sendEmail = vi.fn(async () => undefined)
    const deps = makeDeps(supabase, provider, sendEmail)

    const outcome = await ingestLead(LEAD, deps)

    expect(outcome).toEqual({
      status: 'ingested',
      leadId: 'lead-1',
      espSynced: true,
      emailSent: true,
    })
    expect(supabase.leadsBuilder.insert).toHaveBeenCalledTimes(1)
    expect(provider.upsertContact).toHaveBeenCalledWith({
      audienceRef: 'pub_123',
      email: 'jan@example.com',
      name: 'Jan',
      fields: { source: 'youtube' },
    })
    expect(provider.tag).toHaveBeenCalledWith({
      audienceRef: 'pub_123',
      contactId: 'sub_987',
      tag: 'launch-notify',
    })
    // esp_synced flipped to true.
    expect(supabase.leadsBuilder.update).toHaveBeenCalledWith({ esp_synced: true })
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'jan@example.com',
      subject: 'Subj',
      html: '<p>html</p>',
    })
  })

  it('returns unknown_campaign and writes NO lead when the slug does not resolve', async () => {
    const supabase = makeSupabase({ campaign: { data: null, error: null } })
    const deps = makeDeps(supabase, makeProvider())

    const outcome = await ingestLead(LEAD, deps)

    expect(outcome).toEqual({ status: 'unknown_campaign' })
    expect(supabase.leadsBuilder.insert).not.toHaveBeenCalled()
  })

  it('is idempotent — existing tally_submission_id → no insert, no ESP, no send', async () => {
    const supabase = makeSupabase({ duplicate: { data: { id: 'lead-existing' }, error: null } })
    const provider = makeProvider()
    const sendEmail = vi.fn(async () => undefined)
    const deps = makeDeps(supabase, provider, sendEmail)

    const outcome = await ingestLead(LEAD, deps)

    expect(outcome).toEqual({ status: 'duplicate', leadId: 'lead-existing' })
    expect(supabase.leadsBuilder.insert).not.toHaveBeenCalled()
    expect(provider.upsertContact).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('no-lead-drop: ESP upsert throws → lead kept, esp_synced=false, error logged, outcome still ingested', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider({
      upsertContact: vi.fn(async () => {
        // The body carries potential PII — it must NOT be logged.
        throw new EspApiError(500, 'Server Error', { secret: 'do-not-log-this-body' })
      }),
    })
    const deps = makeDeps(supabase, provider, vi.fn(async () => undefined))

    const outcome = await ingestLead(LEAD, deps)

    expect(outcome.status).toBe('ingested')
    expect(outcome).toMatchObject({ espSynced: false, emailSent: true })
    // Lead was still inserted.
    expect(supabase.leadsBuilder.insert).toHaveBeenCalledTimes(1)
    // esp_synced NOT flipped to true.
    expect(supabase.leadsBuilder.update).not.toHaveBeenCalled()
    // An error row was written to so_esp_sync_log...
    const errorLog = supabase.syncLogInsert.mock.calls.find(
      (c) => (c[0] as { status: string }).status === 'error',
    )
    expect(errorLog).toBeDefined()
    // ...with only the coarse status, never the raw provider body.
    const logged = JSON.stringify(errorLog?.[0])
    expect(logged).toContain('500')
    expect(logged).not.toContain('do-not-log-this-body')
  })

  it('consent gating: tag() is NOT called when consent_launch is false', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, vi.fn(async () => undefined))

    const outcome = await ingestLead({ ...LEAD, consentLaunch: false }, deps)

    expect(outcome.status).toBe('ingested')
    expect(provider.upsertContact).toHaveBeenCalledTimes(1)
    expect(provider.tag).not.toHaveBeenCalled()
    // Upsert-only success still flips esp_synced.
    expect(supabase.leadsBuilder.update).toHaveBeenCalledWith({ esp_synced: true })
  })

  it('email send failure does not throw out of the orchestrator', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const sendEmail = vi.fn(async () => {
      throw new Error('resend down')
    })
    const deps = makeDeps(supabase, provider, sendEmail)

    const outcome = await ingestLead(LEAD, deps)

    expect(outcome).toMatchObject({ status: 'ingested', espSynced: true, emailSent: false })
  })

  it('skips ESP sync (but keeps the lead) when the provider is unregistered', async () => {
    const supabase = makeSupabase({
      campaign: {
        data: { ...CAMPAIGN, esp_provider: 'mailchimp' },
        error: null,
      },
    })
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, vi.fn(async () => undefined))

    const outcome = await ingestLead(LEAD, deps)

    expect(outcome).toMatchObject({ status: 'ingested', espSynced: false })
    expect(provider.upsertContact).not.toHaveBeenCalled()
  })
})
