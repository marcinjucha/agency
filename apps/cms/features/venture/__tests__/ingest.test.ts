import { describe, it, expect, vi, beforeEach } from 'vitest'

// Isolate the orchestrator from @react-email rendering — the real builder is
// covered in bonus-email.test.ts. Here we only assert send-vs-not.
vi.mock('../mail/bonus-email', () => ({
  buildBonusEmail: vi.fn(async () => ({ subject: 'Subj', html: '<p>html</p>' })),
}))
import { buildBonusEmail } from '../mail/bonus-email'

// Isolate the real `resolveMailSender` path (used by the new gmail_smtp test
// below, exercising resolveMailSender for real rather than injecting a fake)
// from actual SMTP — nodemailer construction is covered in
// gmail-smtp.server.test.ts. The spy lets us assert the real provider-routing
// path actually invoked it with the right args.
const gmailSendSpy = vi.fn(async () => undefined)
vi.mock('../mail/gmail-smtp.server', () => ({
  createGmailSmtpSender: vi.fn(() => ({ send: gmailSendSpy })),
}))

import {
  ingestLead,
  ingestOutcomeStatus,
  resolveCampaign,
  type IngestDeps,
} from '../ingest.server'
import { EspApiError } from '../esp/http.server'
import type { EspProvider } from '../esp/types'
import type { MappedLead } from '../lead-sources/types'

const LEAD: MappedLead = {
  email: 'jan@example.com',
  name: 'Jan',
  source: 'youtube',
  consentLaunch: true,
  submissionId: 'sub_1',
}

// The campaign is now resolved by the route and INJECTED into ingestLead —
// tally_webhook_secret is carried on the row (route reads it; ingest ignores it).
// clientMail defaults to 'resend_shared' — resolveMailSender maps that (and
// any unrecognized provider) to the agency-shared Resend sender.
const CAMPAIGN = {
  id: 'campaign-1',
  tally_webhook_secret: 'whsec_test',
  esp_provider: 'beehiiv',
  esp_audience_ref: 'pub_123',
  esp_tag_launch: 'launch-notify',
  display_name: 'Kacper Launch',
  lead_source_provider: null,
  clientMail: {
    mail_provider: 'resend_shared',
    resend_api_key: null,
    resend_from_email: null,
    gmail_address: null,
    gmail_app_password: null,
    sender_name: null,
  },
  // client-theming: named-theme FK + inline fallback attached by resolveCampaign.
  // client* = so_clients own brand; tenant* = agency fallback (iter D2);
  // campaign* = per-launch tier (iter E2). All null here → fetchThemeTokens
  // returns {} for all three → resolveClientTheme falls to the neutral default.
  clientThemeId: null,
  clientTheme: null,
  tenantThemeId: null,
  tenantTheme: null,
  campaignThemeId: null,
  campaignBrand: null,
}

// The raw so_campaigns SELECT row (DB column names) that resolveCampaign maps
// into the domain CampaignRow above. `theme_id`/`brand` are the DB columns that
// become `campaignThemeId`/`campaignBrand`. Used as the campaign-query default so
// resolveCampaign's DB→domain mapping is exercised faithfully.
const CAMPAIGN_DB_ROW = {
  id: 'campaign-1',
  tally_webhook_secret: 'whsec_test',
  esp_provider: 'beehiiv',
  esp_audience_ref: 'pub_123',
  esp_tag_launch: 'launch-notify',
  display_name: 'Kacper Launch',
  lead_source_provider: null,
  theme_id: null,
  brand: null,
}

type Result = { data: unknown; error: { message: string; code?: string } | null }

