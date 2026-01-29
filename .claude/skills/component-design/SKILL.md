---
name: component-design
description: Use when reviewing component design system compliance. Covers shadcn/ui correct usage, theme tokens from globals.css, and avoiding custom CSS when design system exists. Project-specific design decisions and common UI mistakes.
---

# Component Design - Design System Compliance

## Purpose

Design system compliance: use shadcn/ui components from @legal-mind/ui, theme tokens from globals.css (not arbitrary colors), and avoid custom CSS when system components exist.

## When to Use

- Component uses custom button (should use shadcn/ui Button)
- Hardcoded colors (should use theme tokens)
- Custom CSS for common UI (should use design system)
- Component inconsistent with design system

## Critical Pattern: Theme Tokens (Not Arbitrary Colors)

**Project rule: Use tokens from globals.css**

```typescript
// ❌ WRONG - Arbitrary Tailwind colors
<div className="bg-blue-600 text-gray-400 border-gray-300">

// ✅ CORRECT - Theme tokens
<div className="bg-primary text-muted-foreground border-border">
```

**Why theme tokens:**
- Consistent across project (all blues same shade)
- Dark mode support (tokens auto-adjust)
- Design changes centralized (update globals.css once)

**Common theme tokens:**
```css
/* From globals.css */
bg-background        /* Main background */
bg-card             /* Card background */
bg-primary          /* Primary actions */
bg-muted            /* Subtle backgrounds */

text-foreground     /* Main text */
text-muted-foreground  /* Secondary text */
text-primary        /* Links, CTAs */

border-border       /* Default borders */
border-input        /* Input borders */
```

## shadcn/ui Component Usage

**Pattern: Use design system components**

```typescript
// ❌ WRONG - Custom button
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  Click me
</button>

// ✅ CORRECT - shadcn/ui Button
import { Button } from '@legal-mind/ui'

<Button>Click me</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
```

**Common components:**
```typescript
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  Checkbox,
  Dialog,
  AlertDialog,
  Alert,
  Badge,
  Tabs
} from '@legal-mind/ui'
```

**Why use design system:**
- Consistent UI (all buttons same style)
- Accessibility built-in (ARIA attributes)
- Less code (no custom CSS)
- Maintained centrally (updates propagate)

## Critical Pattern: Inline Styles for Transpiled Packages

**Project-specific workaround: Tailwind v4 custom colors don't work in transpiled packages**

```typescript
// packages/ui/src/components/ui/button.tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const [isHovered, setIsHovered] = React.useState(false)

    // ✅ CORRECT - Inline styles for custom colors
    const inlineStyle = variant === 'destructive' ? {
      backgroundColor: isHovered ? '#b91c1c' : '#dc2626', // hover: red-700, normal: red-600
      color: '#ffffff',
      ...style
    } : style

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === 'destructive') setIsHovered(true)
      onMouseEnter?.(e)
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={inlineStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      />
    )
  }
)
```

**Why inline styles needed:**
- Tailwind v4 custom colors (destructive, primary with opacity) don't transpile correctly in Next.js packages
- Next.js transpiles packages on-demand → custom CSS variables undefined
- Inline styles bypass Tailwind → work consistently

**When to use inline styles:**
1. Custom theme colors in transpiled packages (destructive variant, custom opacity)
2. Interactive hover states for custom colors (manage with useState)
3. Fixed positioning/layout that Tailwind can't express

**When NOT to use inline styles:**
1. Standard Tailwind utilities (spacing, borders, shadows)
2. Theme tokens (background, foreground, muted) - these work
3. Components NOT in packages/ (app-specific components use Tailwind normally)

**Real usage in project:**
- Button destructive variant (inline red colors)
- Dialog/AlertDialog overlay (inline rgba background, positioning)
- Components with complex z-index/positioning logic

**Pattern applies to:**
- packages/ui/src/components/ui/button.tsx
- packages/ui/src/components/ui/dialog.tsx
- packages/ui/src/components/ui/alert-dialog.tsx

