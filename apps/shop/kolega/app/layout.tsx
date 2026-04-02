import type { Metadata } from 'next'
import PlausibleProvider from 'next-plausible'
import { Inter } from 'next/font/google'
import { Navbar } from '@/features/layout/components/Navbar'
import { Footer } from '@/features/layout/components/Footer'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://kolega.haloefekt.pl'),
  title: {
    template: '%s | Sklep Olega',
    default: 'Sklep Olega — Meble, elektronika i wiele więcej',
  },
  description:
    'Meble, elektronika i wiele więcej — najlepsze oferty w jednym miejscu. Sprawdź naszą ofertę produktów.',
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Sklep Olega',
    title: 'Sklep Olega — Meble, elektronika i wiele więcej',
    description:
      'Meble, elektronika i wiele więcej — najlepsze oferty w jednym miejscu. Sprawdź naszą ofertę produktów.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl">
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <PlausibleProvider
          domain="kolega.haloefekt.pl"
          customDomain="https://analytics.trustcode.pl"
          selfHosted
          trackOutboundLinks
          trackFileDownloads
          enabled
        >
          <Navbar />
          <div className="min-h-screen">
            {children}
          </div>
          <Footer />
        </PlausibleProvider>
      </body>
    </html>
  )
}
