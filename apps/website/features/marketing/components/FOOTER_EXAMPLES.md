/**
 * Footer Component - Integration Examples
 *
 * This file shows various ways to integrate the Footer component
 * into your pages and layouts.
 *
 * NOTE: These are example files. Copy code snippets to your actual
 * pages/layouts as needed.
 */

// ============================================================================
// Example 1: Using Footer in Marketing Layout
// ============================================================================
// Location: apps/website/app/(marketing)/layout.tsx
/*
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/features/marketing/components/Footer'

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 2: Using Footer in Individual Page
// ============================================================================
// Location: apps/website/app/(marketing)/page.tsx
/*
import { Hero } from '@/features/marketing/components/Hero'
import { Features } from '@/features/marketing/components/Features'
import { Pricing } from '@/features/marketing/components/Pricing'
import { HowItWorks } from '@/features/marketing/components/HowItWorks'
import { Testimonials } from '@/features/marketing/components/Testimonials'
import { Benefits } from '@/features/marketing/components/Benefits'
import { Footer } from '@/features/marketing/components/Footer'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <Pricing />
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 3: Customizing Footer Links
// ============================================================================
// If you want to customize the Footer, create a wrapper component:
/*
'use client'

import { Footer } from '@/features/marketing/components/Footer'

export function CustomizedFooter() {
  // You can wrap and extend Footer here if needed
  return <Footer />
}
*/

// ============================================================================
// Example 4: Footer with Custom Styling
// ============================================================================
// If you want to override footer styling with a wrapper:
/*
import { Footer } from '@/features/marketing/components/Footer'

export function ThemedFooter() {
  return (
    <div className="custom-footer-theme">
      <Footer />
    </div>
  )
}
*/

// ============================================================================
// Example 5: Using Footer in Pricing Page
// ============================================================================
// Location: apps/website/app/(marketing)/pricing/page.tsx
/*
import { Navbar } from '@/components/layout/Navbar'
import { PricingHero } from '@/features/marketing/components/PricingHero'
import { PricingCards } from '@/features/marketing/components/PricingCards'
import { PricingFAQ } from '@/features/marketing/components/PricingFAQ'
import { Footer } from '@/features/marketing/components/Footer'

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <PricingHero />
        <PricingCards />
        <PricingFAQ />
      </main>
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 6: Using Footer in About Page
// ============================================================================
// Location: apps/website/app/(marketing)/o-nas/page.tsx
/*
import { Navbar } from '@/components/layout/Navbar'
import { AboutHero } from '@/features/marketing/components/AboutHero'
import { Team } from '@/features/marketing/components/Team'
import { Mission } from '@/features/marketing/components/Mission'
import { Footer } from '@/features/marketing/components/Footer'

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <AboutHero />
        <Mission />
        <Team />
      </main>
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 7: Using Footer in Contact Page
// ============================================================================
// Location: apps/website/app/(marketing)/kontakt/page.tsx
/*
import { Navbar } from '@/components/layout/Navbar'
import { ContactForm } from '@/features/marketing/components/ContactForm'
import { ContactInfo } from '@/features/marketing/components/ContactInfo'
import { Footer } from '@/features/marketing/components/Footer'

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <ContactForm />
        <ContactInfo />
      </main>
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 8: Complete App Layout Structure
// ============================================================================
// This shows the ideal structure with Navbar and Footer
/*
export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body>
        {/* This is the main app structure */}
        {children}
        {/* Footer is typically included in sub-layouts */}
      </body>
    </html>
  )
}

// Then in (marketing)/layout.tsx:
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/features/marketing/components/Footer'

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 9: Using Footer with Sidebar Layout
// ============================================================================
// If you have a layout with sidebar (for different page structure):
/*
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Footer } from '@/features/marketing/components/Footer'

export default function DocumentationLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </>
  )
}
*/

// ============================================================================
// Example 10: Testing Footer Component
// ============================================================================
/*
import { render, screen } from '@testing-library/react'
import { Footer } from '@/features/marketing/components/Footer'

describe('Footer Component', () => {
  it('renders all sections', () => {
    render(<Footer />)

    // Check all column titles are rendered
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
  })

  it('renders copyright notice', () => {
    render(<Footer />)
    expect(screen.getByText('© 2025 Legal Hub. All rights reserved.')).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Footer />)
    const socialLinks = screen.getAllByRole('link')
    expect(socialLinks.length).toBeGreaterThan(0)
  })

  it('renders newsletter form', () => {
    render(<Footer />)
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
  })
})
*/

// ============================================================================
// Integration Checklist
// ============================================================================
/*
Before using the Footer component:

✓ 1. Ensure Footer.tsx is at: apps/website/features/marketing/components/Footer.tsx
✓ 2. Import Footer in your layout or page
✓ 3. Add <Footer /> at the end of your layout/page
✓ 4. Test responsive design on mobile/tablet/desktop
✓ 5. Verify all links point to correct URLs
✓ 6. Test newsletter form with valid/invalid emails
✓ 7. Check colors match your theme
✓ 8. Verify accessibility with screen reader
✓ 9. Test keyboard navigation
✓ 10. Build and test for production

After integration:

✓ 1. Customize FOOTER_LINKS object with your actual URLs
✓ 2. Update SOCIAL_LINKS with your real social media URLs
✓ 3. Update company name and tagline if needed
✓ 4. Implement newsletter API endpoint (currently has TODO)
✓ 5. Test form submission end-to-end
✓ 6. Add analytics tracking if needed
✓ 7. Deploy and test on production
*/

export {}
