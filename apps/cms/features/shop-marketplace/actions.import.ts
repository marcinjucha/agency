'use server'

import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { messages } from '@/lib/messages'
import { getMarketplaceCredentials } from './adapters/credentials'
import { getMarketplaceAdapter } from './adapters/registry'
import type { MarketplaceId } from './types'
import type { ImportedListing } from './adapters/types'

/** Max listings fetched from marketplace API in import wizard preview. */
const IMPORT_PREVIEW_LIMIT = 200

export type ImportPreviewListing = ImportedListing & {
  already_imported: boolean
}

/**
 * Fetch listings from a marketplace for the import wizard preview.
 *
 * Uses service role via getMarketplaceCredentials (decrypted OAuth tokens).
 * Cross-references existing shop_marketplace_listings by external_listing_id to mark duplicates.
 *
 * Pagination rationale: Import wizard is a deliberate admin action.
 * We cap at IMPORT_PREVIEW_LIMIT (200) server-side — beyond that, marketplace
 * import is a background operation, not an interactive selection task.
 * Checkbox fatigue at 500+ items makes per-item selection unusable.
 */
export async function getImportPreviewListings(
  connectionId: string
): Promise<{
  success: boolean
  data?: { listings: ImportPreviewListing[]; total_fetched: number; capped: boolean }
  error?: string
}> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    const { supabase, tenantId } = auth

    // Verify connection belongs to tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_connections not in generated types
    const { data: connection, error: connError } = await (supabase as any)
      .from('shop_marketplace_connections')
      .select('id, marketplace, is_active')
      .eq('id', connectionId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (connError || !connection) {
      return { success: false, error: messages.marketplace.connectionNotFound }
    }

    if (!connection.is_active) {
      return { success: false, error: messages.marketplace.connectionInactive }
    }

    // Fetch decrypted credentials via service role
    const credentials = await getMarketplaceCredentials(connectionId)
    const adapter = getMarketplaceAdapter(connection.marketplace as MarketplaceId)

    // Collect listings up to limit using the adapter's AsyncGenerator
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
      return { success: true, data: { listings: [], total_fetched: 0, capped: false } }
    }

    // Cross-reference existing imports by external_listing_id to mark duplicates
    const externalIds = collected.map((l) => l.externalListingId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shop_marketplace_listings not in generated types
    const { data: existingListings } = await (supabase as any)
      .from('shop_marketplace_listings')
      .select('external_listing_id')
      .eq('connection_id', connectionId)
      .eq('tenant_id', tenantId)
      .in('external_listing_id', externalIds)

    const importedIds = new Set<string>(
      (existingListings ?? []).map((row: { external_listing_id: string }) => row.external_listing_id)
    )

    const listings: ImportPreviewListing[] = collected.map((l) => ({
      ...l,
      already_imported: importedIds.has(l.externalListingId),
    }))

    return {
      success: true,
      data: { listings, total_fetched: collected.length, capped },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : messages.common.unknownError
    console.error('[marketplace-import-preview] fetch failed:', err)
    return { success: false, error: message }
  }
}
