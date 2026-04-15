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
  const isDev = import.meta.env.DEV
  const message = isDev && error instanceof Error ? error.message : undefined
  const stack = isDev && error instanceof Error ? error.stack : undefined

  return (
    <html lang="pl" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Błąd | Halo Efekt CMS</title>
      </head>
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-2xl">
            <p className="text-destructive font-semibold">Coś poszło nie tak</p>
            <p className="text-sm text-muted-foreground">
              Błąd został zarejestrowany. Odśwież stronę.
            </p>
            {isDev && message && (
              <pre className="text-left text-xs bg-gray-900 text-red-400 p-4 rounded overflow-auto">
                {message}{'\n\n'}{stack}
              </pre>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
