import { createServerFn } from '@tanstack/react-start'
import { err, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuthContextFull, type AuthContextFull } from '@/lib/server-auth'
import { hasPermission } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import { isMarketplaceRegistered } from './adapters/registry'
import { getMarketplaceCredentials } from './adapters/credentials'
import { getMarketplaceAdapter } from './adapters/registry'
import type { MarketplaceId, MarketplaceConnection, MarketplaceListing, MarketplaceImport } from './types'
import type { MarketplaceCategory } from './adapters/types'
import type { ImportedListing } from './adapters/types'
import {
  connectMarketplaceSchema,
  publishListingSchema,
  updateListingSchema,
  type ConnectMarketplaceFormData,
  type PublishListingFormData,
  type UpdateListingFormData,
} from './validation'
import { z } from 'zod'
import { getAuth } from '@/lib/server-auth'
import { toMarketplaceConnection, toMarketplaceListing, toMarketplaceImport } from './types'

const CONNECTION_FIELDS = 'id, tenant_id, marketplace, display_name, is_active, token_expires_at, account_id, account_name, scopes, last_synced_at, created_at, updated_at' as const

// ---------------------------------------------------------------------------
// Public type re-export
// ---------------------------------------------------------------------------

export type ImportPreviewListing = ImportedListing & {
  already_imported: boolean
}

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const connectionIdSchema = z.object({ connectionId: z.string().uuid() })
const listingIdSchema = z.object({ listingId: z.string().uuid() })

const updateInputSchema = z.object({ listingId: z.string().uuid() }).merge(updateListingSchema)

const startImportInputSchema = z.object({
  connectionId: z.string().uuid(),
  selectedListingIds: z.array(z.string()),
})

const getCategoriesInputSchema = z.object({
  connectionId: z.string().uuid(),
  parentId: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dbError = (e: unknown) => (e instanceof Error ? e.message : messages.common.unknownError)

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- marketplace tables not in generated types
const connectionsTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('shop_marketplace_connections')
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- marketplace tables not in generated types
const listingsTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('shop_marketplace_listings')
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- marketplace tables not in generated types
const productsTable = (supabase: AuthContextFull['supabase']) => (supabase as any).from('shop_products')

/** Max listings fetched from marketplace API in import wizard preview. */
const IMPORT_PREVIEW_LIMIT = 200

// ---------------------------------------------------------------------------
// N8n dispatch helper
// ---------------------------------------------------------------------------

function dispatchMarketplaceWebhook(payload: Record<string, unknown>): void {
  const url = process.env.N8N_MARKETPLACE_WEBHOOK_URL
  const secret = process.env.WORKFLOW_TRIGGER_SECRET
  if (!url) {
    console.error('[marketplace] N8N_MARKETPLACE_WEBHOOK_URL not configured')
    return
  }
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch((e) => {
    console.error('[marketplace] n8n dispatch failed:', e)
  })
}

// ---------------------------------------------------------------------------
// Server Functions — reads (Pattern A: server client for all reads)
// ---------------------------------------------------------------------------

/**
 * Fetch all marketplace connections for the authenticated tenant.
 * Mirrors getMarketplaceConnections from queries.ts but uses server client.
 */
export const getMarketplaceConnectionsFn = createServerFn({ method: 'POST' }).handler(async (): Promise<MarketplaceConnection[]> => {
  const auth = await getAuth()
  if (!auth) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabase as any)
    .from('shop_marketplace_connections')
    .select(CONNECTION_FIELDS)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toMarketplaceConnection)
})

/**
 * Fetch marketplace listings for a product.
 * Mirrors getMarketplaceListings from queries.ts but uses server client.
 */
export const getMarketplaceListingsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data: { productId } }): Promise<MarketplaceListing[]> => {
    const auth = await getAuth()
    if (!auth) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (auth.supabase as any)
      .from('shop_marketplace_listings')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(toMarketplaceListing)
  })

/**
 * Fetch a single import record by ID for progress polling.
 * Mirrors getImportProgress from queries.ts but uses server client.
 */
