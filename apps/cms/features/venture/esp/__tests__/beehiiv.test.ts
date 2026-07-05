import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { beehiivProvider } from '../beehiiv.server'
import { EspApiError } from '../http.server'

const API_BASE = 'https://api.beehiiv.com/v2'
const PUB = 'pub_abc123'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

function lastFetchCall() {
  const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
  return fetchMock.mock.calls[0] as [string, RequestInit]
}

describe('beehiivProvider', () => {
  beforeEach(() => {
    process.env.BEEHIIV_API_KEY = 'test-key-123'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.BEEHIIV_API_KEY
  })

  describe('upsertContact', () => {
    it('POSTs to the publication subscriptions endpoint with email + reactivate_existing and returns contactId from data.id', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: { id: 'sub_987', email: 'jan@example.com' } })
      )

      const result = await beehiivProvider.upsertContact({
        audienceRef: PUB,
        email: 'jan@example.com',
      })

      expect(result).toEqual({ contactId: 'sub_987' })

      const [url, init] = lastFetchCall()
      expect(url).toBe(`${API_BASE}/publications/${PUB}/subscriptions`)
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toMatchObject({
        email: 'jan@example.com',
        reactivate_existing: true,
      })
      expect(
        (init.headers as Record<string, string>)['Authorization']
      ).toBe('Bearer test-key-123')
    })

    it('maps name + fields into the custom_fields array', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: { id: 'sub_42' } })
      )

      await beehiivProvider.upsertContact({
        audienceRef: PUB,
        email: 'ola@example.com',
        name: 'Ola',
        fields: { source: 'youtube' },
      })

      const [, init] = lastFetchCall()
      expect(JSON.parse(init.body as string)).toEqual({
        email: 'ola@example.com',
        reactivate_existing: true,
        custom_fields: [
          { name: 'name', value: 'Ola' },
          { name: 'source', value: 'youtube' },
        ],
      })
    })

    it('omits custom_fields when neither name nor fields are provided', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: { id: 'sub_1' } })
      )

      await beehiivProvider.upsertContact({
        audienceRef: PUB,
        email: 'x@example.com',
      })

      const [, init] = lastFetchCall()
      expect(JSON.parse(init.body as string)).not.toHaveProperty('custom_fields')
    })
  })

  describe('tag', () => {
    it('POSTs the tag to the publication-scoped subscription tags endpoint', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ ok: true })
      )

      await beehiivProvider.tag({
        audienceRef: PUB,
        contactId: 'sub_987',
        tag: 'launch-notify',
      })

      const [url, init] = lastFetchCall()
      expect(url).toBe(
        `${API_BASE}/publications/${PUB}/subscriptions/sub_987/tags`
      )
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({
        tags: ['launch-notify'],
      })
    })
  })

  describe('error path', () => {
    it('surfaces a non-2xx response as EspApiError (not a swallowed success)', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ errors: [{ message: 'unauthorized' }] }, 401)
      )

      await expect(
        beehiivProvider.upsertContact({ audienceRef: PUB, email: 'x@example.com' })
      ).rejects.toBeInstanceOf(EspApiError)
    })
  })
})
