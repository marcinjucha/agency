import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { verifyTallySignature } from '../tally-signature.server'

const SECRET = 'super-secret-signing-key'
const RAW_BODY = JSON.stringify({ eventType: 'FORM_RESPONSE', data: { fields: [] } })

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
}

describe('verifyTallySignature', () => {
  it('accepts a signature computed over the exact raw body with the correct secret', () => {
    const signature = sign(RAW_BODY, SECRET)
    expect(verifyTallySignature(RAW_BODY, signature, SECRET)).toEqual({ valid: true })
  })

  it('rejects a signature when the body was tampered with after signing', () => {
    const signature = sign(RAW_BODY, SECRET)
    const tamperedBody = RAW_BODY + ' '
    expect(verifyTallySignature(tamperedBody, signature, SECRET)).toEqual({
      valid: false,
      reason: 'invalid_signature',
    })
  })

  it('rejects a signature produced with a different secret', () => {
    const signature = sign(RAW_BODY, 'wrong-secret')
    expect(verifyTallySignature(RAW_BODY, signature, SECRET)).toEqual({
      valid: false,
      reason: 'invalid_signature',
    })
  })

  it('reports missing_secret when the env secret is undefined (→ 500 at route)', () => {
    expect(verifyTallySignature(RAW_BODY, sign(RAW_BODY, SECRET), undefined)).toEqual({
      valid: false,
      reason: 'missing_secret',
    })
  })

  it('reports missing_signature when the header is absent (→ 401 at route)', () => {
    expect(verifyTallySignature(RAW_BODY, null, SECRET)).toEqual({
      valid: false,
      reason: 'missing_signature',
    })
  })

  it('rejects a length-mismatched signature without throwing (timingSafeEqual guard)', () => {
    expect(verifyTallySignature(RAW_BODY, 'short', SECRET)).toEqual({
      valid: false,
      reason: 'invalid_signature',
    })
  })
})
