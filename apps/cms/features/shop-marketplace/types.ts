// --- Marketplace enums (TEXT in DB, typed here) ---

export type MarketplaceId = 'olx' | 'allegro'

export type ListingStatus = 'draft' | 'publishing' | 'active' | 'sold' | 'expired' | 'removed' | 'error'

export type SyncStatus = 'ok' | 'error' | 'pending'

export type ImportStatus = 'pending' | 'running' | 'completed' | 'failed'

// --- Domain types (manual — tables not in generated types yet) ---

/**
 * Marketplace connection. OMITS access_token_encrypted and refresh_token_encrypted
 * — encrypted credentials must never reach the client.
 */
export type MarketplaceConnection = {
  id: string
  tenant_id: string
  marketplace: MarketplaceId
  display_name: string | null
  is_active: boolean
  token_expires_at: string | null
  account_id: string | null
  account_name: string | null
  scopes: string[] | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type MarketplaceListing = {
  id: string
  tenant_id: string
  product_id: string
  connection_id: string
  marketplace: MarketplaceId
  external_listing_id: string | null
  external_url: string | null
  status: ListingStatus
  marketplace_category_id: string | null
  marketplace_location: Record<string, unknown> | null
  marketplace_params: Record<string, unknown> | null
  last_sync_status: SyncStatus | null
  last_sync_error: string | null
  last_synced_at: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type MarketplaceImport = {
  id: string
  tenant_id: string
  connection_id: string
  marketplace: MarketplaceId
  status: ImportStatus
  total_items: number | null
  imported_items: number | null
  skipped_items: number | null
  error_log: { message: string; listingId?: string }[]
  started_at: string | null
  completed_at: string | null
  created_at: string
}

// --- Labels (single source of truth) ---

export const MARKETPLACE_LABELS: Record<MarketplaceId, string> = {
  olx: 'OLX',
  allegro: 'Allegro',
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Szkic',
  publishing: 'Publikowanie...',
  active: 'Aktywne',
  sold: 'Sprzedane',
  expired: 'Wygaslo',
  removed: 'Usuniete',
  error: 'Blad',
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  ok: 'Zsynchronizowano',
  error: 'Blad synchronizacji',
  pending: 'Oczekuje',
}

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  pending: 'Oczekuje',
  running: 'W trakcie',
  completed: 'Zakonczone',
  failed: 'Nieudane',
}

// --- Options derived from labels (prevents label duplication bug) ---

export const MARKETPLACE_OPTIONS = Object.entries(MARKETPLACE_LABELS).map(
  ([value, label]) => ({ value: value as MarketplaceId, label })
)

export const LISTING_STATUS_OPTIONS = Object.entries(LISTING_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as ListingStatus, label })
)

export const IMPORT_STATUS_OPTIONS = Object.entries(IMPORT_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as ImportStatus, label })
)

// --- Cast helpers (Supabase returns JSONB as generic Json) ---

export function toMarketplaceConnection(raw: unknown): MarketplaceConnection {
  const row = raw as Record<string, unknown>
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    marketplace: row.marketplace as MarketplaceId,
    display_name: (row.display_name as string) ?? null,
    is_active: row.is_active as boolean,
    token_expires_at: (row.token_expires_at as string) ?? null,
    account_id: (row.account_id as string) ?? null,
    account_name: (row.account_name as string) ?? null,
    scopes: (row.scopes as string[]) ?? null,
    last_synced_at: (row.last_synced_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function toMarketplaceListing(raw: unknown): MarketplaceListing {
  const row = raw as Record<string, unknown>
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    product_id: row.product_id as string,
    connection_id: row.connection_id as string,
    marketplace: row.marketplace as MarketplaceId,
    external_listing_id: (row.external_listing_id as string) ?? null,
    external_url: (row.external_url as string) ?? null,
    status: row.status as ListingStatus,
    marketplace_category_id: (row.marketplace_category_id as string) ?? null,
    marketplace_location: (row.marketplace_location as Record<string, unknown>) ?? null,
    marketplace_params: (row.marketplace_params as Record<string, unknown>) ?? null,
    last_sync_status: (row.last_sync_status as SyncStatus) ?? null,
    last_sync_error: (row.last_sync_error as string) ?? null,
    last_synced_at: (row.last_synced_at as string) ?? null,
    published_at: (row.published_at as string) ?? null,
    expires_at: (row.expires_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function toMarketplaceImport(raw: unknown): MarketplaceImport {
  const row = raw as Record<string, unknown>
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    connection_id: row.connection_id as string,
    marketplace: row.marketplace as MarketplaceId,
    status: row.status as ImportStatus,
    total_items: (row.total_items as number) ?? null,
    imported_items: (row.imported_items as number) ?? null,
    skipped_items: (row.skipped_items as number) ?? null,
    error_log: (Array.isArray(row.error_log) ? row.error_log : []) as MarketplaceImport['error_log'],
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    created_at: row.created_at as string,
  }
}
