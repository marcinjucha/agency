/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import appCss from '../globals.css?url'
import loraLatin from '@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url'
import loraLatinExt from '@fontsource-variable/lora/files/lora-latin-ext-wght-normal.woff2?url'
import { buildWebsiteHead, BASE_URL } from '@/lib/head'
import { getLandingCtaUrlFn } from '@/features/marketing/server'
import { getSiteSettingsFn, type SiteSettings } from '@/features/site-settings/server'
import { CookieBanner } from '@/features/legal/components/ConsentBanner'
import { Navbar } from '@/features/marketing/components/Navbar'
import { SiteFooter } from '@/features/marketing/components/SiteFooter'

const ROOT_DESCRIPTION =
  'Inteligentne ankiety, kwalifikacja AI i automatyczne rezerwacje dla polskich firm usługowych'

export type RootData = { ctaUrl: string; siteSettings: SiteSettings | null }

// Fetched once per request in `beforeLoad` and passed down via router `context`,
// so child routes (e.g. `/`) read the SAME { ctaUrl, siteSettings } without a
// second invocation of the server fns (preserves the previous cache-dedup behavior).
export async function fetchRootData(): Promise<RootData> {
  const [ctaUrl, siteSettings] = await Promise.all([
    getLandingCtaUrlFn(),
    getSiteSettingsFn(),
  ])
  return { ctaUrl, siteSettings }
}

export const Route = createRootRoute({
  beforeLoad: async (): Promise<{ rootData: RootData }> => {
    const rootData = await fetchRootData()
    return { rootData }
  },
  loader: ({ context }) => context.rootData,
  head: ({ loaderData }) => {
    const siteSettings = loaderData?.siteSettings as SiteSettings | null | undefined

    const baseMeta = buildWebsiteHead(
      'Halo Efekt — Automatyzacja procesów biznesowych',
      ROOT_DESCRIPTION,
    )

    const extraMeta: Array<Record<string, string>> = [
      { name: 'msvalidate.01', content: 'EC263CD6C3BC6E61C7BDE404F1BBC8AB' },
    ]

    if (siteSettings?.google_site_verification) {
      extraMeta.push({
        name: 'google-site-verification',
        content: siteSettings.google_site_verification,
      })
    }

    return {
      meta: [...baseMeta.meta, ...extraMeta],
      links: [
        { rel: 'preconnect', href: 'https://analytics.trustcode.pl', crossOrigin: 'anonymous' },
        { rel: 'dns-prefetch', href: 'https://analytics.trustcode.pl' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: loraLatin, crossOrigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: loraLatinExt, crossOrigin: 'anonymous' },
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
    url: BASE_URL,
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
  const { ctaUrl, siteSettings } = Route.useLoaderData()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isSurvey = pathname.startsWith('/survey')
  const isHome = pathname === '/'

  const organizationJsonLd = buildOrganizationJsonLd(siteSettings)

  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {!isSurvey && !isHome && <Navbar ctaUrl={ctaUrl} />}
        <Outlet />
        {!isSurvey && <SiteFooter ctaUrl={ctaUrl} />}
        <CookieBanner />
        <Scripts />
      </body>
    </html>
  )
}