export const getImportProgressFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { importId: string }) => input)
  .handler(async ({ data: { importId } }): Promise<MarketplaceImport> => {
    const auth = await getAuth()
    if (!auth) throw new Error('Not authenticated')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (auth.supabase as any)
      .from('shop_marketplace_imports')
      .select('*')
      .eq('id', importId)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Import record not found')
    return toMarketplaceImport(data)
  })

// ---------------------------------------------------------------------------
// Server Functions — connectMarketplace
// ---------------------------------------------------------------------------

export const connectMarketplaceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: ConnectMarketplaceFormData) => connectMarketplaceSchema.parse(input))
  .handler(
    async ({ data: formData }): Promise<{ success: true; data: { authUrl: string } } | { success: false; error: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('shop.marketplace', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return validateMarketplaceId(formData.marketplace as MarketplaceId)
      })

      return result.match(
        (marketplace) => {
          const host = import.meta.env.VITE_HOST_URL || process.env.HOST_URL
          if (!host) {
            console.error('[marketplace] Missing VITE_HOST_URL or HOST_URL environment variable')
            return { success: false as const, error: messages.common.unknownError }
          }
          const authUrl = `${host}/api/marketplace/auth/${marketplace}`
          return { success: true as const, data: { authUrl } }
        },
        (error) => ({ success: false as const, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — disconnectMarketplace
// ---------------------------------------------------------------------------

export const disconnectMarketplaceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { connectionId: string }) => connectionIdSchema.parse(input))
  .handler(
    async ({ data: { connectionId } }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull().andThen((auth) => {
        if (!hasPermission('shop.marketplace', auth.permissions)) {
          return err(messages.common.noPermission)
        }
        return deleteConnection(auth, connectionId)
      })

      return result.match(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — publishToMarketplace
// ---------------------------------------------------------------------------

export const publishToMarketplaceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: PublishListingFormData) => publishListingSchema.parse(input))
  .handler(
    async ({ data: publishData }): Promise<{ success: true; data: { listingId: string } } | { success: false; error: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.marketplace', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return verifyConnectionBelongsToTenant(auth, publishData.connectionId).map((connection) => ({ auth, connection }))
        })
        .andThen(({ auth, connection }) =>
          fetchProductForDispatch(auth, publishData.productId).map((product) => ({ auth, connection, product }))
        )
        .andThen(({ auth, connection, product }) =>
          upsertListing(auth, publishData, connection).map((listing) => ({ listing, connection, product, auth }))
        )

      return result.match(
        ({ listing, connection, product, auth }) => {
          const { productId, connectionId, marketplaceCategoryId, marketplaceLocation, marketplaceParams } = publishData
          dispatchMarketplaceWebhook({
            action: 'publish',
            listing_id: listing.id,
            connection_id: connectionId,
            product_id: productId,
            publish_payload: {
              title: product.title,
              description: product.short_description,
              price: product.price,
              currency: product.currency ?? 'PLN',
              images: product.images ?? [],
              categoryId: marketplaceCategoryId,
              location: marketplaceLocation,
              ...(marketplaceParams ?? {}),
            },
          })
          return { success: true as const, data: { listingId: listing.id } }
        },
        (error) => ({ success: false as const, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — updateMarketplaceListing
// ---------------------------------------------------------------------------

// Flat input type for updateMarketplaceListingFn — listingId + update fields in one object
type UpdateListingInput = { listingId: string } & UpdateListingFormData

export const updateMarketplaceListingFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateListingInput) => updateInputSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.marketplace', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return fetchExistingListing(auth, data.listingId).map((existing) => ({ auth, existing }))
        })
        .andThen(({ auth, existing }) =>
          fetchProductForDispatch(auth, existing.product_id).map((product) => ({ auth, existing, product }))
        )
        .andThen(({ auth, existing, product }) =>
          patchListing(auth, data.listingId, data).map(() => ({ existing, product }))
        )

      return result.match(
        ({ existing, product }) => {
          const { marketplaceCategoryId, marketplaceLocation, marketplaceParams } = data
          dispatchMarketplaceWebhook({
            action: 'update',
            listing_id: data.listingId,
            connection_id: existing.connection_id,
            product_id: existing.product_id,
            external_listing_id: existing.external_listing_id,
            publish_payload: {
              title: product.title,
              description: product.short_description,
              price: product.price,
              currency: product.currency ?? 'PLN',
              images: product.images ?? [],
              ...(marketplaceCategoryId !== undefined ? { categoryId: marketplaceCategoryId } : {}),
              ...(marketplaceLocation !== undefined ? { location: marketplaceLocation } : {}),
              ...(marketplaceParams ?? {}),
            },
          })
          return { success: true }
        },
        (error) => ({ success: false, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — removeMarketplaceListing
// ---------------------------------------------------------------------------

export const removeMarketplaceListingFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { listingId: string }) => listingIdSchema.parse(input))
  .handler(
    async ({ data: { listingId } }): Promise<{ success: boolean; error?: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.marketplace', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return fetchExistingListing(auth, listingId).map((existing) => ({ auth, existing }))
        })
        .andThen(({ auth, existing }) =>
          markListingRemoved(auth, listingId).map(() => existing)
        )

      return result.match(
        (existing) => {
          dispatchMarketplaceWebhook({
            action: 'remove',
            listing_id: listingId,
            connection_id: existing.connection_id,
            external_listing_id: existing.external_listing_id,
          })
          return { success: true }
        },
        (error) => ({ success: false, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — startMarketplaceImport
// ---------------------------------------------------------------------------

export const startMarketplaceImportFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { connectionId: string; selectedListingIds: string[] }) => startImportInputSchema.parse(input))
  .handler(
    async ({ data: { connectionId, selectedListingIds } }): Promise<{ success: true; data: { importId: string } } | { success: false; error: string }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.marketplace', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return verifyConnectionBelongsToTenant(auth, connectionId).map((connection) => ({ auth, connection }))
        })
        .andThen(({ auth, connection }) =>
          insertImportRecord(auth.tenantId, connectionId, connection.marketplace, selectedListingIds.length)
            .map((importRecord) => ({ importRecord, connection, auth }))
        )

      return result.match(
        ({ importRecord, auth }) => {
          dispatchMarketplaceWebhook({
            action: 'import',
            import_id: importRecord.id,
            connection_id: connectionId,
            listing_ids: selectedListingIds,
            tenant_id: auth.tenantId,
          })
          return { success: true as const, data: { importId: importRecord.id } }
        },
        (error) => ({ success: false as const, error })
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — getMarketplaceCategories
// ---------------------------------------------------------------------------

export const getMarketplaceCategoriesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { connectionId: string; parentId?: string }) => getCategoriesInputSchema.parse(input))
  .handler(
    async ({ data: { connectionId, parentId } }): Promise<{
      success: boolean
      data?: { categories: MarketplaceCategory[] }
      error?: string
    }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.marketplace', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return verifyConnectionBelongsToTenant(auth, connectionId)
        })
        .andThen((connection) =>
          ResultAsync.fromPromise(
            fetchCategoriesFromAdapter(connection.marketplace as MarketplaceId, connectionId, parentId),
            dbError
          )
        )

      return result.match(
        (categories) => ({ success: true, data: { categories } }),
        (error) => {
          console.error('[marketplace-categories] fetch failed:', error)
          return { success: false, error }
        }
      )
    }
  )

