/**
 * Pure, ZERO-DEPENDENCY substitution primitives for baked email HTML.
 *
 * IMPORT-FREE TIER — this module MUST NOT import `@react-email/*`,
 * `sanitize-html`, or any other dependency. It mirrors the import-free tier of
 * `blocks/defaults.ts` so it can be imported from vitest, the CMS app-send
 * path, AND (next iteration) the n8n evaluator JS without dragging deps into
 * consumers.
 *
 * Layer 4 of the email template architecture (`docs/EMAIL_TEMPLATE_ARCHITECTURE.md`):
 * theme hex is baked into `html_body` at SAVE; these functions substitute
 * per-recipient variables into that baked HTML at SEND. The two namespaces are
 * disjoint and sequenced — a `{{token}}` must never resolve to a color.
 */

/**
 * HTML-entity escape. Promoted VERBATIM from the byte-identical copies that
 * previously lived in `features/venture/mail/bonus-email.ts` and
 * `features/blog/extensions/downloadable-asset-html.ts` (5 replacements, order
 * `& < > " '`). Order matters: `&` MUST be first so the ampersands introduced
 * by the later replacements are not themselves re-escaped.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * The single `{{token}}` grammar shared by BOTH `substituteTokens` (HTML) and
 * `substitutePlain` (subject / plaintext) — ONE regex source so the two paths
 * cannot drift. Mirrors n8n's canonical `resolveVariables`
 * (`n8n-workflows/scripts/evaluators/resolve-variables.js`) and the n8n Send
 * Email handler's `substituteBindingsHtml` — all four MUST accept the same key
 * grammar, including dotted keys (`{{a.b}}`), so app-sent == n8n-sent. The
 * `escape-parity` golden fixture guards the dotted-key case against silent
 * divergence.
 *
 *   - key may be padded with whitespace; it is trimmed before lookup
 *   - `[\w.]` accepts dotted keys; a dotted key simply won't be found in a flat
 *     record and is left literal — the correct, safe behavior
 *   - a MISSING key is left LITERAL (`{{key}}`) — never blanked — so a
 *     mis-binding is detectable and every send path agrees
 *
 * `.replace` with a global regex resets `lastIndex` per call, so sharing this
 * module-level constant across functions is stateless and safe.
 */
const TOKEN_PATTERN = /\{\{(\s*[\w.]+\s*)\}\}/g

/**
 * Core single-pass substitution. `transform` is applied to each resolved value
 * (HTML-escape for the body, identity for plaintext). SINGLE `.replace` pass:
 * a value that itself contains `{{x}}` is emitted via `transform` and never
 * re-substituted (no second pass).
 */
function substituteWith(
  text: string,
  values: Record<string, string>,
  transform: (value: string) => string,
): string {
  return text.replace(TOKEN_PATTERN, (_match, rawKey: string) => {
    const key = rawKey.trim()
    const value = values[key]
    return value !== undefined && value !== null ? transform(value) : `{{${key}}}`
  })
}

/**
 * Substitute `{{token}}` placeholders in baked HTML with per-recipient values.
 *
 * escape-FIRST: the resolved value is HTML-escaped inside the callback, so a
 * value that itself contains `{{x}}` is emitted as inert text and never
 * re-substituted. HTML-escaping is MANDATORY and non-optional — this function
 * is for HTML-body context only. Do NOT use it for email subjects (subjects are
 * plaintext; escaping them double-encodes — use `substitutePlain`).
 */
export function substituteTokens(html: string, values: Record<string, string>): string {
  return substituteWith(html, values, escapeHtml)
}

/**
 * Substitute `{{token}}` placeholders in PLAINTEXT (email subjects) — same
 * grammar + leave-literal semantics as `substituteTokens`, but NO HTML escaping
 * (a subject is not an HTML context; escaping it would double-encode). Shares
 * `TOKEN_PATTERN` with `substituteTokens` so the subject and body paths cannot
 * drift on the token grammar.
 */
