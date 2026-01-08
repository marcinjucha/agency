# Footer Component - Code Snippets Reference

## Quick Implementation

### Import Footer
```typescript
import { Footer } from '@/features/marketing/components/Footer'
```

### Add to Marketing Layout
```typescript
// apps/website/app/(marketing)/layout.tsx
'use client'

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
```

### Add to Individual Page
```typescript
// apps/website/app/(marketing)/pricing/page.tsx
import { Footer } from '@/features/marketing/components/Footer'
import { PricingSection } from '@/features/marketing/components/Pricing'

export default function PricingPage() {
  return (
    <>
      <PricingSection />
      <Footer />
    </>
  )
}
```

## Customization Snippets

### Change Link URLs
```typescript
// In Footer.tsx - Edit FOOTER_LINKS object

const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '/features' },          // Change this
    { label: 'Pricing', href: '/pricing' },            // Change this
    { label: 'Security', href: '/security' },          // Change this
    { label: 'FAQ', href: '/faq' }                     // Change this
  ],
  company: [
    { label: 'O nas', href: '/about' },               // Change this
    { label: 'Blog', href: '/blog' },                 // Change this
    { label: 'Press', href: '/press' },               // Change this
    { label: 'Kontakt', href: '/contact' }            // Change this
  ],
  legal: [
    { label: 'Warunki korzystania', href: '/terms' },
    { label: 'Polityka prywatności', href: '/privacy' },
    { label: 'GDPR', href: '/gdpr' },
    { label: 'Cookies', href: '/cookies' }
  ],
  resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API', href: '/api-docs' },
    { label: 'Support', href: '/support' },
    { label: 'Community', href: '/community' }
  ]
}
```

### Update Social Media
```typescript
// In Footer.tsx - Edit SOCIAL_LINKS array

const SOCIAL_LINKS = [
  {
    icon: Github,
    href: 'https://github.com/yourusername',          // Change this
    label: 'GitHub',
    ariaLabel: 'Visit our GitHub'
  },
  {
    icon: Twitter,
    href: 'https://twitter.com/yourhandle',           // Change this
    label: 'Twitter',
    ariaLabel: 'Visit our Twitter'
  },
  {
    icon: Linkedin,
    href: 'https://linkedin.com/company/yourcompany', // Change this
    label: 'LinkedIn',
    ariaLabel: 'Visit our LinkedIn'
  },
  {
    icon: Facebook,
    href: 'https://facebook.com/yourpage',            // Change this
    label: 'Facebook',
    ariaLabel: 'Visit our Facebook'
  }
]
```

### Change Company Name
```typescript
// In Footer.tsx - Update the branding section

<div>
  <div className="mb-4">
    <h2 className="text-2xl font-bold text-white">Your Company Name</h2>  {/* Change this */}
    <p className="text-gray-400 text-sm mt-2 leading-relaxed">
      Your company description here. Highlight key benefits and mission.    {/* Change this */}
    </p>
  </div>
  {/* ... rest of component ... */}
</div>
```

### Change Colors
```typescript
// Option 1: Change background color

<footer className="bg-gradient-to-b from-slate-900 to-slate-950">
  {/* ... */}
</footer>

// Option 2: Change text colors

<h3 className="text-blue-300 font-semibold text-sm mb-4">Product</h3>

// Option 3: Change link hover color

<Link
  href={link.href}
  className="text-gray-400 hover:text-blue-300 transition-colors duration-200"
>
  {link.label}
</Link>

// Option 4: Change button color

<Button className="bg-green-600 hover:bg-green-700 text-white">
  Subscribe
</Button>
```

### Customize Newsletter Button
```typescript
// In NewsletterForm component - Change button appearance

<Button
  type="submit"
  disabled={isSubscribed}
  size="sm"
  className="bg-purple-600 hover:bg-purple-700 text-white"  {/* Change colors */}
>
  {isSubscribed ? (
    <span className="flex items-center gap-1">
      <span>✓</span>
    </span>
  ) : (
    <Mail className="w-4 h-4" />
  )}
</Button>
```

