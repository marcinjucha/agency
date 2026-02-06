# Marketing Components

This directory contains reusable UI components for the Legal Hub marketing website.

## Components Overview

### Hero.tsx
Main landing page hero section with compelling headline, subheading, and CTA buttons.

**Features:**
- Large headline: "Zautomatyzuj przyjmowanie klientów" (Automate client intake)
- Subheading: "Oszczędzaj czas, zyskuj więcej klientów" (Save time, gain more clients)
- Description paragraph highlighting key benefits
- Two CTA buttons:
  - Primary: "Zarezerwuj demo" (Book a demo) - filled blue
  - Secondary: "Dowiedz się więcej" (Learn more) - outlined
- Metrics row: 3 stats (500+ surveys, 10k+ responses, 95% conversion rate)
- Trust badges highlighting security and flexibility
- Responsive 2-column layout (text left, graphic right on desktop)
- Hero graphic with animated SVG elements
- Gradient background with subtle decorative shapes
- Fade-in and slide-in animations on load

**Responsive Design:**
- Mobile: Single column, stacked buttons
- Tablet: 2 columns with adjusted spacing
- Desktop: Generous spacing, 60/40 text-to-graphic ratio

**Example:**
```tsx
import { Hero } from '@/features/marketing/components/Hero'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Benefits />
    </>
  )
}
```

**Props:**
None - Hero is a self-contained component with hard-coded Polish content

**Customization:**
To modify content, edit the following in Hero.tsx:
- `headline` - Main headline text
- `subheading` - Problem statement
- `description` - Benefit paragraph
- `metrics` - Statistics displayed below buttons
- Button links: `/demo` and `#features`
- Trust badges list

**Animation Details:**
- Fade-in + slide-in on load (700ms duration)
- Staggered right column animation (100ms delay)
- Background shapes use blur and opacity for depth
- SVG animations: bounce (3s) and pulse (2s)
- Floating label with bounce animation

**Colors:**
- Gradient background: blue-50 to white to blue-50
- Text: gray-900 (dark), gray-700 (medium), gray-600 (light)
- Accents: blue-600 (primary), green-500 (trust badges)
- Buttons: blue-600 fill, blue-600 outline

---

### HeroGraphic.tsx
SVG illustration component for the hero section right column.

**Features:**
- Animated SVG with gradient fills
- Document/form with checkmark icon
- Calendar element with grid pattern
- Automation arrow with dashed stroke
- Floating label "Automatyzacja 24/7"
- Bounce and pulse animations

**Current State:**
Placeholder illustration - ready to be replaced with:
- Professional illustration
- Photography
- Custom branded graphic

**Animation Timings:**
- Document bounce: 3 seconds
- Calendar pulse: 2 seconds
- Arrow pulse: 2.5 seconds
- Label bounce: 0.5s delay

---

### StepCard.tsx
Reusable card component for displaying individual workflow steps.

**Props:**
- `step: { id, title, description }` - Step data
- `stepNumber: number` - Display number in badge (1-6)
- `icon: IconName` - Icon name for visual representation

**Example:**
```tsx
<StepCard
  step={{
    id: 'step-1',
    title: 'Create Form',
    description: 'Build custom intake forms...'
  }}
  stepNumber={1}
  icon="document"
/>
```

**Features:**
- Numbered circle badge
- Icon with background
- Title and description
- Hover shadow effect
- Responsive sizing

---

### HowItWorks.tsx
Complete section component showing the 6-step Legal Hub workflow.

**6-Step Workflow:**
1. Lawyer creates intake form
2. Generates shareable link
3. Client fills out form
4. AI qualifies the case
5. Client books appointment
6. Lawyer follows up with qualified lead

**Example:**
```tsx
import { HowItWorks } from '@/features/marketing/components/HowItWorks'

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Pricing />
    </>
  )
}
```

**Features:**
- Responsive: Vertical (mobile) → 2-col (tablet) → 6-col (desktop)
- SVG connecting arrows on desktop
- Connecting lines on mobile/tablet
- Section header with description
- Call-to-action button
- Gradient background

---

### Responsive Breakpoints

**Mobile (< 768px)**
- Vertical stack of StepCards
- Connecting vertical lines between cards
- Single column layout

**Tablet (768px - 1024px)**
- 2-column grid layout
- Connecting lines between rows
- Optimized spacing for medium screens

**Desktop (> 1024px)**
- 6-column grid layout
- SVG arrows showing flow direction
- Optimized spacing for wide screens

---

### Icon Names

All icons use lucide-react and are type-safe via `IconName` type:

```
'document'    → FileText icon
'clock'       → Clock icon
'users'       → Users icon
'zap'         → Zap icon
'shield'      → Shield icon
'target'      → Target icon
'check'       → CheckCircle icon
'chevron'     → ChevronRight icon
'star'        → Star icon
'heart'       → Heart icon
'scale'       → Scale icon
'briefcase'   → Briefcase icon
'hourglass'   → Clock icon
'messages'    → MessageSquare icon
```

---

### Styling

All components use:
- **Framework:** Tailwind CSS
- **Component Library:** shadcn/ui (@agency/ui)
- **Icons:** lucide-react
- **Colors:** Tailwind theme (primary, secondary, foreground, etc.)

---

### Accessibility

Both components follow accessibility best practices:
- Semantic HTML structure
- Proper heading hierarchy
- `aria-hidden` on decorative elements (SVG arrows)
- Color contrast compliance
- Keyboard navigable
- Screen reader friendly

---

### Related Components

- **BenefitCard.tsx** - Similar card component for benefits section
- **FeatureCard.tsx** - Card component for features section
- **PricingCard.tsx** - Card component for pricing tiers
- **ProblemCard.tsx** - Card component for problems section

