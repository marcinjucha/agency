# Footer Component Guide

## Overview

The `Footer.tsx` component is a professional, responsive footer for the Legal Hub landing page with dark styling, organized link sections, newsletter signup, and social media integration.

## Features

- **Multi-column layout** with organized links:
  - Product (Features, Pricing, Security, FAQ)
  - Company (O nas, Blog, Press, Kontakt)
  - Legal (Warunki korzystania, Polityka prywatności, GDPR, Cookies)
  - Resources (Documentation, API, Support, Community)

- **Branding section** at top with:
  - Logo/brand name (Legal Hub)
  - Company tagline (1-2 sentences)
  - Social media links (GitHub, Twitter, LinkedIn, Facebook)

- **Newsletter signup** with:
  - Email input field
  - Subscribe button
  - Validation (email format check)
  - Success/error feedback

- **Dark styling**:
  - Background: `bg-slate-900` (dark slate)
  - Text: `text-gray-300` (light)
  - Links: `text-gray-400` with `hover:text-white` transitions
  - Copyright section: `bg-slate-950` (darker)

- **Responsive design**:
  - Mobile: 2-column link grid (stacked newsletter)
  - Tablet: 2-column layout for brand + newsletter
  - Desktop: 4-column link grid with proper spacing

- **Interactive elements**:
  - Link hover effects with smooth transitions
  - Chevron icon appears on link hover
  - Newsletter form validation and feedback
  - Social media links with proper accessibility

- **Accessibility**:
  - Semantic HTML structure
  - Proper heading hierarchy (h2, h3)
  - ARIA labels on social links
  - Skip-friendly structure
  - Keyboard navigable
  - Screen reader optimized

## File Location

```
apps/website/features/marketing/components/Footer.tsx
```

## Installation & Usage

### 1. Import in Layout

Add the Footer to your marketing layout or pages:

```typescript
// apps/website/app/(marketing)/layout.tsx
import { Footer } from '@/features/marketing/components/Footer'

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav>{/* Navbar */}</nav>
      <main>{children}</main>
      <Footer />
    </>
  )
}
```

### 2. Use in Pages

If you prefer to include Footer in individual pages:

```typescript
// apps/website/app/(marketing)/page.tsx
import { Footer } from '@/features/marketing/components/Footer'
import { Hero } from '@/features/marketing/components/Hero'

export default function HomePage() {
  return (
    <>
      <Hero />
      <section>{/* Other sections */}</section>
      <Footer />
    </>
  )
}
```

### 3. Customize Links

Edit the `FOOTER_LINKS` object in `Footer.tsx` to customize link text and URLs:

```typescript
const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '/pricing' },
    // Add more links...
  ],
  // ...
}
```

### 4. Customize Social Media

Edit the `SOCIAL_LINKS` array to add/remove social platforms:

```typescript
const SOCIAL_LINKS = [
  {
    icon: Github,
    href: 'https://github.com/yourusername',
    label: 'GitHub',
    ariaLabel: 'Visit our GitHub'
  },
  // Add more social links...
]
```

### 5. Customize Branding

Update the brand name, tagline, and tagline text:

```typescript
// In Footer component <h2> tag
<h2 className="text-2xl font-bold text-white">Legal Hub</h2>

// Update tagline in <p> tag
<p className="text-gray-400 text-sm mt-2 leading-relaxed">
  Empower your law practice with AI-driven client qualification...
</p>
```

## Component Structure

### Main Components

1. **Footer** - Main container
   - Dark background (slate-900)
   - Max width (7xl)
   - Responsive padding
   - Two-section layout (content + copyright)

2. **NewsletterForm** - Email subscription
   - Email validation
   - Success/error states
   - Submit button with icon
   - Client-side form handling

3. **FooterColumn** - Reusable link column
   - Title heading (h3)
   - Link list with hover effects
   - Chevron icon animation

4. **SocialLinks** - Social media icons
   - Icon buttons
   - Accessible link structure
   - Hover animations

## Styling Details

### Colors

- **Background**: `bg-slate-900` (main), `bg-slate-950` (copyright)
- **Text**: `text-gray-300` (default), `text-white` (headings)
- **Links**: `text-gray-400` (default), `hover:text-white`
- **Accents**: `text-gray-500` (secondary), `text-gray-600` (dividers)
- **Buttons**: `bg-blue-600` (primary), `hover:bg-blue-700`
- **Validation**: `text-red-400` (error), `text-green-400` (success)

### Responsive Breakpoints

**Mobile (< 768px)**
- Links grid: 2 columns
- Newsletter stacked below brand
- Full-width layout
- Centered copyright text

**Tablet (768px - 1024px)**
- Brand + Newsletter: 2 columns
- Links grid: Still organized
- Improved spacing

**Desktop (> 1024px)**
- Brand section: Full-width top
- Links grid: 4 columns
- Newsletter: Beside brand
- Optimal spacing and alignment

### Spacing

- Main section padding: `py-12 md:py-16` (vertical), `px-4 sm:px-6 lg:px-8` (horizontal)
- Column gaps: `gap-8` (between sections)
- Link spacing: `space-y-3` (vertical list)
- Social icons: `gap-4` (horizontal spacing)