// A per-table Supabase mock. so_leads carries 3 distinct ops disambiguated by
// which entry method is called first (select / insert / update).
function makeSupabase(cfg: {
  client?: Result
  campaign?: Result
  tenant?: Result
  duplicate?: Result
  insert?: Result
  bonuses?: Result
  themeRow?: Result
}) {
  const clientBuilder = {
    select: vi.fn(() => clientBuilder),
    eq: vi.fn(() => clientBuilder),
    maybeSingle: vi.fn(() =>
      Promise.resolve(
        cfg.client ?? {
          data: {
            id: 'client-1',
            tenant_id: 'tenant-1',
            theme_id: null,
            theme: null,
            ...CAMPAIGN.clientMail,
          },
          error: null,
        },
      ),
    ),
  }

  // tenants(theme_id, theme) lookup — resolveCampaign fetches the agency-brand
  // fallback by client.tenant_id after the campaign is confirmed to exist.
  const tenantBuilder = {
    select: vi.fn(() => tenantBuilder),
    eq: vi.fn(() => tenantBuilder),
    maybeSingle: vi.fn(() =>
      Promise.resolve(cfg.tenant ?? { data: { theme_id: null, theme: null }, error: null }),
    ),
  }

  // so_themes(tokens) lookup — fetchThemeTokens resolves a named-theme FK to its
  // tokens blob. Only queried when a *ThemeId is non-null.
  const themesBuilder = {
    select: vi.fn(() => themesBuilder),
    eq: vi.fn(() => themesBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(cfg.themeRow ?? { data: null, error: null })),
  }

  const campaignBuilder = {
    select: vi.fn(() => campaignBuilder),
    eq: vi.fn(() => campaignBuilder),
    maybeSingle: vi.fn(() => Promise.resolve(cfg.campaign ?? { data: CAMPAIGN_DB_ROW, error: null })),
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
      case 'so_clients':
        return clientBuilder
      case 'so_campaigns':
        return campaignBuilder
      case 'tenants':
        return tenantBuilder
      case 'so_leads':
        return leadsBuilder
      case 'so_bonuses':
        return bonusesBuilder
      case 'so_themes':
        return themesBuilder
      case 'so_esp_sync_log':
        return syncLogBuilder
      default:
        throw new Error(`unexpected table ${table}`)
    }
  })

  return {
    from,
    clientBuilder,
    campaignBuilder,
    tenantBuilder,
    themesBuilder,
    leadsBuilder,
    leadsUpdateChain,
    bonusesBuilder,
    syncLogInsert,
  }
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

// Fake mail sender — tests assert against `sender.send` instead of a bare
// `sendEmail` fn now that ingest resolves the sender via
// `resolveMailSender(campaign.clientMail)`.
function makeMailSender(send = vi.fn(async () => undefined)) {
  return { send }
}

