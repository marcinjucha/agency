---
name: visual-design
description: Use when reviewing visual design quality. Covers spacing consistency (4px scale), typography hierarchy (font sizes/weights), responsive design (mobile-first), and visual feedback (hover/focus states). Project-specific design standards.
---

# Visual Design - Spacing, Typography, Responsive

## Purpose

Visual design standards: consistent spacing (4px scale), clear typography hierarchy (size/weight), responsive design (mobile-first breakpoints), and interactive feedback (hover/focus states).

## When to Use

- Spacing inconsistent (off-scale values)
- Typography unclear (no hierarchy)
- Not responsive (mobile broken)
- Missing visual feedback (hover states)

## Critical Pattern: Mobile-First Responsive

**Project convention: Mobile-first breakpoints**

```typescript
// ❌ WRONG - Desktop-first (max-width)
<div className="grid-cols-3 md:grid-cols-2 sm:grid-cols-1">

// ✅ CORRECT - Mobile-first (min-width)
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

**Breakpoints:**
```css
sm: 640px   /* Tablet */
md: 768px   /* Small desktop */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

**Why mobile-first:** Default = mobile (most users), enhance for larger screens.

## Typography Hierarchy

**Pattern: Size + weight differentiation**

```typescript
// ✅ CORRECT - Clear hierarchy
<h1 className="text-3xl font-bold">Main Title</h1>
<h2 className="text-2xl font-semibold">Section</h2>
<p className="text-base text-muted-foreground">Body text</p>
<span className="text-sm text-muted-foreground">Helper text</span>

// ❌ WRONG - No hierarchy
<h1 className="text-lg">Main Title</h1>
<h2 className="text-lg">Section</h2>
<p className="text-lg">Body text</p>
```

**Typography scale:**
```css
text-xs    /* 12px - tiny labels */
text-sm    /* 14px - helper text */
text-base  /* 16px - body */
text-lg    /* 18px - subheadings */
text-xl    /* 20px - headings */
text-2xl   /* 24px - section titles */
text-3xl   /* 30px - page titles */
```

**Font weights:**
```css
font-normal    /* 400 - body text */
font-medium    /* 500 - emphasis */
font-semibold  /* 600 - headings */
font-bold      /* 700 - titles */
```

## Interactive Feedback

**Pattern: Hover + focus states**

```typescript
// ✅ CORRECT - Visual feedback
<Button className="hover:bg-primary/90 focus:ring-2 focus:ring-primary">
  Click me
</Button>

<Card className="hover:shadow-md transition-shadow cursor-pointer">
  Clickable card
</Card>

// ❌ WRONG - No feedback
<button>Click me</button>
// No visual change on hover/focus
```

**Why feedback:** Users need confirmation element is interactive.

## Quick Reference

**Visual design checklist:**

```yaml
Spacing:
  - [ ] 4px scale (2, 4, 6, 8, 12, 16, 24, 32)
  - [ ] Consistent gaps (gap-4, space-y-4)
  - [ ] No arbitrary values (gap-5, mb-7)

Typography:
  - [ ] Clear hierarchy (h1 > h2 > p)
  - [ ] Size scale (3xl, 2xl, xl, lg, base, sm, xs)
  - [ ] Weight differentiation (bold titles, normal body)

Responsive:
  - [ ] Mobile-first (sm:, md:, lg:)
  - [ ] Works on mobile (320px width)
  - [ ] No horizontal scroll

Interactive:
  - [ ] Hover states (hover:bg-, hover:shadow-)
  - [ ] Focus states (ring, outline)
  - [ ] Transitions smooth (transition-colors, transition-shadow)
  - [ ] Cursor pointer for clickable
```

## Real Project Example

**Phase 2 Survey Form Design Review:**

```yaml
Issues found:
  P1: No mobile responsive (overflow on 320px)
  P1: Missing focus states (keyboard users)
  P2: Inconsistent spacing (mix of gap-4 and gap-5)

Fixed:
  ✅ Mobile-first grid (grid-cols-1 sm:grid-cols-2)
  ✅ Focus rings (focus:ring-2 focus:ring-primary)
  ✅ Standardized spacing (all gap-4, mb-6)

Result: Mobile usable, keyboard accessible, visually consistent
```

## Anti-Patterns

### ❌ Desktop-First Responsive

**Problem:** Using max-width breakpoints

```typescript
// ❌ WRONG
<div className="grid-cols-3 max-md:grid-cols-1">
// Default: desktop (3 columns)
// Mobile broken if too narrow

// ✅ CORRECT
<div className="grid-cols-1 md:grid-cols-3">
// Default: mobile (1 column)
// Enhanced for desktop (3 columns)
```

**Why wrong:** Mobile users see broken layout by default.

### ❌ No Visual Hierarchy

**Problem:** All text same size/weight

```typescript
// ❌ WRONG
<h1 className="text-base font-normal">Page Title</h1>
<p className="text-base font-normal">Body text</p>

// ✅ CORRECT
<h1 className="text-3xl font-bold">Page Title</h1>
<p className="text-base font-normal text-muted-foreground">Body text</p>
```

**Why wrong:** User can't distinguish important content from body text.

### ❌ Missing Interactive Feedback

**Problem:** No hover/focus indication

```typescript
// ❌ WRONG
<button>Click me</button>
// No visual change on hover/focus

// ✅ CORRECT
<Button className="hover:bg-primary/90 focus:ring-2">
  Click me
</Button>
```

**Why wrong:** Users unsure if element is interactive.

---

**Key Lesson:** Mobile-first responsive, clear typography hierarchy, visual feedback for interactive elements.
