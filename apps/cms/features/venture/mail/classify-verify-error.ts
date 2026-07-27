// Classify a failed MailSender.verify() into a stable, non-secret reason the UI
// can explain. Pure — the provider error never leaves the server, only this.

const VERIFY_FAILURE_REASONS = {
  authRejected: 'auth_rejected',
  connection: 'connection',
  unknown: 'unknown',
} as const

export type MailVerifyFailureReason =
  (typeof VERIFY_FAILURE_REASONS)[keyof typeof VERIFY_FAILURE_REASONS]

/**
 * Outcome of a connection test. `unsupported` is DISTINCT from `ok`: reporting a
 * provider we cannot check as healthy would be the same false reassurance this
 * feature exists to remove.
 */
export type MailConnectionTest =
  | { status: 'ok' }
  | { status: 'unsupported' }
  | ({ status: 'failed' } & MailVerifyFailure)

export interface MailVerifyFailure {
  reason: MailVerifyFailureReason
  /** nodemailer transport code, e.g. EAUTH / ETIMEDOUT. */
  code?: string
  /** SMTP numeric reply, e.g. 535. */
  responseCode?: number
  /** HTTP status for API-based providers (Resend). */
  httpStatus?: number
}

const AUTH_SMTP_CODES = new Set(['EAUTH'])
const CONNECTION_SMTP_CODES = new Set(['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNREFUSED'])

export function classifyVerifyError(error: unknown): MailVerifyFailure {
  if (typeof error !== 'object' || error === null) {
    return { reason: VERIFY_FAILURE_REASONS.unknown }
  }
  const extras = error as { code?: unknown; responseCode?: unknown; status?: unknown }
  const code = typeof extras.code === 'string' ? extras.code : undefined
  const responseCode = typeof extras.responseCode === 'number' ? extras.responseCode : undefined
  const httpStatus = typeof extras.status === 'number' ? extras.status : undefined

  // 535 is the SMTP "bad credentials" reply; 401/403 the API equivalent.
  const isAuth =
    (code !== undefined && AUTH_SMTP_CODES.has(code)) ||
    responseCode === 535 ||
    httpStatus === 401 ||
    httpStatus === 403

  const isConnection = code !== undefined && CONNECTION_SMTP_CODES.has(code)

  const reason = isAuth
    ? VERIFY_FAILURE_REASONS.authRejected
    : isConnection
      ? VERIFY_FAILURE_REASONS.connection
      : VERIFY_FAILURE_REASONS.unknown

  return { reason, code, responseCode, httpStatus }
}
