import type { Metadata } from "next";
import PlausibleProvider from "next-plausible";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CookieBanner } from "@/features/legal/components/CookieBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Halo Efekt - Automatyzacja przyjmowania klientów",
  description: "Inteligentne ankiety, kwalifikacja AI i automatyczne rezerwacje dla polskich firm usługowych",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
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
