---
name: component-design
description: Use when reviewing component design system compliance. Covers shadcn/ui correct usage, theme tokens from globals.css, and avoiding custom CSS when design system exists. Project-specific design decisions and common UI mistakes.
---

# Component Design - Design System Compliance

## Purpose

Design system compliance: use shadcn/ui components from @agency/ui, theme tokens from globals.css (not arbitrary colors), and avoid custom CSS when system components exist.

## When to Use

- Component uses custom button (should use shadcn/ui Button)
- Hardcoded colors (should use theme tokens)
- Custom CSS for common UI (should use design system)
- Component inconsistent with design system

## Critical Pattern: Theme Tokens (Not Arbitrary Colors)

**Project rule: Use tokens from globals.css**

```typescript
// ✅ Use theme tokens
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
// ❌ Custom button
<div className="bg-blue-600 px-4 py-2" onClick={handleClick}>Click</div>

// ✅ shadcn/ui Button
import { Button } from '@agency/ui'
<Button>Click me</Button>
<Button variant="outline">Secondary</Button>
```

**Why:** Consistent UI, accessibility built-in, less code, centrally maintained.

## Critical Pattern: Inline Styles in Transpiled Packages

**Problem:** Tailwind v4 custom colors don't work in transpiled packages.

**Why:** Next.js transpiles packages on-demand → custom CSS variables undefined.

**Fix:** Use inline styles for custom colors in `packages/ui/`:

```typescript
// packages/ui/src/components/ui/button.tsx
const [isHovered, setIsHovered] = React.useState(false)

const inlineStyle = variant === 'destructive' ? {
  backgroundColor: isHovered ? '#b91c1c' : '#dc2626',
  color: '#ffffff',
  ...style
} : style

return (
  <button
    style={inlineStyle}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
  />
)
```

**When to use:**
- Custom theme colors in packages/ (destructive, custom opacity)
- Hover states for custom colors
- Fixed positioning Tailwind can't express

**When NOT to use:**
- Standard Tailwind (spacing, borders)
- Theme tokens (these work normally)
- App-specific components (use Tailwind)

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
| Custom button | `<Button>` from @agency/ui |
| `gap-5` | `gap-4` or `gap-6` (scale) |
| `className="custom-css"` | Use design system component |

## Real Project Example

**Phase 2 Survey Form Review:**

```yaml
Violations:
  - Custom button (bg-blue-600)
  - Hardcoded colors (text-gray-400)

Fixed:
  ✅ Button from @agency/ui
  ✅ Theme tokens (text-muted-foreground)

Result: Consistent UI, dark mode support
```

