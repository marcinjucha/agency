// ---------------------------------------------------------------------------
// Venture bonus-funnel — per-client mail sender resolution.
//
// Clients configure a mail provider on `so_clients` (`mail_provider`, see
// `MAIL_PROVIDERS`/`MailProvider` in features/venture/types.ts). `resolveMailSender`
// picks the right `MailSender` (./types.ts) for a client, falling back to the
// agency-shared Resend account whenever the client's chosen provider is
// missing required config.
//
// Registry pattern mirrors features/venture/esp/registry.server.ts — adding a
// 3rd provider is 1 factory entry below + 1 adapter file, not another
// if/else branch.
//
// This function must NEVER throw — a bad/missing client mail config is a
// no-lead-drop safety net: it degrades to the shared sender rather than
// blocking the send attempt.
// ---------------------------------------------------------------------------

import type { MailProvider } from '../types'
import { createGmailSmtpSender } from './gmail-smtp.server'
import { createResendMailSender, sendEmailViaResend } from './resend.server'
import type { MailSender } from './types'

export interface ClientMailConfig {
  // Raw TEXT from DB, narrowed against the `MailProvider` union below by key
  // lookup rather than a Zod/z.enum union — an unrecognized string degrades
  // to the shared sender (see MAIL_PROVIDER_FACTORIES lookup) rather than
  // throwing.
  mail_provider: string
  resend_api_key: string | null
  resend_from_email: string | null
  gmail_address: string | null
  gmail_app_password: string | null
  // Friendly "From" display name (client's brand, e.g. "Przystań Inwestorów").
  // NOT a secret — plain nullable column. Applied to Gmail SMTP and the
  // client's own Resend account; the agency-shared Resend sender does NOT
  // receive it (separate concern, out of scope here).
  sender_name: string | null
}

// The agency-shared Resend sender — the fallback `resolveMailSender` returns when
// a client has no own provider (or an incomplete one). Exported so the read-only
// "effective sender" describe path (effective-sender.server.ts) can detect the
// fallback by IDENTITY against the REAL resolver, rather than re-deriving the
// factory's completeness rules.
export const SHARED_RESEND_SENDER: MailSender = { send: sendEmailViaResend }

function hasValue(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// Factory returns null when the client's config for that provider is
// incomplete — the caller (resolveMailSender) falls back + warns. No entry
// for 'resend_shared': it IS the fallback, so it never needs a factory.
type MailProviderFactory = (client: ClientMailConfig) => MailSender | null

const MAIL_PROVIDER_FACTORIES: Partial<
  Record<Exclude<MailProvider, 'resend_shared'>, MailProviderFactory>
> = {
  resend_own: (client) =>
    hasValue(client.resend_api_key) && hasValue(client.resend_from_email)
      ? createResendMailSender({
          apiKey: client.resend_api_key,
          from: client.resend_from_email,
          fromName: client.sender_name,
        })
      : null,
  gmail_smtp: (client) =>
    hasValue(client.gmail_address) && hasValue(client.gmail_app_password)
      ? createGmailSmtpSender({
          address: client.gmail_address,
          appPassword: client.gmail_app_password,
          senderName: client.sender_name,
        })
      : null,
}

export function resolveMailSender(client: ClientMailConfig): MailSender {
  const factory =
    MAIL_PROVIDER_FACTORIES[client.mail_provider as keyof typeof MAIL_PROVIDER_FACTORIES]

  // No factory registered — either 'resend_shared' (the expected default) or
  // an unrecognized string. Both fall back silently, no warn: this is not a
  // configuration error, it's the intended default path.
  if (!factory) return SHARED_RESEND_SENDER

  const sender = factory(client)
  if (sender) return sender

  console.warn(
    `[venture mail] client mail_provider=${client.mail_provider} but missing required config — falling back to shared Resend account`,
  )
  return SHARED_RESEND_SENDER
}
