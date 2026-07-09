import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'

// The route file imports `createFileRoute` from '@tanstack/react-router' and the
// server read from '@/features/venture/server'. The global vitest.setup mock of
// '@tanstack/react-router' does NOT export createFileRoute, so we provide a local
// mock that simply returns the options object — this makes the handlers reachable
// as plain functions at Route.server.handlers.{GET,OPTIONS}.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}))

// Stub the server read layer — the route's job is HTTP shaping (status, headers,
// CORS, error redaction), which we test in isolation from the DB/anon client.
vi.mock('@/features/venture/server', () => ({
  getPublishedCampaignBySlug: vi.fn(),
}))

import { getPublishedCampaignBySlug } from '@/features/venture/server'
import { Route } from '../../../app/routes/api/venture/campaigns/$client/$slug'

// Reachable because createFileRoute is mocked to return its options object.
const handlers = (
  Route as unknown as {
    server: {
      handlers: {
        GET: (ctx: { request: Request }) => Promise<Response>
        OPTIONS: () => Promise<Response>
      }
    }
  }
).server.handlers

const CAMPAIGN = {
  slug: 'warsztaty',
  display_name: 'Kacper Launch',
  brand: { primary: '#111111', accent: '#00E5FF' },
  bonuses: [{ title: 'Bonus 1', description: 'first', type: 'link', url: 'https://a' }],
}

function get(url: string): Promise<Response> {
  return handlers.GET({ request: new Request(url) })
}

const mockRead = getPublishedCampaignBySlug as unknown as Mock

beforeEach(() => {
  mockRead.mockReset()
})

describe('GET /api/venture/campaigns/$client/$slug — route handler', () => {
  it('200 with the contract shape + edge-cache + CORS headers when the campaign exists', async () => {
    mockRead.mockReturnValue(okAsync(CAMPAIGN))

    const res = await get('https://cms/api/venture/campaigns/przystan-inwestorow/warsztaty')

    expect(res.status).toBe(200)
    expect(mockRead).toHaveBeenCalledWith('przystan-inwestorow', 'warsztaty')
    await expect(res.json()).resolves.toEqual(CAMPAIGN)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(res.headers.get('Vary')).toBe('Origin')
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600',
    )
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('404 with {error:"not_found"} when the read returns ok(null) — missing OR unpublished', async () => {
    mockRead.mockReturnValue(okAsync(null))

    const res = await get('https://cms/api/venture/campaigns/przystan-inwestorow/ghost')

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'not_found' })
    // 404 must not carry the long-lived edge-cache header meant for hits.
    expect(res.headers.get('Cache-Control')).toBeNull()
  })

  it('404 with {error:"not_found"} for an unknown client slug — never calls the read layer with the wrong scope', async () => {
    mockRead.mockReturnValue(okAsync(null))

    const res = await get('https://cms/api/venture/campaigns/unknown-client/warsztaty')

    expect(res.status).toBe(404)
    expect(mockRead).toHaveBeenCalledWith('unknown-client', 'warsztaty')
  })

  it('500 with {error:"internal_error"} and NO raw error in the body when the read errs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRead.mockReturnValue(errAsync('connection reset: secret-db-detail'))

    const res = await get('https://cms/api/venture/campaigns/przystan-inwestorow/warsztaty')

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'internal_error' })
    // The raw DB error must never reach the client.
    expect(JSON.stringify(body)).not.toContain('connection reset')
    expect(JSON.stringify(body)).not.toContain('secret-db-detail')

    spy.mockRestore()
  })

  it('404 when the campaign slug segment is empty (trailing slash) — never calls the read layer', async () => {
    const res = await get('https://cms/api/venture/campaigns/przystan-inwestorow/')

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'not_found' })
    expect(mockRead).not.toHaveBeenCalled()
  })

  it('404 when both segments are missing — never calls the read layer', async () => {
    const res = await get('https://cms/api/venture/campaigns/')

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'not_found' })
    expect(mockRead).not.toHaveBeenCalled()
  })
})

describe('OPTIONS /api/venture/campaigns/$client/$slug — CORS preflight', () => {
  it('204 with CORS headers and no body', async () => {
    const res = await handlers.OPTIONS()

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(res.headers.get('Vary')).toBe('Origin')

    const text = await res.text()
    expect(text).toBe('')
    // Preflight is not a data response — no read, no cache header.
    expect(mockRead).not.toHaveBeenCalled()
    expect(res.headers.get('Cache-Control')).toBeNull()
  })
})
