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

**Pattern: Form accessibility**

```typescript
// ❌ WRONG - Missing labels, no ARIA
<div>
  <input type="text" />
  <button>Submit</button>
</div>

// ✅ CORRECT - Semantic + ARIA
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

**Why critical:**
- Labels: Screen readers announce field purpose
- aria-required: Indicates required fields
- aria-invalid: Announces validation errors
- aria-describedby: Links error to input
- role="alert": Screen reader announces error immediately

## Keyboard Navigation

**Pattern: All interactive elements focusable**

```typescript
// ❌ WRONG - div onClick (not keyboard accessible)
<div onClick={handleClick}>Click me</div>

// ✅ CORRECT - button (keyboard accessible)
<button onClick={handleClick}>Click me</button>

// For custom interactive elements:
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Custom interactive
</div>
```

**Keyboard checklist:**
```yaml
- [ ] Tab reaches all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals/dialogs
- [ ] Arrow keys navigate lists (optional)
- [ ] Focus visible (outline or custom style)
- [ ] No focus traps
```

## Color Contrast (WCAG AA)

**Minimum ratios:**
```
Normal text: 4.5:1
Large text (18px+): 3:1
UI components: 3:1
```

**Pattern: Use theme tokens (auto-compliant)**

```typescript
// ✅ CORRECT - Theme tokens (tested for contrast)
className="text-foreground bg-background"        /* High contrast */
className="text-muted-foreground bg-muted"       /* Readable contrast */

// ❌ WRONG - Arbitrary colors (may fail contrast)
className="text-gray-400 bg-gray-100"  /* Might be <4.5:1 */
```

**Why theme tokens:** Pre-tested for WCAG AA compliance.

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

**Common ARIA attributes:**

```typescript
aria-label="Close dialog"          /* Icon-only buttons */
aria-required="true"                /* Required fields */
aria-invalid={!!errors.field}       /* Validation errors */
aria-describedby="field-error"      /* Link error to field */
aria-live="polite"                  /* Announce changes */
role="alert"                        /* Error announcements */
```

## Real Project Example

**Phase 2 Survey Form Accessibility:**

```yaml
Violations found:
  ❌ Question labels missing htmlFor
  ❌ Required fields no aria-required
  ❌ Error messages no role="alert"
  ❌ Custom checkboxes not keyboard accessible

Fixed:
  ✅ <Label htmlFor={question.id}>
  ✅ aria-required={question.required}
  ✅ <p role="alert"> for errors
  ✅ Native checkboxes (keyboard accessible)

Result: WCAG 2.1 AA compliant, keyboard navigable
```

## Anti-Patterns

### ❌ Missing Labels

**Problem:** Inputs without labels

```typescript
// ❌ WRONG
<input type="text" placeholder="Name" />

// ✅ CORRECT
<Label htmlFor="name">Name</Label>
<Input id="name" type="text" />
```

**Why wrong:** Screen readers can't announce field purpose.

### ❌ div onClick (Not Keyboard Accessible)

**Problem:** Non-semantic interactive elements

```typescript
// ❌ WRONG
<div onClick={handleClick}>Click me</div>
// Keyboard users can't activate!

// ✅ CORRECT
<button onClick={handleClick}>Click me</button>
// Or <Button> from @legal-mind/ui
```

**Why wrong:** Not focusable, no keyboard activation.

### ❌ Low Contrast Text

**Problem:** Using colors with insufficient contrast

```typescript
// ❌ WRONG - Gray on gray (may be <4.5:1)
<p className="text-gray-400">Important text</p>

// ✅ CORRECT - Theme token (tested contrast)
<p className="text-muted-foreground">Important text</p>
```

**Why wrong:** Fails WCAG AA, hard to read for low vision users.

---

**Key Lesson:** Semantic HTML, proper labels, keyboard navigation, sufficient contrast. Use design system (accessibility built-in).
