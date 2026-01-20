# Design System

**Purpose:** Single source of truth for UI/UX patterns in Legal-Mind

**⚠️ IMPORTANT:** Keep this document updated when making design changes:
- Adding new shadcn/ui components → update "Available Components" section
- Changing spacing/typography patterns → update respective sections
- Adding new status colors → update "Status Colors" section
- Modifying component patterns → update "Component Patterns" section

---

## shadcn/ui Components

**Location:** `@legal-mind/ui` (`packages/ui/`)

**Available Components:**
- Button, Card, Badge, Input, Label
- Dialog, Select, Textarea, Checkbox, Skeleton
- Form (React Hook Form integration)
- Toast (notifications)

**Installation Command:**
```bash
cd packages/ui && npx shadcn@latest add [component-name]
```

**Always use shadcn/ui components instead of custom HTML elements.**

---

## Spacing Scale (Tailwind)

**Standard Increments:** 2, 4, 6, 8, 12, 16, 24, 32

```typescript
// Card padding
p-6           // 24px

// Section spacing
space-y-6     // 24px between elements
space-y-4     // 16px between form fields

// Gaps
gap-2         // 8px (small)
gap-4         // 16px (medium)
gap-6         // 24px (large)

// Margins
mt-2, mb-4, mx-6, my-8
```

---

## Typography Scale

```typescript
// Page titles
text-3xl font-bold

// Section headings
text-xl font-semibold

// Card headings
text-lg font-semibold

// Body text
text-base (default)

// Small text
text-sm text-muted-foreground
```

---

## Color Palette

**Text Colors:**
- Primary text: `text-foreground` (default)
- Secondary text: `text-muted-foreground`
- Links: `text-primary`

**Status Colors (Badge Variants):**
```typescript
// Centralized utility: apps/cms/lib/utils/status.ts
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'default'      // Blue
    case 'completed': return 'secondary' // Green
    case 'pending': return 'outline'     // Gray
    case 'cancelled': return 'destructive' // Red
    default: return 'outline'
  }
}

// Usage
<Badge variant={getStatusColor(status)}>{status}</Badge>
```

**Background Colors:**
- Cards: `bg-card`
- Page background: `bg-background`
- Muted sections: `bg-muted`

---

## Accessibility (WCAG 2.1 AA)

**Minimum Standards:**
- Text contrast ratio: 4.5:1 minimum
- Interactive elements: 44x44px touch target
- Icon-only buttons: `aria-label` required
- Live regions: `aria-live="polite"` for updates

**Semantic HTML:**
```typescript
// Tables
<table aria-label="Descriptive label">
  <thead>
    <tr>
      <th scope="col">Column Name</th>
    </tr>
  </thead>
  <tbody>...</tbody>
</table>

// Buttons
<Button aria-label="Delete question" variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>

// Live regions
<div className="sr-only" aria-live="polite">
  {appointments?.length} appointments loaded
</div>
```

**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Skip-to-content link on admin pages
- Dialog components must trap focus and support ESC key

---

## Responsive Breakpoints (Mobile-First)

```typescript
// Tailwind breakpoints
sm:  640px+   // Tablet
md:  768px+   // Tablet landscape
lg:  1024px+  // Desktop
xl:  1280px+  // Large desktop

// Example
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  // Mobile: 1 column
  // Tablet: 2 columns
  // Desktop: 3 columns
</div>
```

---

## Component Patterns

### Shared State Components
**Location:** `apps/cms/components/shared/`

These components standardize loading, error, and empty states across the CMS.

#### LoadingState
**4 variants:** `spinner`, `skeleton-table`, `skeleton-list`, `skeleton-card`

```typescript
import { LoadingState } from '@/components/shared'

// Spinner (centered, with optional message)
<LoadingState variant="spinner" message="Loading surveys..." />

// Skeleton table (5 rows by default)
<Card className="p-6">
  <LoadingState variant="skeleton-table" rows={5} />
</Card>

// Skeleton list (text lines)
<LoadingState variant="skeleton-list" rows={3} />

// Skeleton card (multiple elements)
<LoadingState variant="skeleton-card" rows={2} />
```

**Theme tokens:**
- Spinner: `border-primary`, `text-muted-foreground`
- Skeleton: `bg-muted` (via Skeleton component)

#### ErrorState
**2 variants:** `card`, `inline`

```typescript
import { ErrorState } from '@/components/shared'

// Card variant (default, with padding)
<ErrorState
  title="Failed to load appointments"
  message={error.message}
  onRetry={() => refetch()}
  variant="card"
/>

// Inline variant (no card wrapper)
<ErrorState
  message={error.message}
  variant="inline"
/>
```

