import { registerLeadSource } from './registry.server'
import { tallyLeadSource } from './tally.server'

// Side-effect registration on module load (mirrors esp/index.server.ts).
// Importing this barrel from the route registers every provider.
registerLeadSource(tallyLeadSource)

export {
  getLeadSource,
  isLeadSourceRegistered,
  registerLeadSource,
  resolveLeadSource,
} from './registry.server'
export type { LeadSourceProvider } from './registry.server'
export { LEAD_SOURCE_IDS, isLeadSourceId } from './types'
export type {
  LeadSourceId,
  MappedLead,
  VerifyInput,
  VerifyResult,
} from './types'
