import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import crypto from 'node:crypto'

// The route imports `createFileRoute` from '@tanstack/react-router'. The global
// vitest.setup mock does NOT export it, so provide a local mock that returns the
// options object — makes the POST handler reachable as a plain function.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}))

// Service client is irrelevant here — the ingest orchestrator is mocked. Return
// a dummy so `createServiceClient()` doesn't touch env/network.
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))

// Stub the ingest orchestrator: the route's job under test is RESOLUTION +
// signature verification + HTTP shaping. resolveCampaign feeds the campaign;
// ingestLead is only reached on the happy path.
vi.mock('@/features/venture/ingest.server', () => ({
  resolveCampaign: vi.fn(),
  ingestLead: vi.fn(),
  ingestOutcomeStatus: vi.fn(() => 200),
}))

import { resolveCampaign, ingestLead } from '@/features/venture/ingest.server'
// Real lead-sources registry (resolveLeadSource + tally verify) — NOT mocked, so
// the NULL→401 / unknown→401 / valid-signature→200 paths exercise real logic.
import { Route } from '../../../app/routes/api/venture/leads/$client/$slug'

const handlers = (
  Route as unknown as {
    server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } }
  }
).server.handlers

const mockResolve = resolveCampaign as unknown as Mock
const mockIngest = ingestLead as unknown as Mock

const SECRET = 'super-secret-signing-key'
const URL = 'https://cms/api/venture/leads/przystan-inwestorow/warsztaty'

const sign = (body: string): string =>
  crypto.createHmac('sha256', SECRET).update(body, 'utf8').digest('base64')

// A minimal campaign row as resolveCampaign returns it.
function campaign(overrides: Record<string, unknown>) {
  return {
    kind: 'found',
    campaign: {
      id: 'camp-1',
      tally_webhook_secret: SECRET,
      esp_provider: 'beehiiv',
      esp_audience_ref: null,
      esp_tag_launch: 'launch-notify',
      display_name: 'Launch',
      clientMail: {},
      lead_source_provider: null,
      ...overrides,
    },
  }
}

function post(body: string, headers: Record<string, string> = {}): Promise<Response> {
  return handlers.POST({ request: new Request(URL, { method: 'POST', body, headers }) })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/venture/leads — lead-source provider resolution', () => {
  it('401 when the campaign has NO provider (NULL = draft, nothing to ingest) — never reaches ingest', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockResolve.mockResolvedValue(campaign({ lead_source_provider: null }))

    // Even a "valid" body — resolution short-circuits before verify/parse/ingest.
    const res = await post('{}')

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'invalid_signature' })
    expect(mockIngest).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('401 for an UNREGISTERED provider value WITHOUT throwing (iter-1 LOW fix) — never reaches ingest', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockResolve.mockResolvedValue(campaign({ lead_source_provider: 'mystery' }))

    // Must resolve to a uniform 401, NOT an unhandled throw / 500.
    const res = await post('{}')

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'invalid_signature' })
    expect(mockIngest).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('401 when the provider is registered but the campaign has no secret (draft)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockResolve.mockResolvedValue(
      campaign({ lead_source_provider: 'tally', tally_webhook_secret: null }),
    )

    const res = await post('{}')

    expect(res.status).toBe(401)
    expect(mockIngest).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('200 for a registered provider + valid signature → reaches ingest', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockResolve.mockResolvedValue(campaign({ lead_source_provider: 'tally' }))
    mockIngest.mockResolvedValue({
      status: 'ingested',
      leadId: 'lead-1',
      espSynced: false,
      emailResult: 'skipped',
    })

    const rawBody = JSON.stringify({
      eventType: 'FORM_RESPONSE',
      data: {
        submissionId: 'sub_1',
        fields: [{ key: 'q', label: 'Email', type: 'INPUT_EMAIL', value: 'a@b.pl' }],
      },
    })
    const res = await post(rawBody, { 'Tally-Signature': sign(rawBody) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mockIngest).toHaveBeenCalledTimes(1)
    log.mockRestore()
  })

  it('401 for a registered provider + secret but an INVALID signature', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockResolve.mockResolvedValue(campaign({ lead_source_provider: 'tally' }))

    const res = await post('{"eventType":"FORM_RESPONSE"}', {
      'Tally-Signature': 'not-a-valid-signature',
    })

    expect(res.status).toBe(401)
    expect(mockIngest).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