**Theme tokens:**
- Icon: `text-destructive`
- Border: `border-destructive/50`
- Background: `bg-destructive/5` (card), `bg-destructive/10` (inline)

**Features:**
- Optional retry button (pass `onRetry` prop)
- AlertCircle icon from Lucide
- Accessible: `role="alert"`, `aria-live="polite"`

#### EmptyState
**2 variants:** `card`, `inline`

```typescript
import { EmptyState } from '@/components/shared'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@legal-mind/ui'
import Link from 'next/link'

// Card variant (with padding)
<EmptyState
  icon={CalendarCheck}
  title="No appointments found"
  description="Appointments will appear here after clients book time slots."
  variant="card"
/>

// Inline variant (default, no card wrapper)
<EmptyState
  icon={FileText}
  title="No surveys"
  description="Get started by creating a new survey."
  action={
    <Link href="/admin/surveys/new">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Survey
      </Button>
    </Link>
  }
/>
```

**Theme tokens:**
- Icon: `text-muted-foreground` (12x12 size)
- Title: `text-foreground`, `text-lg font-semibold`
- Description: `text-muted-foreground`, `text-sm`

**Features:**
- Accepts any Lucide icon
- Optional action (ReactNode)
- Centered layout with max-width description

### Forms
```typescript
// Always use React Hook Form + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  title: z.string().min(1, 'Required')
})

const form = useForm({
  resolver: zodResolver(formSchema)
})
```

---

## App-Specific Patterns

### CMS App (`apps/cms/`)

**Purpose:** Admin dashboard for managing surveys, responses, appointments

**Users:** Internal (lawyers, admins)

**Key Patterns:**
- **Semantic tables** - AppointmentList, ResponseList with proper ARIA
- **CRUD forms** - SurveyBuilder, CalendarSettings
- **Status badges** - Centralized utilities (`apps/cms/lib/utils/status.ts`)
- **Data-heavy views** - TanStack Query for server state
- **Protected routes** - All routes behind authentication

**Shared State Components:**
- Location: `apps/cms/components/shared/`
- LoadingState, ErrorState, EmptyState
- Used across all data views

### Website App (`apps/website/`)

**Purpose:** Public marketing site and survey forms

**Users:** External (clients, website visitors)

**Key Patterns:**
- **Marketing sections** - Landing page components (Hero, Features, Benefits)
- **Public forms** - SurveyForm, CalendarBooking (no authentication)
- **Card components** - FeatureCard, BenefitCard, ProblemCard, TestimonialCard
- **Static data** - No TanStack Query (simple server components)
- **Consistent hover states** - `hover:shadow-lg transition-shadow duration-200`

**Shared State Components:**
- Location: `apps/website/components/shared/`
- LoadingState, ErrorState, EmptyState (same API as CMS)
- Used in survey forms and booking flows

**Marketing Components:**
```typescript
// Card hover pattern (standardized)
<Card className="h-full p-6 hover:shadow-lg transition-shadow duration-200">
  // Content
</Card>

// Hero gradient backgrounds
<section className="bg-gradient-to-br from-primary/5 via-background to-primary/5">
  // Content
</section>

// Call-to-action sections
<section className="bg-gradient-to-br from-primary to-primary/90">
  // High-contrast content with primary-foreground text
</section>
```

**Survey Components:**
```typescript
// SurveyForm - Public survey submission
import { SurveyForm } from '@/features/survey/components/SurveyForm'

// QuestionField - Multi-type renderer (7 question types)
// Supports: text, email, tel, textarea, select, radio, checkbox

// CalendarBooking - Multi-step appointment booking
// Steps: Date picker → Time slots → Booking form → Confirmation
```

---

## Cross-App Consistency

### MUST Be Consistent Across Both Apps

1. **Design tokens** - Same color variables from `globals.css`
2. **shadcn/ui components** - Same components from `@legal-mind/ui`
3. **Accessibility standards** - WCAG 2.1 AA compliance
4. **Lucide icons** - No emoji (except where intentional)
5. **Touch targets** - ≥44x44px minimum (use `p-3` for icon buttons)
6. **Shared component API** - LoadingState, ErrorState, EmptyState

### CAN Be Different

- **CMS:** Table-heavy, admin-focused UI
- **Website:** Marketing-focused, conversion-optimized
- **CMS:** TanStack Query for complex data management
- **Website:** Simple server components, minimal client state
- **CMS:** Protected routes with authentication
- **Website:** Public access, no authentication

