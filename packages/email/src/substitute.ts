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
 * Scheme allow-list for a token value destined for an `href`/`src` ATTRIBUTE
 * context (Phase 3 drops author-supplied `{{bonus_N_url}}` into `href`).
 *
 * Entity-escaping (see `substituteTokens`) prevents attribute breakout but does
 * NOT neutralize a `javascript:` / `data:` protocol payload — `escapeHtml`
 * leaves `javascript:alert(1)` intact and the browser still executes it on
 * click. This is the second, scheme-level line of defense.
 *
 * Policy:
 *   - absolute URLs: allow ONLY `http:`, `https:`, `mailto:`
 *   - scheme-relative (`//host`), root-relative (`/path`), relative
 *     (`./x`, `../x`, `foo/bar`), and anchors (`#id`) — allowed (no scheme)
 *   - anything else (notably `javascript:`, `data:`, `vbscript:`, `file:`) →
 *     neutralized to `#`
 *
 * Implemented WITHOUT the `URL` constructor so it stays portable to the n8n
 * sandbox (which lacks `URL`). This is the exported primitive Phase 3 wires
 * into the `href` build — it is NOT called by `substituteTokens` itself.
 */
export function safeUrlValue(value: string): string {
  const trimmed = value.trim()

  // Mirror what a browser's URL parser strips BEFORE resolving an href: ASCII
  // whitespace and C0 control chars (\x00-\x1F) — notably TAB, LF, CR — are
  // removed from ANYWHERE in the string, not just the ends. Without this,
  // `java\tscript:...` / `\x01javascript:...` pass the scheme test unchanged
  // (`.trim()` only touches the ends) yet the browser collapses them back to
  // `javascript:` and executes. `escapeHtml` does NOT neutralize these — the
  // control chars aren't escaped and don't break the attribute. We test the
  // CLEANED string but RETURN the original `trimmed` value when safe, so
  // legitimate URLs are never silently altered.
  const cleaned = trimmed.replace(/[\x00-\x20]/g, '')
  if (cleaned === '') return NEUTRALIZED_URL

  // No `scheme:` prefix → relative / anchor / scheme-relative → safe.
  const schemeMatch = cleaned.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!schemeMatch) return trimmed

  const scheme = schemeMatch[1].toLowerCase() + ':'
  return SAFE_URL_SCHEMES.has(scheme) ? trimmed : NEUTRALIZED_URL
}
