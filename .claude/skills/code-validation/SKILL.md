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

**Pattern 1: Controller vs register**

```typescript
// ❌ BUG: Checkbox with register
<input type="checkbox" {...register('field')} />
// Stores only last value!

// ✅ CORRECT: Controller
<Controller name="field" control={control} ... />
```

**Pattern 2: Missing revalidatePath**

```typescript
// ❌ BUG: No revalidatePath
export async function updateSurvey(id: string, data: any) {
  await supabase.from('surveys').update(data).eq('id', id)
  return { success: true }
  // Cache stale!
}

// ✅ CORRECT: revalidatePath
export async function updateSurvey(id: string, data: any) {
  await supabase.from('surveys').update(data).eq('id', id)
  revalidatePath('/admin/surveys')  // Clear cache
  return { success: true }
}
```

**Pattern 3: Throwing errors in Server Actions**

```typescript
// ❌ BUG: Throwing crashes middleware
export async function createSurvey(data: any) {
  if (error) throw new Error('Failed')  // Crashes!
}

// ✅ CORRECT: Structured return
export async function createSurvey(data: any) {
  if (error) return { success: false, error: 'Failed' }
}
```

**Pattern 4: Wrong Supabase client**

```typescript
// ❌ BUG: Browser client in Server Action
'use server'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()  // Wrong context!

// ✅ CORRECT: Server client
'use server'
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // Correct
```

### Code Quality Checks

**Project-specific quality standards:**

```yaml
Components:
  - [ ] All 4 UI states (loading, error, empty, success)
  - [ ] Controller for checkbox arrays
  - [ ] TanStack Query CMS-only
  - [ ] Error boundaries present

Routes:
  - [ ] Minimal (just import + render)
  - [ ] ADR-005 compliant (imports from features/)
  - [ ] Async params (await params)

Server Actions:
  - [ ] Structured return { success, data?, error? }
  - [ ] revalidatePath after mutations
  - [ ] Server client (await createClient())
  - [ ] Try-catch wrapper

Foundation:
  - [ ] Explicit return types
  - [ ] Correct client (Browser/Server)
  - [ ] Shared types if needed
```

## Quick Reference

**Validation checklist:**

```yaml
Step 1: Plan Alignment
  - [ ] All requirements implemented
  - [ ] No extra features (YAGNI)
  - [ ] Edge cases handled (from plan)

Step 2: Common Bugs
  - [ ] Controller for checkboxes (not register)
  - [ ] revalidatePath in actions
  - [ ] Structured returns (not throws)
  - [ ] Correct Supabase client

Step 3: Code Quality
  - [ ] All UI states present
  - [ ] ADR-005 compliant (routes minimal)
  - [ ] Error handling graceful
  - [ ] Types explicit

Step 4: Completeness
  - [ ] All files created (types, queries, actions, components, routes)
  - [ ] Imports correct
  - [ ] No TODOs or placeholders
```

**Commands:**

```bash
# Check for common bugs
grep -r "register.*checkbox" .  # Should use Controller
grep -r "throw new Error" apps/*/features/*/actions.ts  # Should return error
grep -r "createClient()" -A 1 apps/*/features/*/actions.ts | grep -v "await"  # Should await

# Check imports
grep -r "from '@/app" apps/*/features/  # Should not import from app/

# Check types
grep -r "Promise<any>" apps/*/features/  # Should have explicit types
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

## Anti-Patterns

### ❌ Skipping Validation

**Problem:** Going straight to manual testing with broken code

```yaml
# ❌ WRONG: No pre-test validation
1. Finish coding
2. Start manual testing
3. Find bugs (checkbox broken, cache stale, errors thrown)
4. Fix bugs
5. Re-test

# ✅ CORRECT: Validate first
1. Finish coding
2. Run validation checklist
3. Fix common bugs (before testing!)
4. Manual testing (smooth)
```

**Why wrong:** Wastes testing time on preventable bugs

### ❌ Not Checking Plan Alignment

**Problem:** Code works but doesn't match requirements

```yaml
# ❌ WRONG: Code works, but...
Code: Survey never expires (no expiration check)
Plan: "Surveys should expire after 7 days"
Result: Feature incomplete!

# ✅ CORRECT: Verify against plan
Code: expires_at checked, error shown
Plan: "Surveys should expire after 7 days"
Result: Matches requirement ✅
```

**Why wrong:** Passes tests but fails requirements

---

**Key Lesson:** Validate before testing (saves time), check common bugs (Phase 2 patterns), verify plan alignment (meets requirements).