---

## Shared UI Library (`@legal-mind/ui`)

**Location:** `packages/ui/src/components/ui/`

**Used by:** Both CMS and Website apps

**Core Components:**
- **Button** - 6 variants (default, secondary, outline, ghost, destructive, link)
- **Card** - Container component
- **Badge** - 4 variants (default, secondary, outline, destructive)
- **Form Controls** - Input, Label, Textarea, Select, Checkbox
- **Dialog** - Modal dialogs (replaces window.confirm)
- **Skeleton** - Loading placeholders
- **Toast** - Notifications
- **Form** - React Hook Form integration

**Theme Tokens:**
All components use CSS custom properties from `globals.css`:
```css
/* Primary colors */
--primary: 221.2 83.2% 53.3%
--primary-foreground: 210 40% 98%

/* Destructive colors */
--destructive: 0 84.2% 60.2%
--destructive-foreground: 210 40% 98%

/* Neutral colors */
--foreground: 222.2 84% 4.9%
--muted-foreground: 215.4 16.3% 46.9%
--background: 0 0% 100%
--muted: 210 40% 96.1%
--border: 214.3 31.8% 91.4%
```

**Spacing:** Tailwind scale (2, 4, 6, 8, 12, 16, 24, 32)

**Typography:** rem-based scale with font-semibold/bold

**Installation:**
```bash
cd packages/ui && npx shadcn@latest add [component-name]
```

**Export Pattern:**
All components exported from `packages/ui/src/index.ts`:
```typescript
import { Button, Card, Badge } from '@legal-mind/ui'
```

---

## Implementation Checklist (New Components)

When creating new components in either app, ensure:

**Theme & Design:**
- [ ] Uses shadcn/ui components (not native HTML)
- [ ] Uses theme tokens (not hardcoded colors like `bg-blue-600`)
- [ ] Follows spacing scale (2, 4, 6, 8, 12, 16, 24, 32)
- [ ] Follows typography hierarchy (3xl/xl/lg/base/sm)
- [ ] Uses Lucide icons (not emoji)

**Accessibility:**
- [ ] Icon buttons have `aria-label`
- [ ] Form errors linked with `aria-describedby`
- [ ] Touch targets ≥44x44px (use `p-3` minimum for icon buttons)
- [ ] Decorative SVGs have `aria-hidden="true"`
- [ ] Interactive elements keyboard accessible

**Responsive:**
- [ ] Mobile-first approach (base styles for mobile)
- [ ] Uses breakpoints: sm/md/lg/xl
- [ ] Touch-friendly on mobile devices

**State Management:**
- [ ] Loading states use `LoadingState` component
- [ ] Error states use `ErrorState` component
- [ ] Empty states use `EmptyState` component (if applicable)
- [ ] Forms use React Hook Form + Zod validation

**Code Quality:**
- [ ] No hardcoded colors (verified with grep)
- [ ] No arbitrary spacing values
- [ ] No inline styles
- [ ] Proper TypeScript types

---

## Shadows

```typescript
// Cards
shadow-sm

// Hover states
hover:shadow-md

// Modals/Dialogs
shadow-lg
```

---

## Icons

**Library:** Lucide React (`lucide-react`)

**Size Convention:**
```typescript
// Icon buttons
<Trash2 className="h-4 w-4" />

// Section icons
<FileText className="h-5 w-5" />

// Large icons (empty states)
<FileText className="h-12 w-12" />
```

**No emoji** - Use Lucide icons instead

---

## Button Variants

```typescript
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Tertiary Action</Button>
<Button variant="ghost">Subtle Action</Button>
<Button variant="destructive">Delete/Cancel</Button>
<Button variant="link">Text Link</Button>

// Sizes
<Button size="default">Normal</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>
```

---

## Status Badges

```typescript
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Completed</Badge>
<Badge variant="outline">Pending</Badge>
<Badge variant="destructive">Cancelled</Badge>
```

---

## Anti-Patterns

**Avoid:**
- Custom CSS when Tailwind/shadcn exists
- Arbitrary spacing values (use scale)
- Native HTML form elements (use shadcn/ui)
- Inline style objects
- Low contrast text (text-gray-400 on white)
- Desktop-first responsive design
- Icon buttons without aria-labels
- window.confirm() (use Dialog component)

---

## Quick Reference

**Status Colors:** `apps/cms/lib/utils/status.ts`
**UI Components:** `packages/ui/src/components/ui/`
**shadcn/ui Docs:** https://ui.shadcn.com/
**WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
