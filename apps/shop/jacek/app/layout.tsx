import type { Metadata } from 'next'
import PlausibleProvider from 'next-plausible'
import { Merriweather } from 'next/font/google'
import { Geist } from 'next/font/google'
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
    template: '%s | Jacek',
    default: 'Jacek — Księgarnia',
  },
  description: 'Książki i materiały edukacyjne',
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
          {children}
        </PlausibleProvider>
      </body>
    </html>
  )
}
