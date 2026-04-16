/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import appCss from '../globals.css?url'
import { buildWebsiteHead } from '@/lib/head'
import { CookieBanner } from '@/features/legal/components/ConsentBanner'

export const Route = createRootRoute({
  head: () => ({
    ...buildWebsiteHead('Halo Efekt — Automatyzacja procesów biznesowych'),
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    scripts: [
      // Plausible analytics — self-hosted, custom domain, deferred for perf
      {
        defer: true,
        src: 'https://analytics.trustcode.pl/js/script.outbound-links.file-downloads.tagged-events.js',
        'data-domain': 'haloefekt.pl',
      },
    ],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground overflow-x-hidden">
        <Outlet />
        <CookieBanner />
        <Scripts />
      </body>
    </html>
  )
}
