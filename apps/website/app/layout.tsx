import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Halo Efekt - Automatyzacja Client Intake",
  description: "Smart surveys, AI qualification, i instant booking dla polskich kancelarii",
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
        {children}
        <Analytics />
        <Script
          defer
          data-domain="haloefekt.pl"
          src="https://analytics.trustcode.pl/js/script.outbound-links.file-downloads.404s.tagged-events.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
