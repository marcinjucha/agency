/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import * as Sentry from '@sentry/tanstackstart-react'
import appCss from '../globals.css?url'
import { getAuthContextFn } from '@/lib/server-fns/auth'
import type { RouterContext } from '../router'
import { buildCmsHead } from '@/lib/head'

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const auth = await getAuthContextFn()
    return { auth }
  },
  head: () => ({
    ...buildCmsHead(),
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: SentryErrorBoundary,
  component: RootLayout,
})

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function RootLayout() {
  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground">
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}

function SentryErrorBoundary({ error }: { error: unknown }) {
  Sentry.captureException(error)

  return (
    <html lang="pl" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Błąd | Halo Efekt CMS</title>
      </head>
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-destructive font-semibold">Coś poszło nie tak</p>
            <p className="text-sm text-muted-foreground">
              Błąd został zarejestrowany. Odśwież stronę.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
