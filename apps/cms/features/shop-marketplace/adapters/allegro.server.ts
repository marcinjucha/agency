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
  MarketplaceApiError,
} from './http.server'

// --- Constants ---

const isSandbox = process.env.ALLEGRO_SANDBOX === 'true'

const ALLEGRO_AUTH_URL = isSandbox
  ? 'https://allegro.pl.allegrosandbox.pl/auth/oauth/authorize'
  : 'https://allegro.pl/auth/oauth/authorize'

const ALLEGRO_TOKEN_URL = isSandbox
  ? 'https://allegro.pl.allegrosandbox.pl/auth/oauth/token'
  : 'https://allegro.pl/auth/oauth/token'

const ALLEGRO_API_BASE = isSandbox
  ? 'https://api.allegro.pl.allegrosandbox.pl'
  : 'https://api.allegro.pl'

/** Allegro root category ID — used as fallback when no parent category is specified */
const ALLEGRO_ROOT_CATEGORY_ID = '954b95b6-43cf-4104-8354-dea4d9b10f31'

const ALLEGRO_ACCEPT = 'application/vnd.allegro.public.v1+json'
const ALLEGRO_CONTENT_TYPE = 'application/vnd.allegro.public.v1+json'

function getClientId(): string {
  const id = process.env.ALLEGRO_CLIENT_ID
  if (!id) throw new Error('Missing ALLEGRO_CLIENT_ID environment variable')
  return id
}

function getClientSecret(): string {
  const secret = process.env.ALLEGRO_CLIENT_SECRET
  if (!secret)
    throw new Error('Missing ALLEGRO_CLIENT_SECRET environment variable')
  return secret
}

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')}`
}

function allegroHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: ALLEGRO_ACCEPT,
    'Content-Type': ALLEGRO_CONTENT_TYPE,
  }
}

// --- Status mapping ---

const ALLEGRO_STATUS_MAP: Record<string, ListingStatusResult['status']> = {
  ACTIVE: 'active',
  INACTIVE: 'removed',
  ACTIVATING: 'active',
  ENDED: 'expired',
}

function mapAllegroStatus(
  allegroStatus: string
): ListingStatusResult['status'] {
  return ALLEGRO_STATUS_MAP[allegroStatus] ?? 'removed'
}

// --- Helper: build offer body ---

function buildOfferBody(payload: PublishPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.title,
    description: {
      sections: [
        {
          items: [
            {
              type: 'TEXT',
              content: payload.description,
            },
          ],
        },
      ],
    },
    sellingMode: {
      format: 'BUY_NOW',
      price: {
        amount: String(payload.price),
        currency: payload.currency.toUpperCase(),
      },
    },
    stock: { available: 1 },
    images: payload.images.map((url) => ({ url })),
    publication: { status: 'ACTIVE' },
  }

  if (payload.categoryId) {
    body.category = { id: payload.categoryId }
  }

  if (payload.duration) {
    body.publication = {
      ...(body.publication as Record<string, unknown>),
      duration: `P${payload.duration}D`,
    }
  }

  if (payload.location) {
    body.location = {
      city: payload.location.city,
      countryCode: 'PL',
    }
  }

  if (payload.params) {
    body.parameters = Object.entries(payload.params).map(([id, value]) => ({
      id,
      values: Array.isArray(value) ? value : [String(value)],
    }))
  }

  return body
}

// --- Standalone status fetch (avoids `this` binding issues) ---

async function fetchAllegroListingStatus(
  externalId: string,
  credentials: MarketplaceCredentials
): Promise<ListingStatusResult> {
  try {
    const data = await marketplaceJson<{
      id: string
      publication: { status: string; endingAt?: string }
    }>(`${ALLEGRO_API_BASE}/sale/product-offers/${externalId}`, {
      method: 'GET',
      headers: allegroHeaders(credentials.accessToken),
    })

    return {
      externalListingId: data.id,
      status: mapAllegroStatus(data.publication?.status ?? 'INACTIVE'),
      expiresAt: data.publication?.endingAt || undefined,
    }
  } catch (err) {
    return {
      externalListingId: externalId,
      status: 'removed',
      error:
        err instanceof Error
          ? err.message
          : 'Failed to fetch Allegro status',
    }
  }
}

// --- Adapter implementation ---

