import type {
  MarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceCategory,
  PublishPayload,
  PublishResult,
  ListingStatusResult,
  ImportedListing,
} from './types'
import {
  marketplaceFetch,
  marketplaceJson,
  authHeaders,
  MarketplaceApiError,
} from './http'

// --- Constants ---

const OLX_AUTH_URL = 'https://www.olx.pl/oauth/authorize'
const OLX_TOKEN_URL = 'https://www.olx.pl/api/open/oauth/token'
const OLX_API_BASE = 'https://www.olx.pl/api/partner'

function getClientId(): string {
  const id = process.env.OLX_CLIENT_ID
  if (!id) throw new Error('Missing OLX_CLIENT_ID environment variable')
  return id
}

function getClientSecret(): string {
  const secret = process.env.OLX_CLIENT_SECRET
  if (!secret) throw new Error('Missing OLX_CLIENT_SECRET environment variable')
  return secret
}

// --- Status mapping ---

const OLX_STATUS_MAP: Record<string, ListingStatusResult['status']> = {
  active: 'active',
  limited: 'active',
  removed_by_user: 'removed',
  outdated: 'expired',
  disabled: 'removed',
  moderated: 'removed',
}

function mapOlxStatus(olxStatus: string): ListingStatusResult['status'] {
  return OLX_STATUS_MAP[olxStatus] ?? 'removed'
}

// --- Helper: build advert body ---

function buildAdvertBody(payload: PublishPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: payload.title,
    description: payload.description,
    price: {
      value: payload.price,
      currency: payload.currency.toUpperCase(),
      negotiable: false,
    },
    images: payload.images.map((url) => ({ url })),
  }

  if (payload.categoryId) {
    body.category_id = Number(payload.categoryId)
  }

  if (payload.contact) {
    body.contact = {
      name: payload.contact.name,
      phone: payload.contact.phone,
    }
  }

  if (payload.location) {
    body.location = {
      city: payload.location.city,
      region: payload.location.region,
      lat: payload.location.lat,
      lon: payload.location.lon,
    }
  }

  if (payload.params) {
    body.params = Object.entries(payload.params).map(([key, value]) => ({
      key,
      value,
    }))
  }

  return body
}

// --- Adapter implementation ---

