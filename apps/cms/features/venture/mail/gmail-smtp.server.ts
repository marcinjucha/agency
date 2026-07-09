// ---------------------------------------------------------------------------
// Venture bonus-funnel — Gmail SMTP mail sender.
//
// One client-configurable alternative to Resend: plain SMTP via a Google
// App Password (16-char, NOT OAuth). Uses `nodemailer` directly — no wrapper
// abstraction beyond the shared `MailSender` contract (./types.ts).
//
// Errors from `sendMail` (auth failure, SMTP reject) are NOT swallowed here —
// they propagate to the caller. The ingest caller (features/venture/ingest.server.ts)
// wraps bonus-email sending in try/catch per the "no-lead-drop" pattern: a mail
// failure must never roll back lead persistence, but it must stay visible
// (logged), not be silently caught in this module.
// ---------------------------------------------------------------------------

import nodemailer from 'nodemailer'
import type { MailSender, MailSenderInput } from './types'

const SMTP_TIMEOUT_MS = 10_000

export function createGmailSmtpSender(config: {
  address: string
  appPassword: string
}): MailSender {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.address, pass: config.appPassword },
    connectionTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  })

  return {
    async send(input: MailSenderInput): Promise<void> {
      await transporter.sendMail({
        from: config.address,
        to: input.to,
        subject: input.subject,
        html: input.html,
      })
    },
  }
}
