import type { EspProviderId, EspProvider } from './types'

// Mirrors features/shop-marketplace/adapters/registry.server.ts.
// Partial<Record<EspProviderId, ...>> — typed keys, not Record<string>.
const ESP_REGISTRY: Partial<Record<EspProviderId, EspProvider>> = {}

export function getEspProvider(id: EspProviderId): EspProvider {
  const provider = ESP_REGISTRY[id]
  if (!provider) throw new Error(`ESP provider "${id}" not registered`)
  return provider
}

export function isEspProviderRegistered(id: EspProviderId): boolean {
  return id in ESP_REGISTRY
}

export function registerEspProvider(provider: EspProvider): void {
  ESP_REGISTRY[provider.id] = provider
}