export const olxAdapter: MarketplaceAdapter = {
  id: 'olx',
  name: 'OLX',

  // --- OAuth ---

  getAuthUrl(tenantId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: getClientId(),
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'read write v2',
      state: tenantId,
    })
    return `${OLX_AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<MarketplaceCredentials> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: redirectUri,
    })

    const data = await marketplaceJson<{
      access_token: string
      refresh_token: string
      expires_in: number
    }>(OLX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  },

  async refreshToken(
    credentials: MarketplaceCredentials
  ): Promise<MarketplaceCredentials> {
    if (!credentials.refreshToken) {
      throw new Error('No refresh token available for OLX')
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: credentials.refreshToken,
    })

    const data = await marketplaceJson<{
      access_token: string
      refresh_token: string
      expires_in: number
    }>(OLX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  },

  // --- Publishing ---

  async publish(
    payload: PublishPayload,
    credentials: MarketplaceCredentials
  ): Promise<PublishResult> {
    try {
      const data = await marketplaceJson<{ id: number; url: string }>(
        `${OLX_API_BASE}/adverts`,
        {
          method: 'POST',
          headers: authHeaders(credentials.accessToken),
          body: JSON.stringify(buildAdvertBody(payload)),
        }
      )

      return {
        success: true,
        externalListingId: String(data.id),
        externalUrl: data.url,
      }
    } catch (err) {
      const message =
        err instanceof MarketplaceApiError
          ? `OLX API error ${err.status}: ${JSON.stringify(err.body)}`
          : err instanceof Error
            ? err.message
            : 'Unknown error publishing to OLX'
      return { success: false, error: message }
    }
  },

  async updateListing(
    externalId: string,
    payload: PublishPayload,
    credentials: MarketplaceCredentials
  ): Promise<PublishResult> {
    try {
      const data = await marketplaceJson<{ id: number; url: string }>(
        `${OLX_API_BASE}/adverts/${externalId}`,
        {
          method: 'PUT',
          headers: authHeaders(credentials.accessToken),
          body: JSON.stringify(buildAdvertBody(payload)),
        }
      )

      return {
        success: true,
        externalListingId: String(data.id),
        externalUrl: data.url,
      }
    } catch (err) {
      const message =
        err instanceof MarketplaceApiError
          ? `OLX API error ${err.status}: ${JSON.stringify(err.body)}`
          : err instanceof Error
            ? err.message
            : 'Unknown error updating OLX listing'
      return { success: false, error: message }
    }
  },

  async removeListing(
    externalId: string,
    credentials: MarketplaceCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await marketplaceFetch(`${OLX_API_BASE}/adverts/${externalId}`, {
        method: 'DELETE',
        headers: authHeaders(credentials.accessToken),
      })
      return { success: true }
    } catch (err) {
      const message =
        err instanceof MarketplaceApiError
          ? `OLX API error ${err.status}: ${JSON.stringify(err.body)}`
          : err instanceof Error
            ? err.message
            : 'Unknown error removing OLX listing'
      return { success: false, error: message }
    }
  },

  // --- Status ---

  async getListingStatus(
    externalId: string,
    credentials: MarketplaceCredentials
  ): Promise<ListingStatusResult> {
    try {
      const data = await marketplaceJson<{
        id: number
        status: string
        valid_to: string
      }>(`${OLX_API_BASE}/adverts/${externalId}`, {
        method: 'GET',
        headers: authHeaders(credentials.accessToken),
      })

      return {
        externalListingId: String(data.id),
        status: mapOlxStatus(data.status),
        expiresAt: data.valid_to || undefined,
      }
    } catch (err) {
      return {
        externalListingId: externalId,
        status: 'removed',
        error:
          err instanceof Error ? err.message : 'Failed to fetch OLX status',
      }
    }
  },

  async getListingStatuses(
    externalIds: string[],
    credentials: MarketplaceCredentials
  ): Promise<ListingStatusResult[]> {
    // OLX has no batch status endpoint — fetch individually
    return Promise.all(
      externalIds.map((id) => this.getListingStatus(id, credentials))
    )
  },

  // --- Categories ---

  async getCategories(
    credentials: MarketplaceCredentials,
    parentId?: string
  ): Promise<MarketplaceCategory[]> {
    const url = parentId
      ? `${OLX_API_BASE}/categories/${parentId}`
      : `${OLX_API_BASE}/categories`

    const data = await marketplaceJson<{
      data: Array<{
        id: number
        name: string
        parent_id: number | null
        children: unknown[]
      }>
    }>(url, {
      method: 'GET',
      headers: authHeaders(credentials.accessToken),
    })

    return data.data.map((cat) => ({
      id: String(cat.id),
      name: cat.name,
      parentId: cat.parent_id ? String(cat.parent_id) : undefined,
      hasChildren:
        Array.isArray(cat.children) && cat.children.length > 0,
    }))
  },

  // --- Import ---

  async *importListings(
    credentials: MarketplaceCredentials,
    options?: { cursor?: string; limit?: number }
  ): AsyncGenerator<ImportedListing> {
    const limit = options?.limit ?? 50
    let offset = options?.cursor ? Number(options.cursor) : 0

    while (true) {
      const data = await marketplaceJson<{
        data: Array<{
          id: number
          url: string
          title: string
          description: string
          price: { value: number; currency: string }
          photos: Array<{ link: string }>
          category_id: number
        }>
      }>(
        `${OLX_API_BASE}/user/adverts?offset=${offset}&limit=${limit}`,
        {
          method: 'GET',
          headers: authHeaders(credentials.accessToken),
        }
      )

      if (!data.data || data.data.length === 0) break

      for (const advert of data.data) {
        yield {
          title: advert.title,
          description: advert.description,
          price: advert.price?.value ?? 0,
          currency: advert.price?.currency ?? 'PLN',
          images: (advert.photos ?? []).map((p) => p.link),
          categoryId: advert.category_id
            ? String(advert.category_id)
            : undefined,
          externalListingId: String(advert.id),
          externalUrl: advert.url,
        }
      }

      if (data.data.length < limit) break
      offset += limit
    }
  },
}