export const allegroAdapter: MarketplaceAdapter = {
  id: 'allegro',
  name: 'Allegro',

  // --- OAuth ---

  getAuthUrl(tenantId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: getClientId(),
      redirect_uri: redirectUri,
    })
    return `${ALLEGRO_AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<MarketplaceCredentials> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const data = await marketplaceJson<{
      access_token: string
      refresh_token: string
      expires_in: number
    }>(ALLEGRO_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      throw new Error('No refresh token available for Allegro')
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken,
    })

    const data = await marketplaceJson<{
      access_token: string
      refresh_token: string
      expires_in: number
    }>(ALLEGRO_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      const data = await marketplaceJson<{
        id: string
        external?: { url?: string }
      }>(`${ALLEGRO_API_BASE}/sale/product-offers`, {
        method: 'POST',
        headers: allegroHeaders(credentials.accessToken),
        body: JSON.stringify(buildOfferBody(payload)),
      })

      return {
        success: true,
        externalListingId: data.id,
        externalUrl:
          data.external?.url ??
          `https://allegro.pl/oferta/${data.id}`,
      }
    } catch (err) {
      const message =
        err instanceof MarketplaceApiError
          ? `Allegro API error ${err.status}: ${JSON.stringify(err.body)}`
          : err instanceof Error
            ? err.message
            : 'Unknown error publishing to Allegro'
      return { success: false, error: message }
    }
  },

  async updateListing(
    externalId: string,
    payload: PublishPayload,
    credentials: MarketplaceCredentials
  ): Promise<PublishResult> {
    try {
      const data = await marketplaceJson<{
        id: string
        external?: { url?: string }
      }>(`${ALLEGRO_API_BASE}/sale/product-offers/${externalId}`, {
        method: 'PATCH',
        headers: allegroHeaders(credentials.accessToken),
        body: JSON.stringify(buildOfferBody(payload)),
      })

      return {
        success: true,
        externalListingId: data.id,
        externalUrl:
          data.external?.url ??
          `https://allegro.pl/oferta/${data.id}`,
      }
    } catch (err) {
      const message =
        err instanceof MarketplaceApiError
          ? `Allegro API error ${err.status}: ${JSON.stringify(err.body)}`
          : err instanceof Error
            ? err.message
            : 'Unknown error updating Allegro listing'
      return { success: false, error: message }
    }
  },

  async removeListing(
    externalId: string,
    credentials: MarketplaceCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Allegro ends an offer by changing its publication status
      await marketplaceFetch(
        `${ALLEGRO_API_BASE}/sale/product-offers/${externalId}`,
        {
          method: 'PATCH',
          headers: allegroHeaders(credentials.accessToken),
          body: JSON.stringify({
            publication: { status: 'END' },
          }),
        }
      )
      return { success: true }
    } catch (err) {
      const message =
        err instanceof MarketplaceApiError
          ? `Allegro API error ${err.status}: ${JSON.stringify(err.body)}`
          : err instanceof Error
            ? err.message
            : 'Unknown error removing Allegro listing'
      return { success: false, error: message }
    }
  },

  // --- Status ---

  getListingStatus: fetchAllegroListingStatus,

  async getListingStatuses(
    externalIds: string[],
    credentials: MarketplaceCredentials
  ): Promise<ListingStatusResult[]> {
    // Allegro has no batch status endpoint — fetch individually
    return Promise.all(
      externalIds.map((id) => fetchAllegroListingStatus(id, credentials))
    )
  },

  // --- Categories ---

  async getCategories(
    credentials: MarketplaceCredentials,
    parentId?: string
  ): Promise<MarketplaceCategory[]> {
    const categoryParam = parentId ?? ALLEGRO_ROOT_CATEGORY_ID
    const data = await marketplaceJson<{
      categories: Array<{
        id: string
        name: string
        parent?: { id: string }
        leaf: boolean
      }>
    }>(
      `${ALLEGRO_API_BASE}/sale/categories?parent.id=${categoryParam}`,
      {
        method: 'GET',
        headers: allegroHeaders(credentials.accessToken),
      }
    )

    return (data.categories ?? []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parent?.id,
      hasChildren: !cat.leaf,
    }))
  },

  // --- Import ---

  async *importListings(
    credentials: MarketplaceCredentials,
    options?: { cursor?: string; limit?: number }
  ): AsyncGenerator<ImportedListing> {
    const limit = options?.limit ?? 50
    let cursor = options?.cursor ?? undefined

    while (true) {
      const params = new URLSearchParams({
        limit: String(limit),
        ...(cursor ? { 'offset' : cursor } : {}),
      })

      const data = await marketplaceJson<{
        offers: Array<{
          id: string
          name: string
          description?: { sections?: Array<{ items?: Array<{ content?: string }> }> }
          sellingMode?: { price?: { amount: string; currency: string } }
          primaryImage?: { url: string }
          images?: Array<{ url: string }>
          category?: { id: string }
          external?: { url?: string }
        }>
        nextPage?: { uri?: string }
      }>(`${ALLEGRO_API_BASE}/sale/product-offers?${params.toString()}`, {
        method: 'GET',
        headers: allegroHeaders(credentials.accessToken),
      })

      if (!data.offers || data.offers.length === 0) break

      for (const offer of data.offers) {
        const descriptionText =
          offer.description?.sections
            ?.flatMap((s) => s.items?.map((i) => i.content) ?? [])
            .filter(Boolean)
            .join('\n') ?? ''

        const images = (offer.images ?? []).map((img) => img.url)
        if (offer.primaryImage?.url && !images.includes(offer.primaryImage.url)) {
          images.unshift(offer.primaryImage.url)
        }

        yield {
          title: offer.name,
          description: descriptionText,
          price: Number(offer.sellingMode?.price?.amount ?? 0),
          currency: offer.sellingMode?.price?.currency ?? 'PLN',
          images,
          categoryId: offer.category?.id,
          externalListingId: offer.id,
          externalUrl:
            offer.external?.url ?? `https://allegro.pl/oferta/${offer.id}`,
        }
      }

      // Cursor-based pagination: extract offset from nextPage URI
      if (!data.nextPage?.uri) break
      const nextUrl = new URL(
        data.nextPage.uri,
        ALLEGRO_API_BASE
      )
      cursor = nextUrl.searchParams.get('offset') ?? undefined
      if (!cursor) break
    }
  },
}
