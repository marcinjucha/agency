// ---------------------------------------------------------------------------
// Venture bonus-funnel — mail sender abstraction.
//
// Clients (venture creators) can pick their own transactional-mail provider
// (agency-shared Resend, their own Resend account, or Gmail SMTP with an App
// Password) instead of always sending through the agency's shared Resend
// account. One `send()` contract lets `resolve.server.ts` hand callers a
// ready-to-use sender without them ever branching on provider.
// ---------------------------------------------------------------------------

export interface MailSenderInput {
  to: string
  subject: string
  html: string
}

export interface MailSender {
  send(input: MailSenderInput): Promise<void>
}
