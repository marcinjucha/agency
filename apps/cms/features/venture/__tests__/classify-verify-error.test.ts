import { describe, expect, it } from 'vitest'
import { classifyVerifyError } from '../mail/classify-verify-error'

describe('classifyVerifyError', () => {
  it('classifies the real Gmail rejection (EAUTH / 535) as auth_rejected', () => {
    const error = Object.assign(new Error('Invalid login: 535-5.7.8 ...'), {
      code: 'EAUTH',
      responseCode: 535,
      command: 'AUTH PLAIN',
    })
    expect(classifyVerifyError(error)).toMatchObject({
      reason: 'auth_rejected',
      code: 'EAUTH',
      responseCode: 535,
    })
  })

  it('classifies a 535 reply as auth_rejected even without a code', () => {
    expect(classifyVerifyError(Object.assign(new Error('nope'), { responseCode: 535 })).reason).toBe(
      'auth_rejected',
    )
  })

  it.each([401, 403])('classifies HTTP %i from an API provider as auth_rejected', (status) => {
    expect(classifyVerifyError(Object.assign(new Error('x'), { status })).reason).toBe(
      'auth_rejected',
    )
  })

  it.each(['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNREFUSED'])(
    'classifies %s as connection',
    (code) => {
      expect(classifyVerifyError(Object.assign(new Error('x'), { code })).reason).toBe('connection')
    },
  )

  it('falls back to unknown rather than guessing', () => {
    expect(classifyVerifyError(new Error('something else')).reason).toBe('unknown')
    expect(classifyVerifyError('a string').reason).toBe('unknown')
    expect(classifyVerifyError(null).reason).toBe('unknown')
  })

  it('never returns the error message — only non-secret discriminators', () => {
    const result = classifyVerifyError(
      Object.assign(new Error('user jan@example.pl rejected'), { code: 'EAUTH' }),
    )
    expect(JSON.stringify(result)).not.toContain('jan@example.pl')
  })
})
