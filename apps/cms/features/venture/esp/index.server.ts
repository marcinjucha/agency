import { registerEspProvider } from './registry.server'
import { beehiivProvider } from './beehiiv.server'

// Side-effect registration on module load (mirrors
// features/shop-marketplace/adapters/index.server.ts).
registerEspProvider(beehiivProvider)

export {
  getEspProvider,
  isEspProviderRegistered,
  registerEspProvider,
} from './registry.server'
export type { EspProvider, EspProviderId } from './types'
