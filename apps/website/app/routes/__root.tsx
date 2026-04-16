/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import {
  DEFAULT_BLOCKS,
  type NavbarBlock,
  type FooterBlock,
} from '@agency/database'
import appCss from '../globals.css?url'
import { buildWebsiteHead } from '@/lib/head'
import { CookieBanner } from '@/features/legal/components/ConsentBanner'
import { Navbar } from '@/features/marketing/components/Navbar'
import { Footer } from '@/features/marketing/components/Footer'

const defaultNavbar = DEFAULT_BLOCKS.find((b) => b.type === 'navbar') as NavbarBlock
const defaultFooter = DEFAULT_BLOCKS.find((b) => b.type === 'footer') as FooterBlock

export const Route = createRootRoute({
  head: () => ({
    ...buildWebsiteHead('Halo Efekt — Automatyzacja procesów biznesowych'),
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    scripts: [
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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isSurvey = pathname.startsWith('/survey')

  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground overflow-x-hidden">
        {!isSurvey && <Navbar {...defaultNavbar} />}
        <Outlet />
        {!isSurvey && <Footer {...defaultFooter} />}
        <CookieBanner />
        <Scripts />
      </body>
    </html>
  )
}
