// ---------------------------------------------------------------------------
// Venture bonus-funnel — Resend REST adapter (iter 3, refactored for
// client-configurable mail providers).
//
// beehiiv free has no Automations, so the CMS sends the transactional bonus
// email via Resend directly. Mirrors the ESP HTTP pattern
// (features/venture/esp/http.server.ts): plain `fetch` + AbortSignal timeout,
// THROW on non-2xx so the ingest caller can catch + log (never silently
// swallow). Deliberately does NOT add the `resend` npm package.
//
// `sendResendEmail` is the shared, parameterized core (apiKey/from passed in
// explicitly — never reads env itself). Two thin layers on top:
//   - `sendEmailViaResend` — same signature as before, reads the agency's
//     shared `RESEND_API_KEY`/`RESEND_FROM_EMAIL` env vars. Kept for backward
//     compat with existing callers/tests.
//   - `createResendMailSender` — builds a `MailSender` (see ./types.ts) from
//     an explicit per-client `{ apiKey, from }` config, for clients who bring
//     their own Resend account (`resend_own`).
// ---------------------------------------------------------------------------

import { formatFromHeader } from './format-from'
import type { MailSender, MailSenderInput } from './types'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const REQUEST_TIMEOUT_MS = 15_000

export class ResendApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
    message?: string,
  ) {
    super(message || `Resend API error ${status}: ${statusText}`)
    this.name = 'ResendApiError'
  }
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

interface ResendSendParams extends SendEmailInput {
  apiKey: string
  from: string
}

/**
 * Core Resend send — explicit apiKey/from params, never reads process.env.
 * Throws ResendApiError on non-2xx.
 */
async function sendResendEmail(params: ResendSendParams): Promise<void> {
  const { apiKey, from, to, subject, html } = params

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      parsed = body
    }
    throw new ResendApiError(response.status, response.statusText, parsed)
  }
}

/** Backward-compat entry point — agency-shared Resend account via env vars. */
export async function sendEmailViaResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey) throw new Error('Missing RESEND_API_KEY environment variable')
  if (!from) throw new Error('Missing RESEND_FROM_EMAIL environment variable')

  await sendResendEmail({ apiKey, from, ...input })
}

/** Build a MailSender backed by an explicit (client-owned) Resend config. */
export function createResendMailSender(config: {
  apiKey: string
  from: string
  // Optional friendly "From" display name (client's brand). When set (after
  // trim), formatted as the standard RFC 5322 `"Name" <email>` — Resend's
  // API `from` field accepts this format. Falls back to the bare address
  // (existing behavior) when unset/blank.
  fromName?: string | null
}): MailSender {
  const from = formatFromHeader(config.fromName, config.from)
  return {
    send: (input: MailSenderInput) => sendResendEmail({ apiKey: config.apiKey, from, ...input }),
  }
}