function makeDeps(
  supabase: ReturnType<typeof makeSupabase>,
  provider: EspProvider,
  sender: ReturnType<typeof makeMailSender> = makeMailSender(),
): IngestDeps {
  return {
    supabase: supabase as unknown as IngestDeps['supabase'],
    getProvider: () => provider,
    isProviderRegistered: (id: string): id is 'beehiiv' => id === 'beehiiv',
    resolveMailSender: () => sender,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ingestLead', () => {
  it('inserts the lead, syncs to the ESP, tags on consent, sends the email (happy path)', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const sender = makeMailSender()
    const deps = makeDeps(supabase, provider, sender)

    const outcome = await ingestLead(deps, CAMPAIGN, LEAD)

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
    expect(sender.send).toHaveBeenCalledWith({
      to: 'jan@example.com',
      subject: 'Subj',
      html: '<p>html</p>',
    })
  })

  it('is idempotent — existing (campaign_id, tally_submission_id) → no insert, no ESP, no send', async () => {
    const supabase = makeSupabase({ duplicate: { data: { id: 'lead-existing' }, error: null } })
    const provider = makeProvider()
    const sender = makeMailSender()
    const deps = makeDeps(supabase, provider, sender)

    const outcome = await ingestLead(deps, CAMPAIGN, LEAD)

    expect(outcome).toEqual({ status: 'duplicate', leadId: 'lead-existing' })
    expect(supabase.leadsBuilder.insert).not.toHaveBeenCalled()
    expect(provider.upsertContact).not.toHaveBeenCalled()
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('insert 23505 unique_violation (concurrent/retry winner) → duplicate, no ESP, no email (route 200)', async () => {
    const supabase = makeSupabase({
      insert: { data: null, error: { message: 'duplicate key value', code: '23505' } },
    })
    const provider = makeProvider()
    const sender = makeMailSender()
    const deps = makeDeps(supabase, provider, sender)

    const outcome = await ingestLead(deps, CAMPAIGN, LEAD)

    // Benign — the winning concurrent/retried insert owns ESP + email.
    expect(outcome).toEqual({ status: 'duplicate', leadId: null })
    expect(supabase.leadsBuilder.insert).toHaveBeenCalledTimes(1)
    expect(provider.upsertContact).not.toHaveBeenCalled()
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('insert non-23505 error (transient) → insert_error, no ESP, no email (route 500 → Tally retries)', async () => {
    const supabase = makeSupabase({
      insert: { data: null, error: { message: 'connection reset by peer', code: '08006' } },
    })
    const provider = makeProvider()
    const sender = makeMailSender()
    const deps = makeDeps(supabase, provider, sender)

    const outcome = await ingestLead(deps, CAMPAIGN, LEAD)

    // The lead was NOT written by anyone — must be retryable, side-effects skipped.
    expect(outcome).toEqual({ status: 'insert_error' })
    expect(supabase.leadsBuilder.insert).toHaveBeenCalledTimes(1)
    expect(provider.upsertContact).not.toHaveBeenCalled()
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('no-lead-drop: ESP upsert throws → lead kept, esp_synced=false, error logged, outcome still ingested', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider({
      upsertContact: vi.fn(async () => {
        // The body carries potential PII — it must NOT be logged.
        throw new EspApiError(500, 'Server Error', { secret: 'do-not-log-this-body' })
      }),
    })
    const deps = makeDeps(supabase, provider, makeMailSender())

    const outcome = await ingestLead(deps, CAMPAIGN, LEAD)

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
    const deps = makeDeps(supabase, provider, makeMailSender())

    const outcome = await ingestLead(deps, CAMPAIGN, { ...LEAD, consentLaunch: false })

    expect(outcome.status).toBe('ingested')
    expect(provider.upsertContact).toHaveBeenCalledTimes(1)
    expect(provider.tag).not.toHaveBeenCalled()
    // Upsert-only success still flips esp_synced.
    expect(supabase.leadsBuilder.update).toHaveBeenCalledWith({ esp_synced: true })
  })

  it('email send failure does not throw out of the orchestrator', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const sender = makeMailSender(
      vi.fn(async () => {
        throw new Error('resend down')
      }),
    )
    const deps = makeDeps(supabase, provider, sender)

    const outcome = await ingestLead(deps, CAMPAIGN, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', espSynced: true, emailSent: false })
  })

  it('email optional — null email → lead inserted, ESP sync + bonus email skipped, providers never called', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const getProvider = vi.fn(() => provider)
    const sender = makeMailSender()
    const resolveMailSenderSpy = vi.fn(() => sender)
    const deps: IngestDeps = {
      supabase: supabase as unknown as IngestDeps['supabase'],
      getProvider,
      isProviderRegistered: (id: string): id is 'beehiiv' => id === 'beehiiv',
      resolveMailSender: resolveMailSenderSpy,
    }

    const outcome = await ingestLead(deps, CAMPAIGN, { ...LEAD, email: null })

    expect(outcome).toEqual({
      status: 'ingested',
      leadId: 'lead-1',
      espSynced: false,
      emailSent: false,
    })
    expect(supabase.leadsBuilder.insert).toHaveBeenCalledTimes(1)
    expect(getProvider).not.toHaveBeenCalled()
    expect(provider.upsertContact).not.toHaveBeenCalled()
    // Guard runs BEFORE mail-sender resolution — no email means no sender lookup.
    expect(resolveMailSenderSpy).not.toHaveBeenCalled()
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('skips ESP sync (but keeps the lead) when the provider is unregistered', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, makeMailSender())

    const outcome = await ingestLead(deps, { ...CAMPAIGN, esp_provider: 'mailchimp' }, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', espSynced: false })
    expect(provider.upsertContact).not.toHaveBeenCalled()
  })

  it('routes the bonus email through the campaign clientMail provider (gmail_smtp) via the REAL resolveMailSender — no deps.resolveMailSender injected', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    // Deliberately do NOT set deps.resolveMailSender — exercises the default
    // (real `resolveMailSender`) fallback in sendBonusEmail.
    const deps: IngestDeps = {
      supabase: supabase as unknown as IngestDeps['supabase'],
      getProvider: () => provider,
      isProviderRegistered: (id: string): id is 'beehiiv' => id === 'beehiiv',
    }
    const gmailCampaign = {
      ...CAMPAIGN,
      clientMail: {
        mail_provider: 'gmail_smtp',
        resend_api_key: null,
        resend_from_email: null,
        gmail_address: 'client@gmail.com',
        gmail_app_password: 'app-password-16-chars',
        sender_name: null,
      },
    }

    const outcome = await ingestLead(deps, gmailCampaign, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', emailSent: true })
    expect(gmailSendSpy).toHaveBeenCalledWith({
      to: 'jan@example.com',
      subject: 'Subj',
      html: '<p>html</p>',
    })
  })

  it('resolves the client theme override and feeds it to the bonus email builder', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, makeMailSender())
    // Client override wins over tenant (null) + neutral default. headerBackground
    // is dark / headerText light so the WCAG contrast guard keeps them as-is.
    const themedCampaign = {
      ...CAMPAIGN,
      clientTheme: {
        primary: '#123456',
        headerBackground: '#101820',
        headerText: '#fefefe',
      },
      tenantTheme: null,
    }

    const outcome = await ingestLead(deps, themedCampaign, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', emailSent: true })
    // The RESOLVED theme (client override backfilled by the default) reaches the
    // builder — proving the client+tenant themes were fed through resolveClientTheme.
    expect(buildBonusEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          primary: '#123456',
          headerBackground: '#101820',
          headerText: '#fefefe',
          // Untouched tokens backfill from HALO_EFEKT_DEFAULT.
          text: '#334155',
          footerText: '#94a3b8',
        }),
      }),
    )
  })

  it('resolves the client theme via theme_id (named-theme library) from so_themes', async () => {
    const supabase = makeSupabase({
      themeRow: {
        data: {
          tokens: { primary: '#123456', headerBackground: '#101820', headerText: '#fefefe' },
        },
        error: null,
      },
    })
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, makeMailSender())
    // Client carries a named-theme FK (theme_id) and NO inline theme — the tokens
    // come from so_themes, not the inline JSONB.
    const themedCampaign = {
      ...CAMPAIGN,
      clientThemeId: 'theme-1',
      clientTheme: null,
      tenantThemeId: null,
      tenantTheme: null,
    }

    const outcome = await ingestLead(deps, themedCampaign, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', emailSent: true })
    // so_themes was queried by the FK id.
    expect(supabase.themesBuilder.eq).toHaveBeenCalledWith('id', 'theme-1')
    // The tokens from so_themes reach the builder (backfilled by the default).
    expect(buildBonusEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          primary: '#123456',
          headerBackground: '#101820',
          headerText: '#fefefe',
          text: '#334155',
        }),
      }),
    )
  })

  it('campaign tier: a campaign theme_id (named library) wins over the client override', async () => {
    const supabase = makeSupabase({
      themeRow: {
        data: { tokens: { primary: '#0d1b2a', headerBackground: '#101820', headerText: '#fefefe' } },
        error: null,
      },
    })
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, makeMailSender())
    // Campaign carries a named-theme FK; the client has its own inline override.
    // The campaign tier is most-specific → its tokens win.
    const themedCampaign = {
      ...CAMPAIGN,
      campaignThemeId: 'campaign-theme-1',
      campaignBrand: null,
      clientTheme: { primary: '#999999' },
      tenantTheme: null,
    }

    const outcome = await ingestLead(deps, themedCampaign, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', emailSent: true })
    expect(supabase.themesBuilder.eq).toHaveBeenCalledWith('id', 'campaign-theme-1')
    expect(buildBonusEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          primary: '#0d1b2a', // campaign named-theme wins, NOT the client's #999999
          headerBackground: '#101820',
          headerText: '#fefefe',
          text: '#334155', // untouched → default backfill
        }),
      }),
    )
  })

  it('campaign tier: a brand-only campaign (no theme_id) colours the email via brandToThemeTokens', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, makeMailSender())
    // Legacy campaign brand blob, NO named-theme FK. brandToThemeTokens adapts it
    // (bg→background) and it becomes the campaign source (wins over client/tenant).
    const brandCampaign = {
      ...CAMPAIGN,
      campaignThemeId: null,
      campaignBrand: { primary: '#123456', bg: '#0a0a0a' },
      clientTheme: { primary: '#999999' },
      tenantTheme: null,
    }

    const outcome = await ingestLead(deps, brandCampaign, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', emailSent: true })
    // theme_id null everywhere → so_themes never queried; the brand adapter is
    // the only campaign source.
    expect(supabase.themesBuilder.select).not.toHaveBeenCalled()
    expect(buildBonusEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          primary: '#123456', // from the adapted campaign brand, wins over client
          background: '#0a0a0a', // bg → background remap
        }),
      }),
    )
  })

  it('byte-identical: campaign theme_id NULL + brand NULL → client/tenant resolution unchanged', async () => {
    const supabase = makeSupabase({})
    const provider = makeProvider()
    const deps = makeDeps(supabase, provider, makeMailSender())
    // No campaign tier at all — a client override is present. The result must be
    // exactly the pre-campaign-tier (D2) client-over-tenant resolution.
    const noCampaignTheme = {
      ...CAMPAIGN,
      campaignThemeId: null,
      campaignBrand: null,
      clientTheme: { primary: '#123456', headerBackground: '#101820', headerText: '#fefefe' },
      tenantTheme: null,
    }

    const outcome = await ingestLead(deps, noCampaignTheme, LEAD)

    expect(outcome).toMatchObject({ status: 'ingested', emailSent: true })
    // Campaign tier inert → so_themes never queried (no FK on any tier).
    expect(supabase.themesBuilder.select).not.toHaveBeenCalled()
    expect(buildBonusEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          primary: '#123456',
          headerBackground: '#101820',
          headerText: '#fefefe',
          text: '#334155',
          footerText: '#94a3b8',
        }),
      }),
    )
  })
})

