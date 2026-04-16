/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import {
  DEFAULT_BLOCKS,
  type NavbarBlock,
  type FooterBlock,
} from '@agency/database'
import type { RouterContext } from '../router'
import appCss from '../globals.css?url'
import { buildWebsiteHead } from '@/lib/head'
import { queryKeys } from '@/lib/query-keys'
import { getPublicLandingPageFn } from '@/features/marketing/server'
import { CookieBanner } from '@/features/legal/components/ConsentBanner'
import { Navbar } from '@/features/marketing/components/Navbar'
import { Footer } from '@/features/marketing/components/Footer'

const defaultNavbar = DEFAULT_BLOCKS.find((b) => b.type === 'navbar') as NavbarBlock
const defaultFooter = DEFAULT_BLOCKS.find((b) => b.type === 'footer') as FooterBlock


async function fetchLandingBlocks() {
  const page = await getPublicLandingPageFn()
  const blocks = page?.blocks?.length ? page.blocks : DEFAULT_BLOCKS
  return {
    navbar: (blocks.find((b: { type: string }) => b.type === 'navbar') as NavbarBlock) ?? defaultNavbar,
    footer: (blocks.find((b: { type: string }) => b.type === 'footer') as FooterBlock) ?? defaultFooter,
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.landing.all,
      queryFn: fetchLandingBlocks,
    }),
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
  const { queryClient } = Route.useRouteContext()
  const { data } = useQuery({
    queryKey: landingQueryKey,
    queryFn: fetchLandingBlocks,
  })
  const navbar = data?.navbar ?? defaultNavbar
  const footer = data?.footer ?? defaultFooter

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isSurvey = pathname.startsWith('/survey')

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="pl">
        <head>
          <HeadContent />
        </head>
        <body className="antialiased bg-background text-foreground overflow-x-hidden">
          {!isSurvey && <Navbar {...navbar} />}
          <Outlet />
          {!isSurvey && <Footer {...footer} />}
          <CookieBanner />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  )
}
