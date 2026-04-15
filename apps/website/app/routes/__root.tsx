/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import appCss from '../globals.css?url'
import { buildWebsiteHead } from '@/lib/head'

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CookieBanner — TanStack Start version
// Uses @tanstack/react-router Link (not next/link).
// The features/legal/components/CookieBanner.tsx uses next/link so it cannot
// be imported here until the feature component is adapted in a later iteration.
// ---------------------------------------------------------------------------

const COOKIE_STORAGE_KEY = 'cookie-consent-dismissed'

function CookieBanner() {
  const [show, setShow] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(COOKIE_STORAGE_KEY)) return
    } catch {
      return
    }
    setShow(true)
    const id = requestAnimationFrame(() => setAnimateIn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, '1')
    } catch {
      // Dismissed for this session only
    }
    setAnimateIn(false)
    setTimeout(() => setShow(false), 500)
  }, [])

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Informacja o plikach cookie"
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        animateIn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-2xl shadow-lg shadow-black/25">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-sm text-muted-foreground">
              Ta strona korzysta z plików cookie, aby zapewnić najlepsze doświadczenie.{' '}
              <Link
                to="/polityka-prywatnosci"
                className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors duration-200"
              >
                Polityka prywatności
              </Link>
            </p>

            <div className="flex items-center gap-3 shrink-0">
              <Link to="/polityka-prywatnosci" tabIndex={-1}>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Więcej informacji
                </button>
              </Link>
              <button
                type="button"
                onClick={handleAccept}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
              >
                Akceptuję
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
