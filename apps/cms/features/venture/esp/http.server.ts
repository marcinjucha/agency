// Shared HTTP utility for ESP (Email Service Provider) adapters.
// Mirrors features/shop-marketplace/adapters/http.server.ts — the canonical
// provider-abstraction HTTP helper. Non-2xx responses THROW EspApiError so
// provider errors always surface to the caller (never silently swallowed).

type FetchOptions = RequestInit & { timeout?: number }

export class EspApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
    message?: string
  ) {
    super(message || `ESP API error ${status}: ${statusText}`)
    this.name = 'EspApiError'
  }
}

export async function espFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 15_000, ...fetchOptions } = options

  const response = await fetch(url, {
    ...fetchOptions,
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      parsed = body
    }
    throw new EspApiError(response.status, response.statusText, parsed)
  }

  return response
}

export async function espJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await espFetch(url, options)
  return response.json() as Promise<T>
}
