import type { Metadata } from "next";
import PlausibleProvider from "next-plausible";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CookieBanner } from "@/features/legal/components/CookieBanner";
import { getSiteSettings } from "@/features/site-settings/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    metadataBase: new URL('https://haloefekt.pl'),
    title: {
      template: '%s | Halo Efekt',
      default: 'Halo Efekt — Automatyzacja procesów biznesowych',
    },
    description:
      'Inteligentne ankiety, kwalifikacja AI i automatyczne rezerwacje dla polskich firm usługowych',
    keywords: settings?.default_keywords ?? undefined,
    verification: {
      google: settings?.google_site_verification ?? undefined,
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings()

  const organizationJsonLd = {
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

  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <PlausibleProvider
          domain="haloefekt.pl"
          customDomain="https://analytics.trustcode.pl"
          selfHosted
          trackOutboundLinks
          trackFileDownloads
          taggedEvents
          enabled
        >
          {children}
        </PlausibleProvider>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
