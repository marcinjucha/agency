import type { MarketplaceId } from '../types'

// --- Shared adapter types ---

export type MarketplaceCredentials = {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export type MarketplaceLocation = {
  city?: string
  region?: string
  lat?: number
  lon?: number
}

export type PublishPayload = {
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  categoryId?: string
  location?: MarketplaceLocation
  params?: Record<string, unknown>
}

export type PublishResult = {
  success: boolean
  externalListingId?: string
  externalUrl?: string
  error?: string
}

export type ListingStatusResult = {
  externalListingId: string
  status: 'active' | 'sold' | 'expired' | 'removed'
  expiresAt?: string
  error?: string
}

export type ImportedListing = {
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  categoryId?: string
  externalListingId: string
  externalUrl: string
}

export type MarketplaceCategory = {
  id: string
  name: string
  parentId?: string
  hasChildren?: boolean
}

// --- Adapter interface ---

export interface MarketplaceAdapter {
  id: MarketplaceId
  name: string

  // OAuth
  getAuthUrl(tenantId: string, redirectUri: string): string
  exchangeCode(code: string, redirectUri: string): Promise<MarketplaceCredentials>
  refreshToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>

  // Publishing
  publish(payload: PublishPayload, credentials: MarketplaceCredentials): Promise<PublishResult>
  updateListing(externalId: string, payload: PublishPayload, credentials: MarketplaceCredentials): Promise<PublishResult>
  removeListing(externalId: string, credentials: MarketplaceCredentials): Promise<{ success: boolean; error?: string }>

  // Status
  getListingStatus(externalId: string, credentials: MarketplaceCredentials): Promise<ListingStatusResult>
  getListingStatuses(externalIds: string[], credentials: MarketplaceCredentials): Promise<ListingStatusResult[]>

  // Categories
  getCategories(credentials: MarketplaceCredentials, parentId?: string): Promise<MarketplaceCategory[]>

  // Import
  importListings(credentials: MarketplaceCredentials, options?: { cursor?: string; limit?: number }): AsyncGenerator<ImportedListing>
}
