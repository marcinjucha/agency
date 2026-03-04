---
name: development-workflow
description: Use when making testing decisions (3-Question Rule), validating implementations before testing, severity classification (P0/P1/P2), updating PROJECT_SPEC.yaml, or checking common Phase 2 bugs. Quality practices and documentation patterns.
---

# Development Workflow

## Testing: 3-Question Rule

**Before writing ANY test, ask:**

1. Does test verify **business outcome** (not implementation)?
2. Would lack of test increase **production risk**?
3. Is logic **non-trivial** (>3 conditions OR caused bugs before)?

**If ANY answer is NO → Skip the test. Don't test obvious code.**

---

## Severity Classification: P0/P1/P2

```yaml
P0 (Critical): Feature broken, data loss, crashes
P1 (Important): Partial breakage, major UX degradation
P2 (Minor): Cosmetic, rare edge case
```

**Severity decision:** Blocks core functionality? → P0. Significantly degrades UX? → P1. Cosmetic or rare? → P2.

---

## Common Phase 2 Bugs Checklist

```typescript
// ❌ Checkbox + register (stores only last value, not array)
<input type="checkbox" {...register('field')} />
// ✅ FIX: Use Controller

// ❌ Missing revalidatePath after mutation → stale cache, UI shows old data
await supabase.from('surveys').update(data).eq('id', id)
// ✅ FIX: Add revalidatePath('/admin/surveys')

// ❌ Throwing in Server Actions → crashes middleware
if (error) throw new Error('Failed')
// ✅ FIX: Return { success: false, error: 'Failed' }

// ❌ Browser client in Server Action → auth fails
'use server'
import { createClient } from '@/lib/supabase/client' // WRONG
// ✅ FIX: '@/lib/supabase/server' + await createClient()
```

---

## Architecture Compliance Checks

### ADR-005: Routes Minimal, Logic in Features

Routes in `app/` should only import from `features/`, no direct Supabase/logic.

**Why:** Phase 1 had Supabase queries in routes → couldn't unit test without spinning up server. Refactored to `features/` → testable, reusable.

**Risk if violated:** MEDIUM (harder to test, violates ADR)

### Client Selection (3 Clients)

- Server Components / Server Actions: `await createClient()` from `@/lib/supabase/server`
- Client Components / Query functions: `createClient()` (no await) from `@/lib/supabase/client`
- Public submissions (website): `createAnonClient()` from `@/lib/supabase/anon-server` — service role, bypasses RLS, safe for INSERT-only public endpoints where `tenant_id` is sourced from DB

**Phase 2 mistake:** Used wrong client in public survey form → auth errors. Risk: HIGH.

### RLS: No Subqueries

RLS policies must NOT have subqueries querying the same table they protect. Use helper functions with `SECURITY DEFINER` instead.

**Why:** Phase 1: subquery in RLS → infinite loop → PostgreSQL stack overflow → database crashed. Risk: CRITICAL.

---

## Foundation Execution Order

```yaml
Parallel: types.ts, validation.ts  (no dependencies between them)
Sequential: queries.ts             (needs types)
Parallel: components, actions      (after queries)
Sequential: routes                 (imports components, last)
```

**Why this order:** queries.ts imports types → must wait. Components and actions have no dependency on each other → parallelize.

---

## Performance Priority

Fix critical issues first, skip micro-optimizations.

### P0 - Production Blockers (70% of time)
- N+1 queries: avoid separate queries per item, use joins
- `SELECT *`: select only needed fields
- Missing TanStack Query cache: use in CMS app for deduplication

### P1 - Engineering Quality (20% of time)
- Unnecessary re-renders
- Client-side data fetching (should be RSC)
- Missing error boundaries

### P2 - Skip (10% or less)
- Minor bundle size, image format, cold path improvements

---

## Shared Package Decision

**Create shared package when:** used by 2+ apps NOW (CMS + Website).

**Keep in app when:** single app usage, feature-specific logic, not yet reused.

**Why:** Speculative sharing adds maintenance cost without benefit. Wait for second concrete use.

---

## Code Review Checklist

### P0 - Must Fix (Blocks Merge)

- [ ] Features in `features/` folder (ADR-005)?
- [ ] Server Actions use server client (`await createClient()`)?
- [ ] Queries use correct client (browser vs anon)?
- [ ] `'use server'` / `'use client'` directives correct?
- [ ] `revalidatePath()` after mutations?
- [ ] No N+1 queries, no `SELECT *`?
- [ ] RLS policies: no subqueries?
- [ ] No service role key in client code?

**Any P0 failed → Request changes**

### P1 - Should Fix (Comment)

- [ ] Tests follow 3-Question Rule?
- [ ] Error states and loading states handled?
- [ ] Comments explain WHY (not WHAT)?

**All P0 passed → Approve (comment on P1)**

---

## PROJECT_SPEC.yaml Updates

On task completion, update:
- `status`: `done`
- `acceptance_criteria[].verified`: `true`
- `completion_notes`: outcome summary (what user can do now, not which files changed)

**Signal vs Noise in docs:**
- SIGNAL: outcomes (what user can do now), status changes
- NOISE: implementation details (Controller vs register), file-level changes

**Why:** Docs are for stakeholders, not developers.

---

## Notion Sync After Completion

- Status value: `"Done"` (case-sensitive — "done" does not work)
- Property names: exact match required
- Add completion comment with outcome summary

---

## Validation Checklist (Before Manual Testing)

```yaml
Plan Alignment:
  - [ ] All requirements implemented
  - [ ] Edge cases handled

Common Bugs (Phase 2):
  - [ ] Controller for checkboxes (not register)
  - [ ] revalidatePath in actions
  - [ ] Structured returns (not throws)
  - [ ] Correct Supabase client

Architecture:
  - [ ] Routes minimal (ADR-005)
  - [ ] All UI states (loading, error, empty, success)
  - [ ] No RLS subqueries

Completeness:
  - [ ] All files created
  - [ ] No TODOs
```
