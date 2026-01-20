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
