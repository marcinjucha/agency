import { registerMarketplaceAdapter } from './registry'
import { olxAdapter } from './olx'
import { allegroAdapter } from './allegro'

// Register both adapters on module load
registerMarketplaceAdapter(olxAdapter)
registerMarketplaceAdapter(allegroAdapter)

export { getMarketplaceAdapter, isMarketplaceRegistered } from './registry'
export { getMarketplaceCredentials, isTokenExpired } from './credentials'