export function substitutePlain(text: string, values: Record<string, string>): string {
  return substituteWith(text, values, (value) => value)
}

const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:'])
const NEUTRALIZED_URL = '#'

/**
 * Scheme ALLOW-list for a token value destined for an `href`/`src` ATTRIBUTE
 * context. Only http/https/mailto pass; `data:image/…` is additionally allowed
 * to match the email image-block validator (`block-registry.ts` imageSrcSchema,
 * which accepts base64 inline images). EVERY other scheme — `javascript:`,
 * `vbscript:`, `file:`, `data:` non-image, `tel:`, `sms:`, `intent:`,
 * `android-app:`, custom deep-links — is neutralized to `#`.
 *
 * WHY allow-list (reversed from an earlier deny-list): entity-escaping prevents
 * attribute breakout but does NOT neutralize a protocol payload — the browser
 * still runs `javascript:alert(1)` on click. An allow-list is the conservative
 * default: it neutralizes the whole open-ended space of non-http schemes
 * (app-launch intents, etc.) rather than trying to enumerate the dangerous ones.
 * There are no legitimate non-http links in any email today; if a real deep-link
 * need appears, add that one scheme to SAFE_URL_SCHEMES then.
 *
 * Relative / anchor / scheme-relative (`/path`, `#id`, `//host`) have no scheme
 * and are passed through. Implemented WITHOUT the `URL` constructor so it stays
 * portable to the n8n sandbox.
 */
export function safeUrlValue(value: string): string {
  const trimmed = value.trim()

  // Mirror what a browser's URL parser strips BEFORE resolving an href: ASCII
  // whitespace and C0 control chars (\x00-\x1F) are removed from ANYWHERE, not
  // just the ends. Without this, `java\tscript:...` passes the scheme test yet
  // the browser collapses it back to `javascript:`. Test the CLEANED string but
  // RETURN the original `trimmed` when safe, so legitimate URLs are unaltered.
  const cleaned = trimmed.replace(/[\x00-\x20]/g, '')
  if (cleaned === '') return NEUTRALIZED_URL

  // No `scheme:` prefix → relative / anchor / scheme-relative → safe.
  const schemeMatch = cleaned.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!schemeMatch) return trimmed

  const scheme = schemeMatch[1].toLowerCase() + ':'
  if (SAFE_URL_SCHEMES.has(scheme)) return trimmed
  // Inline base64 images only (data:image/…) — matches the CMS image validator.
  if (cleaned.toLowerCase().startsWith('data:image/')) return trimmed
  return NEUTRALIZED_URL
}

/**
 * Sanitize `href`/`src` ATTRIBUTE values in a FINAL, fully-substituted email
 * HTML string by running each through `safeUrlValue`. Pure, zero-dependency,
 * regex-only (portable to the n8n sandbox).
 *
 * The attribute name is anchored with a `(^|\s)` prefix so `href`/`src` only
 * match as a WHOLE attribute name — `data-href`, `xlink:href`, `data-src` are
 * NOT touched. All three quoting styles are covered: double-quoted,
 * single-quoted, and unquoted (`href=javascript:…`).
 */
export function sanitizeHtmlUrls(html: string): string {
  return html
    .replace(/(^|\s)(href|src)\s*=\s*"([^"]*)"/gi, (_m, pre: string, attr: string, val: string) => `${pre}${attr}="${safeUrlValue(val)}"`)
    .replace(/(^|\s)(href|src)\s*=\s*'([^']*)'/gi, (_m, pre: string, attr: string, val: string) => `${pre}${attr}='${safeUrlValue(val)}'`)
    .replace(/(^|\s)(href|src)\s*=\s*([^\s"'>]+)/gi, (_m, pre: string, attr: string, val: string) => `${pre}${attr}=${safeUrlValue(val)}`)
}
