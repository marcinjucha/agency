---
name: accessibility
description: Use when reviewing component accessibility. Covers WCAG 2.1 AA compliance (contrast, keyboard nav, ARIA), semantic HTML, and focus management. Project-specific accessibility requirements and common violations.
---

# Accessibility - WCAG 2.1 AA Compliance

## Purpose

Accessibility compliance: WCAG 2.1 AA standards (4.5:1 contrast, keyboard navigation, ARIA attributes), semantic HTML, and focus management. Ensure components usable by all users.

## When to Use

- Component missing labels (form inputs)
- Keyboard navigation broken (focus traps)
- Color contrast insufficient (<4.5:1)
- Missing ARIA attributes (screen readers)

## Critical Pattern: Semantic HTML + ARIA

**Pattern: Form accessibility (use shadcn/ui Label + Input)**

```typescript
// ✅ - Semantic + ARIA
<form>
  <Label htmlFor="name">Name *</Label>
  <Input
    id="name"
    type="text"
    aria-required="true"
    aria-invalid={!!errors.name}
    aria-describedby={errors.name ? "name-error" : undefined}
  />
  {errors.name && (
    <p id="name-error" role="alert" className="text-red-500">
      {errors.name.message}
    </p>
  )}

  <Button type="submit">Submit</Button>
</form>
```

## Keyboard Navigation

**Pattern: Use semantic elements (auto-focusable)**

```typescript
// ❌ - div not keyboard accessible
<div onClick={handleClick}>Click me</div>

// ✅ - button (keyboard accessible)
<button onClick={handleClick}>Click me</button>
```

**Keyboard checklist:**
```yaml
- [ ] Tab reaches interactive elements
- [ ] Enter/Space activates
- [ ] Escape closes modals
- [ ] Focus visible
- [ ] No focus traps
```

## Color Contrast

**Pattern: Use theme tokens (auto-compliant WCAG AA 4.5:1)**

```typescript
// ✅ Theme tokens (4.5:1 compliant)
className="text-foreground bg-background"
className="text-muted-foreground bg-muted"

// ❌ Arbitrary colors (not guaranteed compliant)
className="text-gray-400 bg-gray-100"
```

## Quick Reference

**Accessibility checklist:**

```yaml
Semantic HTML:
  - [ ] <form> for forms (not <div>)
  - [ ] <button> for buttons (not <div onClick>)
  - [ ] <nav> for navigation
  - [ ] <main> for main content

Labels:
  - [ ] All inputs have <Label> with htmlFor
  - [ ] Required fields indicated (*, aria-required)
  - [ ] Error messages linked (aria-describedby)

Keyboard:
  - [ ] Tab navigation works
  - [ ] Focus visible (outline/ring)
  - [ ] Enter/Space activates
  - [ ] Escape closes modals

ARIA:
  - [ ] aria-label for icon-only buttons
  - [ ] aria-invalid for validation errors
  - [ ] role="alert" for error messages
  - [ ] aria-describedby for field descriptions

Contrast:
  - [ ] Text: 4.5:1 minimum
  - [ ] UI components: 3:1 minimum
  - [ ] Use theme tokens (auto-compliant)
```

## Real Project Example

**Phase 2 Survey Form Accessibility:**

```yaml
Violations found:
  - Question labels missing htmlFor
  - Required fields no aria-required
  - Error messages no role="alert"
  - Custom checkboxes not keyboard accessible

Fixed:
  ✅ <Label htmlFor={question.id}>
  ✅ aria-required={question.required}
  ✅ <p role="alert"> for errors
  ✅ Native checkboxes (keyboard accessible)

Result: WCAG 2.1 AA compliant, keyboard navigable
```

---

**Key Lesson:** Semantic HTML, proper labels, keyboard navigation, sufficient contrast. Use design system (accessibility built-in).