## Spacing Scale (Tailwind)

**Project standard: 4px scale**

```typescript
// ✅ CORRECT - Scale: 2, 4, 6, 8, 12, 16, 24, 32...
gap-4     /* 16px */
p-6       /* 24px */
mb-8      /* 32px */
space-y-4 /* 16px vertical gap */

// ❌ WRONG - Arbitrary spacing
gap-5     /* 20px - not in scale */
p-7       /* 28px - not in scale */
mb-10     /* 40px - not in scale */
```

**Why scale:** Visual consistency, easier to maintain

## Quick Reference

**Design system compliance:**
```yaml
- [ ] Uses shadcn/ui components (not custom)
- [ ] Theme tokens (not arbitrary colors)
- [ ] Spacing scale (4px: 2, 4, 6, 8...)
- [ ] No custom CSS (unless necessary)
```

**Common violations:**

| Violation | Fix |
|-----------|-----|
| `bg-blue-600` | `bg-primary` |
| Custom button | `<Button>` from @legal-mind/ui |
| `gap-5` | `gap-4` or `gap-6` (scale) |
| `className="custom-css"` | Use design system component |

## Real Project Example

**Phase 2 Survey Form Review:**

```yaml
Violations found:
  ❌ Custom submit button (bg-blue-600, custom padding)
  ❌ Hardcoded gray colors (text-gray-400, border-gray-300)
  ❌ Arbitrary spacing (gap-5, mb-7)

Fixed:
  ✅ <Button> from @legal-mind/ui
  ✅ Theme tokens (text-muted-foreground, border-border)
  ✅ Spacing scale (gap-4, mb-6)

Result: Consistent with design system, dark mode support
```

## Anti-Patterns

### ❌ Custom CSS for Standard Components

**Problem:** Reimplementing Button instead of using shadcn/ui

```typescript
// ❌ WRONG
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
  Submit
</button>

// ✅ CORRECT
import { Button } from '@legal-mind/ui'
<Button>Submit</Button>
```

**Why wrong:** Inconsistent with rest of app, missing accessibility features, harder to maintain.

### ❌ Hardcoded Colors

**Problem:** Using arbitrary Tailwind colors instead of theme

```typescript
// ❌ WRONG
<div className="bg-blue-50 text-blue-900 border-blue-200">

// ✅ CORRECT
<div className="bg-primary/10 text-primary border-primary/20">
// Or use semantic tokens:
<div className="bg-muted text-foreground border-border">
```

**Why wrong:** Breaks dark mode, inconsistent shades across app.

### ❌ Off-Scale Spacing

**Problem:** Using spacing not in 4px scale

```typescript
// ❌ WRONG
<div className="gap-5 p-7 mb-10">

// ✅ CORRECT
<div className="gap-4 p-6 mb-8">
// Or gap-6, p-8, mb-12 (all in scale)
```

**Why wrong:** Visual inconsistency, harder to maintain spacing system.

### ❌ Tailwind Custom Colors in Transpiled Packages

**Problem:** Using Tailwind custom color classes in packages/ui components

```typescript
// ❌ WRONG - Custom colors in transpiled package
// packages/ui/src/components/ui/button.tsx
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        // ^ Won't work - custom colors undefined during transpilation
      }
    }
  }
)

// ✅ CORRECT - Inline styles for custom colors
const inlineStyle = variant === 'destructive' ? {
  backgroundColor: isHovered ? '#b91c1c' : '#dc2626',
  color: '#ffffff',
  ...style
} : style
```

**Why wrong:** Next.js transpiles packages on-demand. Tailwind v4 custom colors (destructive, primary with opacity) are CSS variables defined in app globals.css, not available during package transpilation. Component renders with missing colors.

**When discovered:** Phase 2 - Button destructive variant appeared unstyled after moving to packages/ui.

---

**Key Lesson:** Use design system components, theme tokens, and spacing scale. Use inline styles for custom colors in transpiled packages.