// resolveCampaign now resolves client-scoped slugs — the client is resolved
// first, then the campaign is looked up scoped to that client's id.
describe('resolveCampaign', () => {
  it('resolves the client by slug, then the campaign scoped to that client id + campaign slug', async () => {
    const supabase = makeSupabase({})

    const result = await resolveCampaign(
      supabase as unknown as Parameters<typeof resolveCampaign>[0],
      'przystan-inwestorow',
      'warsztaty',
    )

    expect(result).toEqual({ kind: 'found', campaign: CAMPAIGN })
    expect(supabase.clientBuilder.eq).toHaveBeenCalledWith('slug', 'przystan-inwestorow')
    expect(supabase.campaignBuilder.eq).toHaveBeenCalledWith('client_id', 'client-1')
    expect(supabase.campaignBuilder.eq).toHaveBeenCalledWith('slug', 'warsztaty')
  })

  it('returns not_found when the client slug does not resolve (no error) — never queries so_campaigns', async () => {
    const supabase = makeSupabase({ client: { data: null, error: null } })

    const result = await resolveCampaign(
      supabase as unknown as Parameters<typeof resolveCampaign>[0],
      'unknown-client',
      'warsztaty',
    )

    expect(result).toEqual({ kind: 'not_found' })
    expect(supabase.campaignBuilder.select).not.toHaveBeenCalled()
  })

  // Regression test for the client-scoped-slug pivot: a campaign slug that is
  // known to exist, but under a DIFFERENT client than the one resolved here,
  // must NOT resolve. This is the isolation guarantee the whole pivot exists
  // to provide — a slug collision across clients must never cross-resolve.
  it('client isolation: a known campaign slug belonging to ANOTHER client → not_found (never cross-resolves)', async () => {
    const supabase = makeSupabase({
      client: { data: { id: 'client-1' }, error: null },
      // Simulates the DB-level (client_id, slug) filter finding nothing for
      // client-1, even though "warsztaty" exists under some other client.
      campaign: { data: null, error: null },
    })

    const result = await resolveCampaign(
      supabase as unknown as Parameters<typeof resolveCampaign>[0],
      'przystan-inwestorow',
      'warsztaty',
    )

    expect(result).toEqual({ kind: 'not_found' })
    // Proves the campaign lookup was scoped to THIS client's id.
    expect(supabase.campaignBuilder.eq).toHaveBeenCalledWith('client_id', 'client-1')
  })

  it('db_error: client lookup query fails → db_error, never queries so_campaigns (must NOT collapse to not_found)', async () => {
    const supabase = makeSupabase({
      client: { data: null, error: { message: 'connection reset' } },
    })

    const result = await resolveCampaign(
      supabase as unknown as Parameters<typeof resolveCampaign>[0],
      'przystan-inwestorow',
      'warsztaty',
    )

    expect(result).toEqual({ kind: 'db_error' })
    expect(supabase.campaignBuilder.select).not.toHaveBeenCalled()
  })

  it('db_error: campaign lookup query fails (client resolves fine) → db_error', async () => {
    const supabase = makeSupabase({
      campaign: { data: null, error: { message: 'statement timeout' } },
    })

    const result = await resolveCampaign(
      supabase as unknown as Parameters<typeof resolveCampaign>[0],
      'przystan-inwestorow',
      'warsztaty',
    )

    expect(result).toEqual({ kind: 'db_error' })
  })
})

// Pure status→HTTP mapping (the route's testable seam) — asserts the corrected
// contract without any TanStack route scaffolding.
describe('ingestOutcomeStatus', () => {
  it('maps ingested → 200', () => {
    expect(
      ingestOutcomeStatus({ status: 'ingested', leadId: 'lead-1', espSynced: true, emailSent: true }),
    ).toBe(200)
  })

  it('maps duplicate → 200 (winner already persisted)', () => {
    expect(ingestOutcomeStatus({ status: 'duplicate', leadId: 'lead-existing' })).toBe(200)
    expect(ingestOutcomeStatus({ status: 'duplicate', leadId: null })).toBe(200)
  })

  it('maps insert_error → 500 (genuine write failure → Tally retries)', () => {
    expect(ingestOutcomeStatus({ status: 'insert_error' })).toBe(500)
  })
})
