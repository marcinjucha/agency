---
name: design-system
description: UI/UX design system for Legal-Mind. Use when creating components, styling, or reviewing accessibility.
---

# Design System

**Purpose:** UI/UX patterns for Legal-Mind applications.

---

## shadcn/ui Components

**Location:** `@legal-mind/ui` (`packages/ui/`)

**Available Components:**
- Button, Card, Badge, Input, Label
- Dialog, Select, Textarea, Checkbox, Skeleton
- Form (React Hook Form integration)
- Toast (notifications)

**Installation:**
```bash
cd packages/ui && npx shadcn@latest add [component-name]
```

**Always use shadcn/ui components instead of custom HTML elements.**

---

## Theme Tokens

```css
/* Primary colors */
--primary
--primary-foreground

/* Destructive colors */
--destructive
--destructive-foreground

/* Neutral colors */
--foreground
--muted-foreground
--background
--muted
--border
```

**Anti-pattern:** Never use hardcoded colors like `bg-blue-600`. Use theme tokens.

---

## Spacing Scale

**Standard:** 2, 4, 6, 8, 12, 16, 24, 32

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
```

---

## Typography Scale

```typescript
text-3xl font-bold           // Page titles
text-xl font-semibold        // Section headings
text-lg font-semibold        // Card headings
text-base                    // Body text
text-sm text-muted-foreground // Small text
```

---

## Accessibility (WCAG 2.1 AA)

**Minimum Standards:**
- Text contrast: 4.5:1 minimum
- Touch targets: 44x44px (use `p-3` for icon buttons)
- Icon buttons: `aria-label` required
- Live regions: `aria-live="polite"` for updates

```typescript
// Icon button pattern
<Button aria-label="Delete question" variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>
```

---

## Shared State Components

**Location:** `apps/{app}/components/shared/`

### LoadingState
```typescript
<LoadingState variant="spinner" message="Loading..." />
<LoadingState variant="skeleton-table" rows={5} />
<LoadingState variant="skeleton-list" rows={3} />
<LoadingState variant="skeleton-card" rows={2} />
```

### ErrorState
```typescript
<ErrorState
  title="Failed to load"
  message={error.message}
  onRetry={() => refetch()}
  variant="card"  // or "inline"
/>
```

### EmptyState
```typescript
<EmptyState
  icon={FileText}
  title="No surveys"
  description="Get started by creating a new survey."
  action={<Button>Create</Button>}
/>
```

See: [@resources/shared-components.md](./resources/shared-components.md) for complete API.

---

## Button Variants

```typescript
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Tertiary</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>
```

---

## Badge Variants

```typescript
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Completed</Badge>
<Badge variant="outline">Pending</Badge>
<Badge variant="destructive">Cancelled</Badge>
```

---

## Icons

**Library:** Lucide React (`lucide-react`)

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

## Responsive Breakpoints

```typescript
sm:  640px+   // Tablet
md:  768px+   // Tablet landscape
lg:  1024px+  // Desktop
xl:  1280px+  // Large desktop

// Mobile-first example
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

---

## UI Review Checklist (Before Merge)

**Visual Hierarchy:**
- [ ] Uses shadcn/ui (not native HTML)
- [ ] Uses theme tokens (not hardcoded colors)
- [ ] Follows spacing scale (2, 4, 6, 8, 12, 16, 24, 32)
- [ ] Consistent typography (text-3xl, text-xl, text-lg, text-base, text-sm)

**Accessibility (WCAG 2.1 AA):**
- [ ] Icon buttons have `aria-label`
- [ ] Touch targets ≥44x44px
- [ ] Text contrast ≥4.5:1
- [ ] Live regions use `aria-live="polite"`

**Responsive Design:**
- [ ] Mobile-first responsive (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
- [ ] Touch-friendly on mobile (p-3 for icon buttons)
- [ ] Tested at 375px, 768px, 1024px

**UI States:**
- [ ] Uses LoadingState/ErrorState/EmptyState
- [ ] Loading spinner shows during async operations
- [ ] Error messages are user-friendly
- [ ] Empty states have action button

**Anti-Pattern:** Never merge UI changes without checking this list (prevents styling rework).
