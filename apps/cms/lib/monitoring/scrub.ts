import { redactEmails } from '@/lib/server-fn-logger'

/**
 * What an error report to GlitchTip may carry: the error, its stack, the release, the route and our tags
 * (server fn name, file). Never personal data — server fn inputs carry lead PII and live secrets (the venture
 * client editor posts a Gmail app password), and error text interpolates row data. So: no cookies, headers,
 * bodies, query strings, stack-frame local variables, user fields other than the id.
 *
 * `sendDefaultPii: false` stops most collection at the source; this is the backstop on whatever is left (an
 * exception message that interpolated an email, a URL with a token in its query). Ported from course-platform
 * (src/lib/monitoring/scrub.ts), which runs the same rules on Sentry 11.
 */

// Keys whose whole value goes: they hold request data or local variables.
const DROP = new Set(['cookies', 'headers', 'data', 'query_string', 'vars', 'env', 'body'])

/** "https://x/auth/confirm?token_hash=…#…" → "https://x/auth/confirm": tokens and emails ride in query strings. */
export function withoutQuery(url: string): string {
  return url.replace(/[?#][\s\S]*$/, '')
}

function scrub(value: unknown, key: string): unknown {
  if (typeof value === 'string') {
    const text = key === 'url' || key === 'from' || key === 'to' ? withoutQuery(value) : value
    return redactEmails(text)
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, key))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (DROP.has(k)) continue
      if (k === 'user') {
        const id = (v as { id?: unknown } | null)?.id
        if (typeof id === 'string' || typeof id === 'number') out.user = { id }
        continue
      }
      out[k] = scrub(v, k)
    }
    return out
  }
  return value
}

/** Typed loosely on purpose: the same scrubber serves the node and the browser SDK's event types. */
export function scrubEvent<T>(event: T): T {
  return scrub(event, '') as T
}

export function scrubBreadcrumb<T>(breadcrumb: T): T {
  return scrub(breadcrumb, '') as T
}