## Interactive Elements

### Link Hover Effects

- Smooth color transition (200ms)
- Chevron icon slides in from opacity
- Text color: gray-400 → white

```typescript
className="text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-1 group"
// Chevron appears on hover:
className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
```

### Newsletter Form

**States:**
1. **Default** - Empty email input, ready to type
2. **Submitting** - Button disabled, loading state
3. **Success** - Confirmation message, auto-reset after 3s
4. **Error** - Error message displayed, user can retry

**Validation:**
- Email required
- Must match email regex pattern
- Error messages displayed below input

## Accessibility

### ARIA Labels

- Social media links have `aria-label` for screen readers
- Newsletter input has `aria-label`
- All interactive elements are labeled

### Semantic HTML

- Footer wrapper (semantic `<footer>` tag)
- Proper heading hierarchy (h2 > h3)
- Link semantics (`<a>` tags with href)
- Form semantics (`<form>`, `<input>`, `<button>`)

### Keyboard Navigation

- Tab through all interactive elements
- Enter to submit form or follow links
- Proper focus management
- No keyboard traps

### Screen Reader Optimization

- "sr-only" class hides duplicate text for screen readers
- Icon labels in social links
- Skip-friendly structure
- Descriptive aria-labels

## Customization Examples

### Change Footer Colors

```typescript
// In Footer component, update className:
<footer className="bg-gradient-to-b from-slate-900 to-slate-950">
  {/* Content */}
</footer>
```

### Add More Sections

```typescript
const FOOTER_LINKS = {
  product: [...],
  company: [...],
  legal: [...],
  resources: [...],
  solutions: [  // New section
    { label: 'For Lawyers', href: '#lawyers' },
    { label: 'For Firms', href: '#firms' },
  ]
}

// Then add in component:
<FooterColumn title="Solutions" links={FOOTER_LINKS.solutions} />
```

### Customize Newsletter Button

```typescript
// In NewsletterForm component:
<Button
  type="submit"
  disabled={isSubscribed}
  size="sm"
  className="bg-green-600 hover:bg-green-700 text-white"
>
  {/* Content */}
</Button>
```

## Dependencies

- **React** - Component framework (useState, FormEvent)
- **Next.js** - Link component
- **@agency/ui** - Button and Input components from shadcn/ui
- **lucide-react** - Icons (Github, Twitter, Linkedin, Facebook, Mail, ChevronRight)

## TypeScript Types

The component is fully typed with:
- `FooterColumn` props: title (string), links (array of objects)
- `NewsletterForm` state: email (string), isSubscribed (boolean), error (string | null)
- Form event handlers with proper typing

## Performance

- Static link data (no fetching)
- Newsletter form uses client-side validation only
- Minimal re-renders
- No external API calls in the form (TODO comment for future integration)

## Future Enhancements

1. **Newsletter API Integration**
   - Currently has TODO comment
   - Connect to email service (Mailchimp, SendGrid, etc.)
   - Add backend validation

2. **Dynamic Links**
   - Load from CMS or API
   - Support for featured links
   - Link analytics

3. **Localization**
   - Polish translations for labels
   - Multi-language support

4. **Analytics**
   - Track link clicks
   - Newsletter signup tracking
   - Social media click tracking

## Testing

### Manual Testing Checklist

- [ ] Test on mobile (< 768px)
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on desktop (> 1024px)
- [ ] Click all links (verify navigation)
- [ ] Test newsletter form with valid email
- [ ] Test newsletter form with invalid email
- [ ] Test newsletter form with empty input
- [ ] Click all social media links
- [ ] Test keyboard navigation (Tab through footer)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify all text is readable (contrast)
- [ ] Verify hover states are visible

### Automated Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Footer } from './Footer'

describe('Footer', () => {
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
  })

  it('validates newsletter email', async () => {
    const user = userEvent.setup()
    render(<Footer />)

    const input = screen.getByPlaceholderText('your@email.com')
    const button = screen.getByRole('button', { name: /mail/i })

    // Test invalid email
    await user.type(input, 'invalid')
    await user.click(button)
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
  })

  it('renders copyright notice', () => {
    render(<Footer />)
    expect(screen.getByText('© 2025 Legal Hub. All rights reserved.')).toBeInTheDocument()
  })
})
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- CSS transitions support required
- No IE11 support

## Troubleshooting

### Links Not Showing

Ensure links have proper `href` attribute and `<Link>` component from Next.js is imported.

### Newsletter Form Not Working

1. Check that Input and Button components are imported from `@agency/ui`
2. Verify email regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
3. Check console for any errors

### Styling Issues

1. Ensure Tailwind CSS is configured
2. Verify dark mode is enabled in tailwind.config.ts
3. Check that shadcn/ui components are available

### Responsive Layout Not Working

Ensure responsive Tailwind classes are working:
- `md:grid-cols-2` (tablet)
- `md:py-16` (tablet)
- `md:flex-row` (desktop)

## License

Part of Legal Hub project. All rights reserved 2025.

## Questions?

Refer to:
- `@docs/CODE_PATTERNS.md` - Component patterns
- `packages/ui/src/components/` - Available shadcn/ui components
- `ARCHITECTURE.md` - Project architecture
