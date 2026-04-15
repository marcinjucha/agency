/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import appCss from '../globals.css?url'
import { buildWebsiteHead } from '@/lib/head'

export const Route = createRootRoute({
  head: () => ({
    ...buildWebsiteHead('Halo Efekt — Automatyzacja procesów biznesowych'),
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: RootLayout,
})

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function RootLayout() {
  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground overflow-x-hidden">
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
