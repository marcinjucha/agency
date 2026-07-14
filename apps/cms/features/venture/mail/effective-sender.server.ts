// ---------------------------------------------------------------------------
// Venture bonus-funnel — READ-ONLY "effective sender" description.
//
// Surfaces (never mutates) WHICH sender a real bonus-email send would actually
// use for a client, for the campaign editor's "Ten launch wysyła" card.
//
// It REUSES the real `resolveMailSender` (never reimplements the factory /
// completeness rules): it feeds a probe config and detects the shared-agency
// fallback by IDENTITY against `SHARED_RESEND_SENDER`. The one hazard we must
// surface is the SILENT degrade to the agency account (`isSharedFallback`).
//
// SECRET-SAFE: the authenticated (cookie) admin client CANNOT SELECT the
// plaintext `resend_api_key` / `gmail_app_password` columns (GRANT revoked). We
// only ever receive the generated `has_*` booleans + the non-secret address
// fields, and feed `resolveMailSender` a non-empty SENTINEL wherever the secret
// EXISTS. `resolveMailSender`'s fallback decision only checks PRESENCE
// (`hasValue`), never the secret's value — so the probe reproduces the real
// send-time choice without a secret ever leaving the DB.
// ---------------------------------------------------------------------------

import { messages } from '@/lib/messages'
import type { MailProvider } from '../types'
import { resolveMailSender, SHARED_RESEND_SENDER, type ClientMailConfig } from './resolve.server'

export interface EffectiveSenderInput {
  mailProvider: string
  resendFromEmail: string | null
  gmailAddress: string | null
  senderName: string | null
  hasResendApiKey: boolean
  hasGmailAppPassword: boolean
  /** Agency-shared Resend "From" (RESEND_FROM_EMAIL env) — shown when a client falls back. */
  sharedFromEmail: string
}

export interface EffectiveSender {
  /** Localized provider descriptor (agency / own Resend / Gmail). */
  senderLabel: string
  /** The address a send will actually originate from. */
  senderEmail: string
  /** True when the client silently degrades to the shared agency Resend account. */
  isSharedFallback: boolean
}

// Non-empty placeholder standing in for a present-but-unreadable secret.
const SECRET_PRESENT_SENTINEL = '__present__'

export function describeEffectiveSender(input: EffectiveSenderInput): EffectiveSender {
  const probe: ClientMailConfig = {
    mail_provider: input.mailProvider,
    resend_api_key: input.hasResendApiKey ? SECRET_PRESENT_SENTINEL : null,
    resend_from_email: input.resendFromEmail,
    gmail_address: input.gmailAddress,
    gmail_app_password: input.hasGmailAppPassword ? SECRET_PRESENT_SENTINEL : null,
    sender_name: input.senderName,
  }

  // Identity against the shared sender is the source of truth for "did this
  // degrade to the agency account?" — reuse of the REAL resolver, not a copy.
  const isSharedFallback = resolveMailSender(probe) === SHARED_RESEND_SENDER

  if (isSharedFallback) {
    return {
      senderLabel: messages.venture.mailProviderResendShared,
      senderEmail: input.sharedFromEmail,
      isSharedFallback: true,
    }
  }

  const provider = input.mailProvider as MailProvider
  if (provider === 'gmail_smtp') {
    return {
      senderLabel: messages.venture.mailProviderGmail,
      // Non-fallback ⇒ the factory succeeded ⇒ the address is present; the
      // `?? sharedFromEmail` is a defensive no-op that keeps the type non-null.
      senderEmail: input.gmailAddress ?? input.sharedFromEmail,
      isSharedFallback: false,
    }
  }

  // resend_own — the only other provider whose factory can succeed.
  return {
    senderLabel: messages.venture.mailProviderResendOwn,
    senderEmail: input.resendFromEmail ?? input.sharedFromEmail,
    isSharedFallback: false,
  }
}
