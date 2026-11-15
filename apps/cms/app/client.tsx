import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import * as Sentry from '@sentry/tanstackstart-react'
import { scrubBreadcrumb, scrubEvent } from '@/lib/monitoring/scrub'

// Browser errors to GlitchTip (project cms-agency). The DSN is build-time (VITE_*, listed in turbo.json
// globalEnv — without it Turbo filters the variable out and the build has no DSN). Environment and release
// come from the Vercel build (vite.config.ts `define`), so preview and production reports are told apart.
Sentry.init({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN as string | undefined,
  environment: __APP_ENV__,
  release: __APP_RELEASE__,
  // Only capture in production builds — avoids noise during development
  enabled: import.meta.env.PROD,
  sendDefaultPii: false,
  // Errors only: no performance tracing, no session posts on every page load, no dropped-event reports.
  tracesSampleRate: 0,
  sendClientReports: false,
  // Console and click breadcrumbs carry whatever was on screen (lead names, emails): navigation and requests only.
  integrations: (defaults) => [
    ...defaults.filter((i) => !['Breadcrumbs', 'BrowserSession'].includes(i.name)),
    Sentry.breadcrumbsIntegration({ dom: false, console: false }),
  ],
  beforeSend: (event) => scrubEvent(event),
  beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
})

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