## Advanced Customization

### Add Newsletter API Integration
```typescript
// Replace the handleSubmit in NewsletterForm component

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setError(null)

  if (!email) {
    setError('Please enter your email')
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError('Please enter a valid email')
    return
  }

  try {
    setIsSubscribed(true)  // Show loading state

    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    if (response.ok) {
      setEmail('')
      setTimeout(() => setIsSubscribed(false), 3000)
    } else {
      const data = await response.json()
      setError(data.message || 'Failed to subscribe')
      setIsSubscribed(false)
    }
  } catch (err) {
    setError('Failed to subscribe. Please try again.')
    setIsSubscribed(false)
  }
}
```

### Add Extra Link Section
```typescript
// In Footer.tsx - Add to FOOTER_LINKS

const FOOTER_LINKS = {
  product: [...],
  company: [...],
  legal: [...],
  resources: [...],
  solutions: [  // New section
    { label: 'For Lawyers', href: '/solutions/lawyers' },
    { label: 'For Law Firms', href: '/solutions/firms' },
    { label: 'Enterprise', href: '/solutions/enterprise' },
    { label: 'Pricing Comparison', href: '/solutions/pricing' }
  ]
}

// Then add to component JSX:
<FooterColumn title="Solutions" links={FOOTER_LINKS.solutions} />
```

### Custom Copyright Section
```typescript
// Replace the copyright section in Footer

<div className="bg-slate-950">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-gray-500 text-sm text-center sm:text-left">
        © 2025 Legal Hub. All rights reserved.
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> | </span>
        Made with ❤️ in Poland
      </p>

      {/* Links */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <a href="#sitemap" className="hover:text-gray-300">Sitemap</a>
        <span>•</span>
        <a href="#status" className="hover:text-gray-300">Status</a>
        <span>•</span>
        <a href="/contact" className="hover:text-gray-300">Contact</a>
      </div>
    </div>
  </div>
</div>
```

## Testing Snippets

### Manual Testing Checklist
```typescript
// Test all these scenarios:

// 1. Test responsive layouts
const testBreakpoints = [375, 768, 1024, 1440]  // Mobile, tablet, desktop, large

// 2. Test all links
const testLinks = [
  { text: 'Features', expectedRoute: '#features' },
  { text: 'Pricing', expectedRoute: '/pricing' },
  { text: 'O nas', expectedRoute: '/o-nas' },
  { text: 'Kontakt', expectedRoute: '/kontakt' },
  // ... test all links
]

// 3. Test newsletter form
const testNewsletter = [
  { input: '', expected: 'Please enter your email' },
  { input: 'invalid', expected: 'Please enter a valid email' },
  { input: 'valid@email.com', expected: 'success' },
]

// 4. Test keyboard navigation
const testKeyboard = [
  'Tab through all links',
  'Tab through social icons',
  'Tab to newsletter input',
  'Tab to subscribe button',
  'Press Enter to submit form',
]

// 5. Test accessibility
const testA11y = [
  'Screen reader reads all links',
  'Aria-labels present on social icons',
  'Heading hierarchy correct (h2 > h3)',
  'Color contrast sufficient (7:1)',
  'Focus indicators visible',
]
```

### Automated Testing Template
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Footer } from './Footer'

