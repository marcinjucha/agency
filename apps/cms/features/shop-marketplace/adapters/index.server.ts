import { registerMarketplaceAdapter } from './registry.server'
import { olxAdapter } from './olx.server'
import { allegroAdapter } from './allegro.server'

// Register both adapters on module load
registerMarketplaceAdapter(olxAdapter)
registerMarketplaceAdapter(allegroAdapter)

export { getMarketplaceAdapter, isMarketplaceRegistered } from './registry.server'
export { getMarketplaceCredentials, isTokenExpired } from './credentials.server'
