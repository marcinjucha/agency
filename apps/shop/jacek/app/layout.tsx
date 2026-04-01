import type { Metadata } from 'next'
import PlausibleProvider from 'next-plausible'
import { Merriweather } from 'next/font/google'
import { Geist } from 'next/font/google'
import { Navbar } from '@/features/layout/components/Navbar'
import { Footer } from '@/features/layout/components/Footer'
import './globals.css'

const merriweather = Merriweather({
  variable: '--font-merriweather',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://jacek.haloefekt.pl'),
  title: {
    template: '%s | Książki Jacka',
    default: 'Książki Jacka — Autorskie publikacje i materiały edukacyjne',
  },
  description:
    'Autorskie książki i materiały edukacyjne. Publikacje od praktyki do teorii.',
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Książki Jacka',
    title: 'Książki Jacka — Autorskie publikacje i materiały edukacyjne',
    description:
      'Autorskie książki i materiały edukacyjne. Publikacje od praktyki do teorii.',
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
    <html lang="pl" className="dark">
      <body
        className={`${merriweather.variable} ${geistSans.variable} antialiased bg-background text-foreground`}
      >
        <PlausibleProvider
          domain="jacek.haloefekt.pl"
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