describe('Footer Component', () => {
  it('renders all link sections', () => {
    render(<Footer />)

    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
  })

  it('renders social media links', () => {
    render(<Footer />)

    expect(screen.getByLabelText('Visit our GitHub')).toBeInTheDocument()
    expect(screen.getByLabelText('Visit our Twitter')).toBeInTheDocument()
    expect(screen.getByLabelText('Visit our LinkedIn')).toBeInTheDocument()
    expect(screen.getByLabelText('Visit our Facebook')).toBeInTheDocument()
  })

  it('validates email in newsletter form', async () => {
    const user = userEvent.setup()
    render(<Footer />)

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const submitButton = screen.getByRole('button', { name: /mail/i })

    // Test empty email
    await user.click(submitButton)
    expect(screen.getByText('Please enter your email')).toBeInTheDocument()

    // Test invalid email
    await user.type(emailInput, 'invalid')
    await user.click(submitButton)
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()

    // Test valid email
    await user.clear(emailInput)
    await user.type(emailInput, 'valid@example.com')
    await user.click(submitButton)
    // Should show success state
  })

  it('renders copyright notice', () => {
    render(<Footer />)

    expect(
      screen.getByText('© 2025 Legal Hub. All rights reserved.')
    ).toBeInTheDocument()
  })

  it('renders newsletter heading', () => {
    render(<Footer />)

    expect(screen.getByText('Stay Updated')).toBeInTheDocument()
  })

  it('renders brand name and description', () => {
    render(<Footer />)

    expect(screen.getByText('Legal Hub')).toBeInTheDocument()
    expect(
      screen.getByText(/Empower your law practice/)
    ).toBeInTheDocument()
  })
})
```

## Styling Reference

### Color Palette
```css
/* Background Colors */
background-primary: bg-slate-900     /* Main footer */
background-secondary: bg-slate-950   /* Copyright section */

/* Text Colors */
text-primary: text-gray-300          /* Default text */
text-headings: text-white            /* Column titles */
text-secondary: text-gray-500        /* Meta text */

/* Link Colors */
link-default: text-gray-400
link-hover: text-white

/* Button Colors */
button-primary: bg-blue-600
button-hover: bg-blue-700

/* Alert Colors */
error: text-red-400
success: text-green-400
```

### Spacing System
```css
/* Container */
padding-x: px-4 sm:px-6 lg:px-8
padding-y: py-12 md:py-16

/* Sections */
column-gap: gap-8
content-gap: gap-8

/* Lists */
link-spacing: space-y-3
social-gap: gap-4

/* Dividers */
border-color: border-slate-800
```

### Responsive Grid
```css
/* Link Grid */
mobile: grid-cols-2            /* < 768px */
tablet: md:grid-cols-4         /* 768px - 1024px */
desktop: lg:grid-cols-4        /* > 1024px */

/* Brand + Newsletter */
mobile: grid-cols-1            /* < 768px */
tablet: md:grid-cols-2         /* 768px - 1024px */
desktop: lg:grid-cols-2        /* > 1024px */

/* Container */
max-width: max-w-7xl           /* All breakpoints */
```

## Integration Examples

### With Next.js App Router
```typescript
// apps/website/app/(marketing)/layout.tsx
import { Footer } from '@/features/marketing/components/Footer'

export default function MarketingLayout({ children }) {
  return (
    <>
      <header>{/* Navbar */}</header>
      <main>{children}</main>
      <Footer />
    </>
  )
}
```

### With Navbar
```typescript
// apps/website/components/layout/Navbar.tsx
import { Footer } from '@/features/marketing/components/Footer'

export function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

### With Sidebar Layout
```typescript
// apps/website/app/(docs)/layout.tsx
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/features/marketing/components/Footer'

export default function DocsLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
```

## Performance Optimization

### Lazy Load Footer (Optional)
```typescript
import dynamic from 'next/dynamic'

const Footer = dynamic(() => import('@/features/marketing/components/Footer'), {
  loading: () => <div className="h-20 bg-slate-900" />,  // Placeholder
  ssr: false  // Only load on client
})
```

### Memoize Subcomponents (If Needed)
```typescript
import { memo } from 'react'

const FooterColumn = memo(function FooterColumn({ title, links }) {
  // Component code
})

const SocialLinks = memo(function SocialLinks() {
  // Component code
})
```

## Accessibility Enhancements

### Add Skip Link
```typescript
<div className="sr-only">
  <a href="#main-content">Skip to main content</a>
</div>
<footer>
  {/* Footer content */}
</footer>
<main id="main-content">
  {/* Page content */}
</main>
```

### Add Focus Indicators
```typescript
<Link
  href={link.href}
  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
>
  {link.label}
</Link>
```

---

**All snippets are ready to copy-paste!**
Use these as templates for customization.
