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
 * Outcome of a connection test.
 *
 * `unsupported` and `shared_fallback` are both DISTINCT from `ok`, for the same
 * reason: reporting anything we did not actually verify as healthy is the false
 * reassurance this feature exists to remove.
 *
 * `shared_fallback` is the sharp one — a client that picked its OWN provider but
 * saved incomplete config degrades to the agency Resend account, so a naive test
 * would authenticate the AGENCY key and cheerfully report success while the
 * client's own credentials were never touched.
 *
 * `provider` rides along on failures so the UI can add provider-specific
 * caveats without re-deriving which sender ran.
 */
export type MailConnectionTest =
  | { status: 'ok' }
  | { status: 'unsupported' }
  | { status: 'shared_fallback' }
  | ({ status: 'failed'; provider: string } & MailVerifyFailure)

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

  // The fetch-based providers (Resend) never set `code`: an AbortSignal.timeout
  // surfaces as a DOMException named TimeoutError, and undici reports an
  // unreachable host as `TypeError: fetch failed` with a `cause`. Without these,
  // every network failure on that path fell through to `unknown`.
  const name = typeof (error as { name?: unknown }).name === 'string'
    ? (error as { name: string }).name
    : undefined
  const isFetchTransportError =
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    (name === 'TypeError' && 'cause' in (error as object))

  const isConnection =
    (code !== undefined && CONNECTION_SMTP_CODES.has(code)) || isFetchTransportError

  const reason = isAuth
    ? VERIFY_FAILURE_REASONS.authRejected
    : isConnection
      ? VERIFY_FAILURE_REASONS.connection
      : VERIFY_FAILURE_REASONS.unknown

  return { reason, code, responseCode, httpStatus }
}
