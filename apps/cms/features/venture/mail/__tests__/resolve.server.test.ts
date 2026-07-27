import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createResendMailSenderMock = vi.fn()
const createGmailSmtpSenderMock = vi.fn()
const sendEmailViaResendMock = vi.fn()
const verifySharedResendMock = vi.fn()

vi.mock('../resend.server', () => ({
  createResendMailSender: (...args: unknown[]) => createResendMailSenderMock(...args),
  sendEmailViaResend: (...args: unknown[]) => sendEmailViaResendMock(...args),
  verifySharedResend: () => verifySharedResendMock(),
}))

vi.mock('../gmail-smtp.server', () => ({
  createGmailSmtpSender: (...args: unknown[]) => createGmailSmtpSenderMock(...args),
}))

import {
  degradesToSharedSender,
  resolveMailSender,
  type ClientMailConfig,
} from '../resolve.server'
import { sendEmailViaResend } from '../resend.server'

function baseConfig(overrides: Partial<ClientMailConfig> = {}): ClientMailConfig {
  return {
    mail_provider: 'resend_shared',
    resend_api_key: null,
    resend_from_email: null,
    gmail_address: null,
    gmail_app_password: null,
    sender_name: null,
    ...overrides,
  }
}

describe('resolveMailSender', () => {
  const RESEND_OWN_SENDER = { send: vi.fn() }
  const GMAIL_SENDER = { send: vi.fn() }

  beforeEach(() => {
    createResendMailSenderMock.mockReturnValue(RESEND_OWN_SENDER)
    createGmailSmtpSenderMock.mockReturnValue(GMAIL_SENDER)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    createResendMailSenderMock.mockReset()
    createGmailSmtpSenderMock.mockReset()
    sendEmailViaResendMock.mockReset()
  })

  it('resend_shared resolves to the shared Resend sender', () => {
    const sender = resolveMailSender(baseConfig({ mail_provider: 'resend_shared' }))
    expect(sender.send).toBe(sendEmailViaResend)
    expect(createResendMailSenderMock).not.toHaveBeenCalled()
  })

  it('resend_own with full config resolves to a client-owned Resend sender', () => {
    const config = baseConfig({
      mail_provider: 'resend_own',
      resend_api_key: 'key-123',
      resend_from_email: 'bonus@client.com',
    })

    const sender = resolveMailSender(config)

    expect(createResendMailSenderMock).toHaveBeenCalledWith({
      apiKey: 'key-123',
      from: 'bonus@client.com',
      fromName: null,
    })
    expect(sender).toBe(RESEND_OWN_SENDER)
  })

  it('resend_own missing resend_from_email falls back to the shared sender', () => {
    const config = baseConfig({
      mail_provider: 'resend_own',
      resend_api_key: 'key-123',
      resend_from_email: null,
    })

    const sender = resolveMailSender(config)

    expect(createResendMailSenderMock).not.toHaveBeenCalled()
    expect(sender.send).toBe(sendEmailViaResend)
    // Behaviour, not a log line: the resolver is silent so the read-only probe
    // in effective-sender.server.ts cannot emit send-path-looking logs.
    expect(degradesToSharedSender(config)).toBe(true)
  })

  it('gmail_smtp with full config resolves to a Gmail sender', () => {
    const config = baseConfig({
      mail_provider: 'gmail_smtp',
      gmail_address: 'client@gmail.com',
      gmail_app_password: 'abcd efgh ijkl mnop',
    })

    const sender = resolveMailSender(config)

    expect(createGmailSmtpSenderMock).toHaveBeenCalledWith({
      address: 'client@gmail.com',
      appPassword: 'abcd efgh ijkl mnop',
      senderName: null,
    })
    expect(sender).toBe(GMAIL_SENDER)
  })

  it('gmail_smtp missing gmail_app_password falls back to the shared sender', () => {
    const config = baseConfig({
      mail_provider: 'gmail_smtp',
      gmail_address: 'client@gmail.com',
      gmail_app_password: null,
    })

    const sender = resolveMailSender(config)

    expect(createGmailSmtpSenderMock).not.toHaveBeenCalled()
    expect(sender.send).toBe(sendEmailViaResend)
    // Behaviour, not a log line: the resolver is silent so the read-only probe
    // in effective-sender.server.ts cannot emit send-path-looking logs.
    expect(degradesToSharedSender(config)).toBe(true)
  })

  it('unrecognized mail_provider value falls back to shared sender', () => {
    const config = baseConfig({ mail_provider: 'carrier_pigeon' })

    const sender = resolveMailSender(config)

    expect(sender.send).toBe(sendEmailViaResend)
    expect(createResendMailSenderMock).not.toHaveBeenCalled()
    expect(createGmailSmtpSenderMock).not.toHaveBeenCalled()
  })
})

describe('degradesToSharedSender', () => {
  // Mocks are scoped per describe — without this the Gmail factory returns
  // undefined and every case would look like a degrade.
  beforeEach(() => {
    createGmailSmtpSenderMock.mockReturnValue({ send: vi.fn() })
  })
  afterEach(() => {
    createGmailSmtpSenderMock.mockReset()
  })

  it('is true when a client picked its own provider but saved incomplete config', () => {
    // The case that made the connection test report a false "OK": the resolver
    // silently hands back the AGENCY sender, so verifying it would authenticate
    // the agency key and say nothing about this client's credentials.
    expect(
      degradesToSharedSender(
        baseConfig({
          mail_provider: 'gmail_smtp',
          gmail_address: 'client@gmail.com',
          gmail_app_password: null,
        }),
      ),
    ).toBe(true)
  })

  it('is false when the client provider is fully configured', () => {
    expect(
      degradesToSharedSender(
        baseConfig({
          mail_provider: 'gmail_smtp',
          gmail_address: 'client@gmail.com',
          gmail_app_password: 'abcd efgh ijkl mnop',
        }),
      ),
    ).toBe(false)
  })

  it('is true for resend_shared — the agency account IS the configured choice', () => {
    expect(degradesToSharedSender(baseConfig({ mail_provider: 'resend_shared' }))).toBe(true)
  })
})
