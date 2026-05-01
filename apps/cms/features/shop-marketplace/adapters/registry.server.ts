import type { MarketplaceId } from '../types'
import type { MarketplaceAdapter } from './types'

const MARKETPLACE_REGISTRY: Partial<Record<MarketplaceId, MarketplaceAdapter>> = {}

export function getMarketplaceAdapter(id: MarketplaceId): MarketplaceAdapter {
  const adapter = MARKETPLACE_REGISTRY[id]
  if (!adapter) throw new Error(`Marketplace adapter "${id}" not registered`)
  return adapter
}

export function isMarketplaceRegistered(id: MarketplaceId): boolean {
  return id in MARKETPLACE_REGISTRY
}

export function registerMarketplaceAdapter(adapter: MarketplaceAdapter): void {
  MARKETPLACE_REGISTRY[adapter.id] = adapter
}
