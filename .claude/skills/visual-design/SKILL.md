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

**Convention:** Mobile-first (default = mobile, enhance for larger)

```typescript
// ✅
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

## Typography Hierarchy

**Pattern:** Size + weight differentiation

```typescript
// ✅
<h1 className="text-3xl font-bold">Main Title</h1>
<h2 className="text-2xl font-semibold">Section</h2>
<p className="text-base">Body text</p>
```

## Interactive Feedback

**Pattern:** Hover + focus states

```typescript
// ✅
<Button className="hover:bg-primary/90 focus:ring-2">Click</Button>
```

## Quick Reference

**Checklist:**
- [ ] Spacing: 4px scale (gap-4, space-y-6)
- [ ] Typography: Clear hierarchy (3xl > 2xl > base)
- [ ] Responsive: Mobile-first (sm:, md:, lg:)
- [ ] Interactive: Hover + focus states (hover:, focus:ring-)

## Real Project Example

**Phase 2 Survey Form:**
- ⚠️ P1: No mobile responsive, missing focus states
- ✅ Fixed: Mobile-first grid, focus rings, standardized spacing

