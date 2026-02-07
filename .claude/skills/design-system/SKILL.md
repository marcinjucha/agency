---
name: design-system
description: UI/UX design system for AI Agency. Use when creating components, styling, or reviewing accessibility.
---

# Design System

## Purpose

UI/UX patterns for AI Agency applications.

---

## Key Principles

**Why shadcn/ui:** Prevents custom CSS drift, consistent theming
**Why 4px scale:** Consistent spacing without arbitrary values
**Why theme tokens:** Dark mode support, centralized color management

**Location:** `@agency/ui` (`packages/ui/`)

---

## Shared State Components

**Location:** `apps/{app}/components/shared/`

- `LoadingState` (spinner, skeleton variants)
- `ErrorState` (with retry action)
- `EmptyState` (with CTA button)

**Why:** Consistent UX across features

---

## Critical Checklist

- [ ] shadcn/ui used (not native HTML)
- [ ] Theme tokens (not hardcoded like `bg-blue-600`)
- [ ] 4px spacing scale
- [ ] Icon buttons have `aria-label`
- [ ] All 4 states (loading, error, empty, success)