// ---------------------------------------------------------------------------
// Server Functions — getImportPreviewListings
// ---------------------------------------------------------------------------

export const getImportPreviewListingsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { connectionId: string }) => connectionIdSchema.parse(input))
  .handler(
    async ({ data: { connectionId } }): Promise<{
      success: boolean
      data?: { listings: ImportPreviewListing[]; total_fetched: number; capped: boolean }
      error?: string
    }> => {
      const result = await requireAuthContextFull()
        .andThen((auth) => {
          if (!hasPermission('shop.marketplace', auth.permissions)) {
            return err(messages.common.noPermission)
          }
          return verifyActiveConnection(auth, connectionId).map((connection) => ({ auth, connection }))
        })
        .andThen(({ auth, connection }) =>
          ResultAsync.fromPromise(
            fetchImportPreview(auth, connection.marketplace as MarketplaceId, connectionId),
            dbError
          )
        )

      return result.match(
        (data) => ({ success: true, data }),
        (error) => {
          console.error('[marketplace-import-preview] fetch failed:', error)
          return { success: false, error }
        }
      )
    }
  )

// ---------------------------------------------------------------------------
// Plain helper — getOAuthAuthorizationUrl (not a server fn — builds URL only)
// ---------------------------------------------------------------------------

/**
 * Returns the OAuth authorization URL for the given marketplace.
 * Not a server function — no DB/auth needed, just builds a URL string.
 * Called on the client side after connectMarketplaceFn succeeds.
 */
