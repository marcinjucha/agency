---
name: component-patterns
description: Use when creating React components with forms. Critical patterns - Controller for checkbox arrays (register breaks), TanStack Query CMS-only rule, and 4 UI states requirement. Project-specific React pitfalls from Phase 2.
---

# Component Patterns - React Project-Specific Rules

## Purpose

Project-specific React patterns that prevent real bugs: Controller for checkboxes (register stores only last value), TanStack Query CMS-only rule, UI states requirement.

## When to Use

- Checkbox arrays in forms (Controller, not register)
- TanStack Query decision (CMS yes, Website no)
- Missing loading/error/empty states

## Critical Patterns

### Controller for Checkbox Arrays 🚨

**Real bug from Phase 2:** register for checkboxes stored only last value, not array

```typescript
// ❌ WRONG - Stores "C" not ["A","B","C"]
<input type="checkbox" {...register('field')} />

// ✅ CORRECT - Stores array
import { Controller } from 'react-hook-form'

<Controller
  name="field"
  control={control}
  defaultValue={[]}
  render={({ field }) => (
    <input
      type="checkbox"
      checked={field.value?.includes(option)}
      onChange={(e) => {
        const values = field.value || []
        field.onChange(
          e.target.checked
            ? [...values, option]
            : values.filter(v => v !== option)
        )
      }}
    />
  )}
/>
```

**Why:** `register` = single value, Controller = array handling

### TanStack Query: CMS Only

**Project rule:**
- ✅ `apps/cms/` - Use TanStack Query (admin benefits from cache)
- ❌ `apps/website/` - NO TanStack Query (public = Server Components)

```typescript
// ✅ CMS: Use useQuery
'use client'
const { data } = useQuery({ queryKey: ['surveys'], queryFn: getSurveys })

// ❌ Website: NO useQuery
// Use Server Component instead:
export default async function Page() {
  const data = await getSurveys()  // Direct fetch
  return <Component data={data} />
}
```

**Why:** Admin users stay longer (cache helps), public users one-time visit (cache useless)

### Handle All 4 UI States

**Required states:**

```typescript
if (isLoading) return <Spinner />
if (error) return <ErrorMessage />
if (!data || data.length === 0) return <EmptyState />
return <SuccessView data={data} />
```

**Why:** Missing states = crashes or blank screens

## Quick Reference

**register vs Controller:**
- `register` - text, email, tel, number, textarea, select, radio
- `Controller` - checkbox (arrays), multi-select, custom components

**TanStack Query:**
- CMS app: YES (useQuery)
- Website app: NO (Server Components)

**Checklist:**
- [ ] Controller for checkbox arrays (NOT register)
- [ ] TanStack Query ONLY in CMS
- [ ] All 4 states (loading, error, empty, success)

## Real Bugs Fixed

**Phase 2 Survey:**
- Bug: Used register for checkboxes → only last value stored
- Fix: Changed to Controller → array values work
- Impact: Checkbox questions now work correctly

---

**Key Lesson:** Controller for arrays, TanStack Query CMS-only, handle all states.
