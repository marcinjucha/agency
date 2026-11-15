import * as Sentry from '@sentry/node'
import { scrubBreadcrumb, scrubEvent } from '@/lib/monitoring/scrub'

/**
 * Server error reports to GlitchTip (project cms-agency) through the Sentry SDK. Started lazily on the first
 * report; no GLITCHTIP_DSN → nothing starts and nothing is sent (local dev, tests).
 *
 * Called from the global middlewares in lib/server-fn-logger.ts (failed server fns, thrown or 5xx /api routes),
 * so every server error passes here — no auto-instrumentation, no module hooks. On Vercel a function can freeze
 * as soon as it responds, so every report is flushed before the error is rethrown: an unflushed event is lost.
 *
 * @sentry/node 9 = the same SDK major as the browser's @sentry/tanstackstart-react, one @sentry/core.
 */
let started = false
let enabled = false

function start(): void {
  if (started) return
  started = true
  const dsn = process.env.GLITCHTIP_DSN?.trim()
  if (!dsn) return
  Sentry.init({
    dsn,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    // production | preview | development — previews read the staging database, so they must not look like prod.
    environment: process.env.VERCEL_ENV ?? 'local',
    sendDefaultPii: false,
    // Errors only: no performance tracing, no default integrations that read requests or local variables.
    tracesSampleRate: 0,
    defaultIntegrations: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  })
  enabled = true
}

export type ServerErrorTags = Record<string, string | number | undefined>

/** Reports one server error and waits (max 2 s) until it is sent. Never throws. */
export async function reportServerError(error: unknown, tags: ServerErrorTags): Promise<void> {
  try {
    start()
    if (!enabled) return
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(tags)) {
        if (value !== undefined) scope.setTag(key, String(value))
      }
      Sentry.captureException(error)
    })
    await Sentry.flush(2000)
  } catch {
    // Monitoring must never turn one failure into two.
  }
}
