// Shared HTTP utility for marketplace adapters.
// All adapter files use these instead of raw fetch().

type FetchOptions = RequestInit & { timeout?: number }

export class MarketplaceApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
    message?: string
  ) {
    super(message || `API error ${status}: ${statusText}`)
    this.name = 'MarketplaceApiError'
  }
}

export async function marketplaceFetch(
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
    throw new MarketplaceApiError(
      response.status,
      response.statusText,
      parsed
    )
  }

  return response
}

export async function marketplaceJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await marketplaceFetch(url, options)
  return response.json() as Promise<T>
}

export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}