export function getOAuthAuthorizationUrl(marketplace: MarketplaceId): string {
  const host = typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_HOST_URL ?? process.env.HOST_URL ?? '')
  return `${host}/api/marketplace/auth/${marketplace}`
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function validateMarketplaceId(marketplace: MarketplaceId): ResultAsync<MarketplaceId, string> {
  if (!isMarketplaceRegistered(marketplace)) {
    return ResultAsync.fromPromise(Promise.reject(new Error(messages.marketplace.adapterNotAvailable)), dbError)
  }
  return ResultAsync.fromPromise(Promise.resolve(marketplace), dbError)
}

const verifyConnectionBelongsToTenant = (auth: AuthContextFull, connectionId: string) =>
  ResultAsync.fromPromise(
    connectionsTable(auth.supabase)
      .select('id, marketplace, is_active')
      .eq('id', connectionId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle()
      .then((res: { data: unknown; error: unknown }) => {
        if (res.error || !res.data) return { data: null, error: { message: messages.marketplace.connectionNotFound } }
        return res
      }),
    dbError
  ).andThen(fromSupabase<{ id: string; marketplace: string; is_active: boolean }>())

const verifyActiveConnection = (auth: AuthContextFull, connectionId: string) =>
  verifyConnectionBelongsToTenant(auth, connectionId).andThen((connection) =>
    connection.is_active
      ? ResultAsync.fromPromise(Promise.resolve(connection), dbError)
      : err(messages.marketplace.connectionInactive)
  )

const deleteConnection = (auth: AuthContextFull, connectionId: string) =>
  ResultAsync.fromPromise(
    connectionsTable(auth.supabase).delete().eq('id', connectionId),
    dbError
  ).andThen(fromSupabaseVoid())

const fetchProductForDispatch = (auth: AuthContextFull, productId: string) =>
  ResultAsync.fromPromise(
    productsTable(auth.supabase)
      .select('id, title, short_description, price, currency, images, is_published')
      .eq('id', productId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle()
      .then((res: { data: unknown; error: unknown }) => {
        if (res.error || !res.data) return { data: null, error: { message: messages.marketplace.productNotFound } }
        return res
      }),
    dbError
  ).andThen(fromSupabase<Record<string, unknown>>())

const upsertListing = (auth: AuthContextFull, data: PublishListingFormData, connection: { marketplace: string }) =>
  ResultAsync.fromPromise(
    listingsTable(auth.supabase)
      .upsert(
        {
          tenant_id: auth.tenantId,
          product_id: data.productId,
          connection_id: data.connectionId,
          marketplace: connection.marketplace,
          status: 'publishing',
          marketplace_category_id: data.marketplaceCategoryId ?? null,
          marketplace_location: data.marketplaceLocation ?? null,
          marketplace_params: data.marketplaceParams ?? null,
        },
        { onConflict: 'product_id,connection_id', ignoreDuplicates: false }
      )
      .select('id')
      .single()
      .then((res: { data: unknown; error: unknown }) => {
        if (res.error || !res.data) return { data: null, error: { message: messages.marketplace.publishFailed } }
        return res
      }),
    dbError
  ).andThen(fromSupabase<{ id: string }>())

const fetchExistingListing = (auth: AuthContextFull, listingId: string) =>
  ResultAsync.fromPromise(
    listingsTable(auth.supabase)
      .select('id, external_listing_id, connection_id, product_id')
      .eq('id', listingId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle()
      .then((res: { data: unknown; error: unknown }) => {
        if (res.error || !res.data) return { data: null, error: { message: messages.marketplace.listingNotFound } }
        return res
      }),
    dbError
  ).andThen(fromSupabase<{ id: string; external_listing_id: string | null; connection_id: string; product_id: string }>())

const patchListing = (auth: AuthContextFull, listingId: string, data: UpdateListingFormData) =>
  ResultAsync.fromPromise(
    listingsTable(auth.supabase)
      .update({
        status: 'publishing',
        ...(data.marketplaceCategoryId !== undefined ? { marketplace_category_id: data.marketplaceCategoryId } : {}),
        ...(data.marketplaceLocation !== undefined ? { marketplace_location: data.marketplaceLocation } : {}),
        ...(data.marketplaceParams !== undefined ? { marketplace_params: data.marketplaceParams } : {}),
      })
      .eq('id', listingId)
      .eq('tenant_id', auth.tenantId),
    dbError
  ).andThen(fromSupabaseVoid())

const markListingRemoved = (auth: AuthContextFull, listingId: string) =>
  ResultAsync.fromPromise(
    listingsTable(auth.supabase)
      .update({ status: 'removed' })
      .eq('id', listingId)
      .eq('tenant_id', auth.tenantId),
    dbError
  ).andThen(fromSupabaseVoid())

const insertImportRecord = (tenantId: string, connectionId: string, marketplace: string, totalItems: number) => {
  const serviceSupabase = createServiceClient()
  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_imports not in generated types
    (serviceSupabase as any)
      .from('shop_marketplace_imports')
      .insert({
        tenant_id: tenantId,
        connection_id: connectionId,
        marketplace,
        status: 'pending',
        total_items: totalItems,
      })
      .select('id')
      .single(),
    dbError
  ).andThen(fromSupabase<{ id: string }>())
}

// ---------------------------------------------------------------------------
// Business logic — adapter calls
// ---------------------------------------------------------------------------

async function fetchCategoriesFromAdapter(
  marketplace: MarketplaceId,
  connectionId: string,
  parentId?: string
): Promise<MarketplaceCategory[]> {
  const credentials = await getMarketplaceCredentials(connectionId)
  const adapter = getMarketplaceAdapter(marketplace)
  return adapter.getCategories(credentials, parentId)
}

async function fetchImportPreview(
  auth: AuthContextFull,
  marketplace: MarketplaceId,
  connectionId: string
): Promise<{ listings: ImportPreviewListing[]; total_fetched: number; capped: boolean }> {
  const credentials = await getMarketplaceCredentials(connectionId)
  const adapter = getMarketplaceAdapter(marketplace)

  const collected: ImportedListing[] = []
  let capped = false

  for await (const listing of adapter.importListings(credentials)) {
    collected.push(listing)
    if (collected.length >= IMPORT_PREVIEW_LIMIT) {
      capped = true
      break
    }
  }

  if (collected.length === 0) {
    return { listings: [], total_fetched: 0, capped: false }
  }

  const externalIds = collected.map((l) => l.externalListingId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
  const { data: existingListings } = await (auth.supabase as any)
    .from('shop_marketplace_listings')
    .select('external_listing_id')
    .eq('connection_id', connectionId)
    .eq('tenant_id', auth.tenantId)
    .in('external_listing_id', externalIds)

  const importedIds = new Set<string>(
    (existingListings ?? []).map((row: { external_listing_id: string }) => row.external_listing_id)
  )

  const listings: ImportPreviewListing[] = collected.map((l) => ({
    ...l,
    already_imported: importedIds.has(l.externalListingId),
  }))

  return { listings, total_fetched: collected.length, capped }
}
