// ---------------------------------------------------------------------------
// Venture bonus-funnel — per-client mail sender resolution.
//
// Clients configure a mail provider on `so_clients` (migrated concurrently by
// another agent — do NOT assume the generated `Tables<'so_clients'>` type
// carries these fields yet; `ClientMailConfig` below is a local, deliberately
// loose shape). `resolveMailSender` picks the right `MailSender` (./types.ts)
// for a client, falling back to the agency-shared Resend account whenever the
// client's chosen provider is missing required config.
//
// This function must NEVER throw — a bad/missing client mail config is a
// no-lead-drop safety net: it degrades to the shared sender rather than
// blocking the send attempt.
// ---------------------------------------------------------------------------

import { createGmailSmtpSender } from './gmail-smtp.server'
import { createResendMailSender, sendEmailViaResend } from './resend.server'
import type { MailSender } from './types'

export interface ClientMailConfig {
  // Raw TEXT from DB — 'resend_shared' | 'resend_own' | 'gmail_smtp'. Narrowed
  // by string comparison below rather than a Zod/z.enum union, since the DB
  // migration for this column is landing concurrently in another agent's work.
  mail_provider: string
  resend_api_key: string | null
  resend_from_email: string | null
  gmail_address: string | null
  gmail_app_password: string | null
}

const SHARED_RESEND_SENDER: MailSender = { send: sendEmailViaResend }

function hasValue(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function resolveMailSender(client: ClientMailConfig): MailSender {
  if (client.mail_provider === 'resend_own') {
    if (hasValue(client.resend_api_key) && hasValue(client.resend_from_email)) {
      return createResendMailSender({
        apiKey: client.resend_api_key,
        from: client.resend_from_email,
      })
    }
    console.warn(
      '[venture mail] client mail_provider=resend_own but missing api key or from address — falling back to shared Resend account',
    )
    return SHARED_RESEND_SENDER
  }

  if (client.mail_provider === 'gmail_smtp') {
    if (hasValue(client.gmail_address) && hasValue(client.gmail_app_password)) {
      return createGmailSmtpSender({
        address: client.gmail_address,
        appPassword: client.gmail_app_password,
      })
    }
    console.warn(
      '[venture mail] client mail_provider=gmail_smtp but missing gmail address or app password — falling back to shared Resend account',
    )
    return SHARED_RESEND_SENDER
  }

  // 'resend_shared' or any unrecognized value → agency-shared sender.
  return SHARED_RESEND_SENDER
}
