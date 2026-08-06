import { messages } from '@/lib/messages'
import type { MailConnectionTest } from '../mail/classify-verify-error'

// Pure — extracted from the component so the provider-dependent wording is
// testable without mounting React.

function authRejectedMessage(provider: string): string {
  return provider === 'gmail_smtp'
    ? messages.venture.mailTestAuthRejectedGmail
    : messages.venture.mailTestAuthRejectedResend
}

export function describeConnectionTest(result: MailConnectionTest): {
  ok: boolean
  text: string
} {
  if (result.status === 'ok') return { ok: true, text: messages.venture.mailTestOk }
  if (result.status === 'unsupported') {
    return { ok: false, text: messages.venture.mailTestUnsupported }
  }
  if (result.status === 'shared_fallback') {
    return { ok: false, text: messages.venture.mailTestSharedFallback }
  }

  const base =
    result.reason === 'auth_rejected'
      ? authRejectedMessage(result.provider)
      : result.reason === 'domain_unverified'
        ? messages.venture.mailTestDomainUnverified
        : result.reason === 'inconclusive'
          ? messages.venture.mailTestInconclusive
          : result.reason === 'connection'
            ? messages.venture.mailTestConnection
            : messages.venture.mailTestUnknown

  // Append the provider's own code — "535" is what a Google support page asks for.
  const detail = [result.responseCode, result.httpStatus, result.code].filter(Boolean).join(' · ')
  return { ok: false, text: detail ? `${base} (${detail})` : base }
}
