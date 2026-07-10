import type { Result } from 'neverthrow'
import { verifyTallySignature } from '../tally-signature.server'
import { mapTallyPayload } from '../tally'
import type { LeadSourceProvider } from './registry.server'
import { LEAD_SOURCE_IDS } from './types'
import type { MappedLead, VerifyInput, VerifyResult } from './types'

// ---------------------------------------------------------------------------
// Tally lead-source provider — the FIRST provider behind the registry.
//
// Wraps the EXISTING verifyTallySignature (HMAC-SHA256 base64 over the raw body)
// and mapTallyPayload (FORM_RESPONSE → MappedLead). Behavior is byte-identical:
// this only ADAPTS the existing functions to the LeadSourceProvider contract —
// it does NOT reimplement their logic. Server-only (`.server.ts`) because the
// wrapped verify pulls in node:crypto transitively.
// ---------------------------------------------------------------------------

// Tally's signature header (verified contract, docs 2026-07-08). Read HERE,
// inside the provider, so the LeadSourceProvider.verify contract stays
// header-agnostic — a future Google Forms provider reads its own header.
const TALLY_SIGNATURE_HEADER = 'Tally-Signature'

export const tallyLeadSource: LeadSourceProvider = {
  id: LEAD_SOURCE_IDS.tally,
  label: 'Tally',

  verify({ rawBody, headers, secret }: VerifyInput): VerifyResult {
    return verifyTallySignature(
      rawBody,
      headers.get(TALLY_SIGNATURE_HEADER),
      // The DB column is nullable; verifyTallySignature reads `string | undefined`.
      secret ?? undefined,
    )
  },

  parse(payload: unknown): Result<MappedLead, string> {
    // mapTallyPayload returns Result<MappedLead, TallyMapError>; TallyMapError is
    // a string-literal union → assignable to Result<MappedLead, string>.
    return mapTallyPayload(payload)
  },
}
