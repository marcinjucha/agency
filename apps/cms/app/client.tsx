import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN as string | undefined,
  environment: import.meta.env.MODE,
  // Only capture in production — avoids noise during development
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.1,
})

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
