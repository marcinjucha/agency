---
name: code-validation
description: Use when validating implementation before manual testing. Checks business logic correctness, plan alignment, code quality, and completeness. Focuses on project-specific patterns and common bugs from Phase 2.
---

# Code Validation - Pre-Testing Quality Checks

## Purpose

Validate implementation correctness before manual testing: business logic matches plan, code quality acceptable, common bugs avoided. Prevents wasting testing time on broken code.

## When to Use

- Implementation complete (before manual testing)
- Code review (quality check)
- Plan alignment verification (matches requirements)
- Common bug patterns (Phase 2 lessons)

## Requirements Coverage

**Purpose:** Verify all plan requirements implemented (catch missing functionality)

**Why this matters:**
- Phase 2: 3/5 implementations had missing validation checks → manual testing caught them
- User reported "unlimited submissions" bug in production → validation check missing from Phase 3
- Cost: 2 hours rework per missing requirement → validation step saves testing time

**Risk levels for missing requirements:**
- Missing functional requirement = HIGH (broken functionality)
- Missing validation/constraint = CRITICAL (security, data integrity)
- Missing edge case = MEDIUM (poor UX)

**Example from Phase 2:**

```yaml
Plan: "Max submissions limit enforced"
Code: Missing submission count check
Impact: Users submitted 50+ times (plan said max 5)
Risk: HIGH (business rule violated)
```

## Architectural Compliance

**Purpose:** Catch project-specific architecture violations (ADRs)

### ADR-005: Routes Minimal, Logic in Features

**Why this rule exists:**
- Phase 1: Supabase queries in routes → couldn't unit test without spinning up server
- Phase 2: Refactored queries to features/ → testable, reusable
- Decision: ADR-005 (routes minimal, logic in features/)

**Risk if violated:** MEDIUM (harder to test, harder to maintain, violates ADR)

**What to check:** Routes in `app/` should only import from `features/`, no direct Supabase/logic

### Client Selection: 3 Types (Project-Specific)

**Why 3 clients:**
- Public forms: unauthenticated users → `createAnonClient()`
- CMS client components: authenticated, browser → `createClient()` (no await)
- Server Actions/Components: authenticated, server → `await createClient()`

**Phase 2 mistake:** Used `createClient()` in public survey form → auth errors (user not logged in)

**Risk if wrong:** HIGH (auth errors, permission failures, crashes)

### RLS Infinite Recursion

**Why this matters:**
- Phase 1: Added `SELECT tenant_id FROM users WHERE id = auth.uid()` in RLS policy
- Result: Infinite loop → PostgreSQL stack overflow → database crashed
- Fix: Helper function with `SECURITY DEFINER` (runs with elevated privileges, no recursion)

**Risk if violated:** CRITICAL (database crashes, production outage)

**Check:** RLS policies should NOT have subqueries (use helper functions instead)

## Critical Patterns

### Business Logic Validation

**Check: Does code match plan requirements?**

```yaml
Plan requirement:
  "Survey links should expire after 7 days"

Code check:
  ✅ expires_at field set on link creation
  ✅ Validation checks current date vs expires_at
  ✅ Error message shown if expired
  ❌ Missing: Can't extend expiration (not in plan)

Result: Matches plan ✅
```

**Why important:** Code might work but not meet requirements

### Common Bug Patterns (Phase 2)

**Problem/Fix format:**

```typescript
// ❌ PROBLEM: Checkbox with register
<input type="checkbox" {...register('field')} />
// IMPACT: Stores only last value (not array)
// ✅ FIX: Use Controller

// ❌ PROBLEM: Missing revalidatePath
export async function updateSurvey(id: string, data: any) {
  await supabase.from('surveys').update(data).eq('id', id)
  return { success: true }
}
// IMPACT: Stale cache, UI shows old data
// ✅ FIX: Add revalidatePath('/admin/surveys')

// ❌ PROBLEM: Throwing errors in Server Actions
export async function createSurvey(data: any) {
  if (error) throw new Error('Failed')
}
// IMPACT: Crashes middleware
// ✅ FIX: Return { success: false, error: 'Failed' }

// ❌ PROBLEM: Browser client in Server Action
'use server'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
// IMPACT: Wrong context, auth fails
// ✅ FIX: Use '@/lib/supabase/server' + await createClient()
```


## Quick Reference

**Validation checklist:**

```yaml
Plan Alignment:
  - [ ] All requirements implemented
  - [ ] No extra features
  - [ ] Edge cases handled

Common Bugs (Phase 2):
  - [ ] Controller for checkboxes (not register)
  - [ ] revalidatePath in actions
  - [ ] Structured returns (not throws)
  - [ ] Correct Supabase client

Architecture:
  - [ ] Routes minimal (ADR-005)
  - [ ] All UI states (loading, error, empty, success)
  - [ ] Types explicit
  - [ ] No RLS subqueries

Completeness:
  - [ ] All files created
  - [ ] Imports correct
  - [ ] No TODOs
```

## Real Project Validation

**Phase 2 Survey - Pre-Testing Check:**

```yaml
Plan Alignment:
  ✅ Expired links validated
  ✅ Max submissions enforced
  ✅ 7 question types supported
  ⚠️ Empty questions array (plan unclear, should clarify)

Common Bugs:
  ✅ Controller for checkboxes
  ✅ revalidatePath in actions
  ✅ Structured returns
  ✅ Correct clients

Code Quality:
  ✅ All UI states
  ✅ ADR-005 compliant
  ✅ Error handling
  ⚠️ Some inferred types (should be explicit)

Completeness:
  ✅ All files created
  ✅ Imports correct
  ✅ No TODOs

Result: Ready for manual testing (2 minor issues noted)
```

