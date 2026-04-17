/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Outlet, Scripts, ScrollRestoration } from '@tanstack/react-router'
import appCss from '../globals.css?url'
import { Navbar } from '@/features/layout/components/Navbar'
import { Footer } from '@/features/layout/components/Footer'
import { CookieBanner } from '@/features/legal/components/CookieBanner'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Sklep Olega — Meble, elektronika i wiele więcej' },
      { name: 'description', content: 'Meble, elektronika i wiele więcej — najlepsze oferty w jednym miejscu. Sprawdź naszą ofertę produktów.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'pl_PL' },
      { property: 'og:site_name', content: 'Sklep Olega' },
      { property: 'og:title', content: 'Sklep Olega — Meble, elektronika i wiele więcej' },
      { property: 'og:description', content: 'Meble, elektronika i wiele więcej — najlepsze oferty w jednym miejscu. Sprawdź naszą ofertę produktów.' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'index, follow' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    scripts: [
      {
        src: 'https://analytics.trustcode.pl/js/script.outbound-links.file-downloads.js',
        defer: true,
        'data-domain': 'oleg.haloefekt.pl',
        'data-api': 'https://analytics.trustcode.pl/api/event',
      },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground">
        <Navbar />
        <div className="min-h-screen">
          <Outlet />
        </div>
        <Footer />
        <CookieBanner />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {messages.notFound.title}
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        {messages.notFound.description}
      </p>
      <a
        href={routes.home}
        className="mt-8 inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {messages.notFound.backHome}
      </a>
    </main>
  )
}
