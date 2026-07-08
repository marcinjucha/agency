import crypto from 'node:crypto'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — Tally webhook signature verification (iter 3).
//
// Verified Tally contract (docs 2026-07-08): header `Tally-Signature`, algo
// HMAC-SHA256 over the RAW request body string, digest base64, secret from
// `TALLY_WEBHOOK_SECRET`. Verify BEFORE JSON.parse and compare with
// crypto.timingSafeEqual (guarding equal length first — timingSafeEqual throws
// on length mismatch).
//
// Server-only (`node:crypto`) — hence the `.server.ts` suffix.
// ---------------------------------------------------------------------------

// Discriminated result so the route can map reasons to distinct HTTP statuses:
//   missing_secret   → 500 (misconfiguration, log + generic error)
//   missing_signature / invalid_signature → 401 { error: 'invalid_signature' }
export type SignatureCheck =
  | { valid: true }
  | {
      valid: false
      reason: 'missing_secret' | 'missing_signature' | 'invalid_signature'
    }

export function verifyTallySignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
): SignatureCheck {
  if (!secret) return { valid: false, reason: 'missing_secret' }
  if (!signature) return { valid: false, reason: 'missing_signature' }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64')

  const expectedBuf = Buffer.from(expected, 'utf8')
  const providedBuf = Buffer.from(signature, 'utf8')

  // timingSafeEqual throws when lengths differ — guard first, and a length
  // mismatch is itself a definitive rejection.
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: 'invalid_signature' }
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: 'invalid_signature' }
  }
  return { valid: true }
}
