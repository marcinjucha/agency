---
name: ui-components
description: Use when creating React components, reviewing UI design system compliance, accessibility (WCAG 2.1 AA), or responsive design. Critical bugs — Controller for checkbox arrays (register stores only last value), TanStack Query CMS-only rule, handle all 4 UI states.
---

# UI Components

## Critical Bugs (Phase 2)

### Controller for Checkbox Arrays
**Bug:** `register` for checkboxes stores only the last value, not an array.

```typescript
❌ register('field')       // Single value only
✅ Controller with array handling
```

**Why:** `register` = single value binding. Controller = controlled value with array support.

### No Mobile Responsive
**Bug:** Phase 2 survey form had no mobile layout.

**Fix:** Always mobile-first — default classes = mobile, enhance with `sm:`, `md:`, `lg:`.

```typescript
✅ <div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

---

## Project Rules

### TanStack Query: CMS Only

- `apps/cms/` — Use TanStack Query (admin users stay longer, cache provides value)
- `apps/website/` — NO TanStack Query (public users one-time visit, cache useless)

```typescript
// ✅ CMS: useQuery
'use client'
const { data } = useQuery({ queryKey: ['surveys'], queryFn: getSurveys })

// ✅ Website: Server Component
export default async function Page() {
  const data = await getSurveys()
  return <Component data={data} />
}
```

### Handle All 4 UI States

Required in every data-fetching component:

```typescript
if (isLoading) return <LoadingState variant="skeleton-table" rows={5} />
if (error) return <ErrorState title="..." message={error.message} onRetry={() => refetch()} />
if (!data?.length) return <EmptyState icon={FileText} title="..." />
return <SuccessView data={data} />
```

**Why:** Missing states = crashes or blank screens. Use `LoadingState`/`ErrorState`/`EmptyState` from `@resources/shared-components.md`.

---

## Design System

### Theme Tokens (Not Arbitrary Colors)

```typescript
✅ bg-primary, text-foreground, text-muted-foreground, border-border
❌ bg-blue-600, text-gray-400
```

**Why:** Theme tokens auto-adjust for dark mode. Arbitrary colors break dark mode and require manual updates across codebase.

Common tokens from `globals.css`:
- `bg-background`, `bg-card`, `bg-primary`, `bg-muted`
- `text-foreground`, `text-muted-foreground`, `text-primary`
- `border-border`, `border-input`

### shadcn/ui Components (Not Custom)

```typescript
❌ <div className="bg-blue-600 px-4 py-2" onClick={handleClick}>Click</div>
✅ import { Button } from '@agency/ui'
   <Button variant="outline">Click me</Button>
```

**Library location:** `packages/ui/` exported as `@agency/ui`.

### Inline Styles for Custom Colors in packages/ui/

**Problem:** Tailwind v4 doesn't process custom CSS variables in transpiled packages — Next.js transpiles on-demand, custom CSS variables are undefined.

**Fix:** Use inline styles for custom colors only inside `packages/ui/`:

```typescript
// packages/ui/src/components/ui/button.tsx
const inlineStyle = variant === 'destructive' ? {
  backgroundColor: isHovered ? '#b91c1c' : '#dc2626',
  color: '#ffffff',
} : style
```

**When to use:** Custom theme colors in `packages/ui/` (destructive, custom opacity, hover on custom colors).
**When NOT to use:** App-specific components (use Tailwind), standard spacing/borders, theme tokens.

### 4px Spacing Scale

```typescript
✅ gap-4, gap-6, space-y-4, space-y-8
❌ gap-5 (off-scale)
```

---

## Accessibility (WCAG 2.1 AA)

### Semantic HTML + ARIA

```typescript
// ✅ Form pattern
<form>
  <Label htmlFor="name">Name *</Label>
  <Input
    id="name"
    aria-required="true"
    aria-invalid={!!errors.name}
    aria-describedby={errors.name ? "name-error" : undefined}
  />
  {errors.name && (
    <p id="name-error" role="alert">{errors.name.message}</p>
  )}
</form>

// ❌ div is not keyboard accessible
<div onClick={handleClick}>Click</div>
// ✅ button is
<button onClick={handleClick}>Click</button>
```

### Keyboard Navigation

- Tab reaches all interactive elements
- Enter/Space activates buttons
- Escape closes modals/dialogs
- Focus always visible (ring/outline)
- Icon-only buttons have `aria-label`

### Color Contrast

Theme tokens are pre-validated WCAG AA (4.5:1). Arbitrary colors are not guaranteed compliant — another reason to avoid them.

---

## Anti-Patterns

| Violation | Fix |
|-----------|-----|
| `bg-blue-600` | `bg-primary` |
| Custom `<div onClick>` button | `<Button>` from `@agency/ui` |
| `register` for checkbox array | `Controller` with array handling |
| TanStack Query in `apps/website/` | Server Component with direct fetch |
| Missing loading/error/empty state | All 4 states required |
| `gap-5` | `gap-4` or `gap-6` |
| No mobile styles | Mobile-first default, `sm:`/`md:`/`lg:` for larger |

---

## References

- `@resources/shared-components.md` — LoadingState/ErrorState/EmptyState API and usage examples