---

### Type Definitions

See `../types.ts` for:
- `Step` interface
- `IconName` type
- Other marketing-related types

### FAQ.tsx
Interactive accordion component displaying frequently asked questions.

**Features:**
- One question open by default (first item)
- Smooth max-height transition animations
- ChevronDown icon rotates on expand
- Keyboard accessible: Tab to navigate, Enter/Space to toggle
- Hover effects for visual feedback
- Full width responsive design
- Semantic HTML with ARIA labels (`aria-expanded`, `aria-controls`)

**Example:**
```tsx
import { FAQ } from '@/features/marketing/components/FAQ'

export default function HomePage() {
  return <FAQ />
}
```

**Accordion Structure:**
- Section heading: "Pytania i odpowiedzi"
- 8 FAQ items from `../data/faqs.ts`
- Each item displays question and answer
- Blue highlight on expanded state
- Smooth animations on open/close

**State Management:**
- React `useState` for tracking expanded item
- Single item expanded at a time
- Click button or press Enter/Space to toggle

---

### Footer.tsx
Professional footer component for the Legal Hub landing page.

**Features:**
- Multiple columns with organized links:
  - Product (Features, Pricing, Security, FAQ)
  - Company (O nas, Blog, Press, Kontakt)
  - Legal (Warunki korzystania, Polityka prywatności, GDPR, Cookies)
  - Resources (Documentation, API, Support, Community)
- Logo/brand name with company description
- Social media links (GitHub, Twitter, LinkedIn, Facebook)
- Newsletter signup form with email validation
- Copyright notice at bottom
- Dark styling: `bg-slate-900` with light text
- Responsive design (mobile: 2-col, tablet: 2-col, desktop: 4-col)
- Link hover effects with chevron icon animation
- Divider line between main content and copyright

**Example:**
```tsx
import { Footer } from '@/features/marketing/components/Footer'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Footer />
    </>
  )
}
```

**Props:**
None - Footer is self-contained with hard-coded content

**Customization:**
- Edit `FOOTER_LINKS` object to change links and URLs
- Edit `SOCIAL_LINKS` array to update social media accounts
- Update company name, tagline, and description in component JSX
- Customize colors by modifying Tailwind classes

**Newsletter Features:**
- Email validation (must be valid email format)
- Success/error feedback messages
- Auto-reset form after successful subscription
- Client-side validation (TODO: Add backend API integration)

**Responsive Design:**
- Mobile (< 768px): 2-column link grid, stacked newsletter
- Tablet (768px - 1024px): 2-column brand+newsletter, organized links
- Desktop (> 1024px): 4-column link grid with proper spacing

**Colors:**
- Background: `bg-slate-900` (main), `bg-slate-950` (copyright)
- Text: `text-gray-300` (default), `text-white` (headings)
- Links: `text-gray-400` hover `text-white` with transitions
- Accents: `text-gray-500` (secondary), `text-blue-600` (button)

**Accessibility:**
- Semantic HTML (`<footer>`, `<nav>`, `<form>`)
- Proper heading hierarchy (h2, h3)
- ARIA labels on social media links
- Keyboard navigable (Tab, Enter)
- Screen reader optimized

**See Also:**
- [FOOTER_GUIDE.md](./FOOTER_GUIDE.md) - Detailed customization guide
- [FOOTER_EXAMPLES.tsx](./FOOTER_EXAMPLES.tsx) - Integration examples

---

### Data Files

See `../data/` for:
- `benefits.ts` - Benefits section data
- `features.ts` - Features section data
- `problems.ts` - Problems section data
- `testimonials.ts` - Testimonials section data
- `faqs.ts` - FAQ section data

---

### Integration Examples

**Simple Integration**
```tsx
import { HowItWorks } from '@/features/marketing/components/HowItWorks'

export default function HomePage() {
  return <HowItWorks />
}
```

**With Other Sections**
```tsx
import { HowItWorks } from '@/features/marketing/components/HowItWorks'
import { Benefits } from '@/features/marketing/components/Benefits'
import { Features } from '@/features/marketing/components/Features'

export default function HomePage() {
  return (
    <>
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="benefits">
        <Benefits />
      </section>
      <section id="features">
        <Features />
      </section>
    </>
  )
}
```

**Customizing Steps (Future)**
```tsx
// To customize the 6 steps, edit WORKFLOW_STEPS in HowItWorks.tsx
// Or create apps/website/features/marketing/data/steps.ts
```

---

### Performance

Both components:
- Use static data (no data fetching)
- Have minimal re-renders
- Use conditional rendering for responsive design
- SVG arrows render only on desktop
- No unnecessary computations

---

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support
- CSS variables support
- SVG support
- No IE11 support (uses modern CSS features)

---

### Testing

Components can be tested using React Testing Library:

```tsx
import { render, screen } from '@testing-library/react'
import { HowItWorks } from './HowItWorks'

describe('HowItWorks', () => {
  it('renders all 6 steps', () => {
    render(<HowItWorks />)
    // Add assertions for your tests
  })
})
```

---

### Contributing

When adding new components:
1. Use `'use client'` directive if using React hooks
2. Import types from `../types`
3. Use Tailwind CSS for styling
4. Use shadcn/ui components from `@agency/ui`
5. Add JSDoc comments for documentation
6. Follow existing naming conventions
7. Test on mobile, tablet, and desktop
8. Ensure accessibility compliance

---

### Related Documentation

- [Component Types](../types.ts)
- [Code Patterns](../../../CLAUDE.md)
- [Project Architecture](../../../docs/ARCHITECTURE.md)
