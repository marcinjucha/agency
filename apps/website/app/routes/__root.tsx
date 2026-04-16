/// <reference types="vite/client" />
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
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
import { getSiteSettingsFn, type SiteSettings } from '@/features/site-settings/server'
import { CookieBanner } from '@/features/legal/components/ConsentBanner'
import { Navbar } from '@/features/marketing/components/Navbar'
import { Footer } from '@/features/marketing/components/Footer'

const defaultNavbar = DEFAULT_BLOCKS.find((b) => b.type === 'navbar') as NavbarBlock
const defaultFooter = DEFAULT_BLOCKS.find((b) => b.type === 'footer') as FooterBlock

const ROOT_DESCRIPTION =
  'Inteligentne ankiety, kwalifikacja AI i automatyczne rezerwacje dla polskich firm usługowych'

async function fetchRootData() {
  const [page, siteSettings] = await Promise.all([
    getPublicLandingPageFn(),
    getSiteSettingsFn(),
  ])
  const blocks = page?.blocks?.length ? page.blocks : DEFAULT_BLOCKS
  return {
    navbar: (blocks.find((b: { type: string }) => b.type === 'navbar') as NavbarBlock) ?? defaultNavbar,
    footer: (blocks.find((b: { type: string }) => b.type === 'footer') as FooterBlock) ?? defaultFooter,
    siteSettings,
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.landing.all,
      queryFn: fetchRootData,
      staleTime: 1000 * 60 * 60, // 1h — aligned with CACHE_STATIC s-maxage=3600
    }),
  head: ({ loaderData }) => {
    const siteSettings = loaderData?.siteSettings as SiteSettings | null | undefined

    const baseMeta = buildWebsiteHead(
      'Halo Efekt — Automatyzacja procesów biznesowych',
      ROOT_DESCRIPTION,
    )

    const extraMeta: Array<Record<string, string>> = []

    if (siteSettings?.google_site_verification) {
      extraMeta.push({
        name: 'google-site-verification',
        content: siteSettings.google_site_verification,
      })
    }

    return {
      meta: [...baseMeta.meta, ...extraMeta],
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
    }
  },
  component: RootLayout,
})

// ---------------------------------------------------------------------------
// Organization JSON-LD (mirrors old Next.js layout)
// ---------------------------------------------------------------------------

function buildOrganizationJsonLd(settings: SiteSettings | null | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings?.organization_name || 'Halo Efekt',
    url: 'https://haloefekt.pl',
    ...(settings?.logo_url ? { logo: settings.logo_url } : {}),
    sameAs: [
      settings?.social_facebook,
      settings?.social_instagram,
      settings?.social_linkedin,
      settings?.social_twitter,
    ].filter(Boolean),
  }
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

function RootLayout() {
  const { queryClient } = Route.useRouteContext()
  const loaderData = Route.useLoaderData()
  const navbar = loaderData?.navbar ?? defaultNavbar
  const footer = loaderData?.footer ?? defaultFooter
  const siteSettings = loaderData?.siteSettings as SiteSettings | null | undefined

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isSurvey = pathname.startsWith('/survey')

  const organizationJsonLd = buildOrganizationJsonLd(siteSettings)

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="pl">
        <head>
          <HeadContent />
        </head>
        <body className="antialiased bg-background text-foreground overflow-x-hidden">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
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
