// ---------------------------------------------------------------------------
// Venture bonus-funnel — Resend REST adapter (iter 3).
//
// beehiiv free has no Automations, so the CMS sends the transactional bonus
// email via Resend directly. Mirrors the ESP HTTP pattern
// (features/venture/esp/http.server.ts): plain `fetch` + AbortSignal timeout,
// THROW on non-2xx so the ingest caller can catch + log (never silently
// swallow). Deliberately does NOT add the `resend` npm package.
//
// Key + sender are single-global server-only env vars (never VITE_).
// ---------------------------------------------------------------------------

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

export async function sendEmailViaResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey) throw new Error('Missing RESEND_API_KEY environment variable')
  if (!from) throw new Error('Missing RESEND_FROM_EMAIL environment variable')

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
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
