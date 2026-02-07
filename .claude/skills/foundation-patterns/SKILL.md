---
name: foundation-patterns
description: Use when creating foundational TypeScript files - types, queries, validation. Critical patterns - Browser vs Server client selection (context-dependent), shared types strategy (start local, move if needed), dynamic Zod schemas. Real pitfalls from Phase 2.
---

# Foundation Patterns - Types, Queries, Validation

## Purpose

Foundation file patterns: types.ts (domain types), queries.ts (data fetching), validation.ts (Zod schemas). Critical decisions: Browser vs Server client, shared types strategy.

## When to Use

- Creating types.ts, queries.ts, validation.ts
- Browser vs Server client confusion
- Types needed by multiple apps (shared types decision)
- Dynamic validation (Zod schema from data)

## Critical Patterns

### Browser vs Server Client Decision

**Key differences:**

| Client | Await? | Context | App |
|--------|--------|---------|-----|
| Browser | NO | TanStack Query | CMS |
| Server | YES | Server Components | Website |

**Decision:** Client Component (useQuery)? → Browser. Server Component (page.tsx)? → Server.

**Why matters:** Wrong client = auth errors

### Shared Types Strategy

**Real bug from Phase 2:**

CMS used `{ label: string }`, Website used `{ question: string }`
→ Result: Forms rendered without labels (P0 bug)

**Pattern: Start Local, Move if Shared**

```typescript
// Step 1: Start local
// apps/cms/features/surveys/types.ts
export type Question = {
  id: string
  label: string  // CMS name
}

// apps/website/features/survey/types.ts
export type Question = {
  id: string
  question: string  // Website name - MISMATCH!
}

// Step 2: Discover mismatch (during integration)
// Step 3: Move to shared package

// packages/shared-types/src/survey.ts
export type Question = {
  id: string
  question: string  // ONE name, used by both apps
  type: string
  required: boolean
  options?: string[]
}

// Step 4: Update imports
// Both apps now: import { Question } from '@agency/shared-types'
```

**Why start local:** Move when actually shared (YAGNI)

### Dynamic Zod Schemas

**Use case:** Validation rules depend on data (survey questions from database)

**Why dynamic:** Survey questions change per survey → static schema impossible

**Pattern:** Loop questions, build `Record<string, z.ZodTypeAny>`, return `z.object(shape)`

## Quick Reference

**Browser vs Server client:**

| Context | Import | Await? | Used In |
|---------|--------|--------|---------|
| Browser | `@/lib/supabase/client` | NO | TanStack Query (CMS) |
| Server | `@/lib/supabase/server` | YES | Server Components (Website) |

**Shared types strategy:**
1. Start: `features/{feature}/types.ts` (local)
2. If shared: Move to `packages/shared-types/src/{domain}.ts`
3. Update imports in both apps

**Checklist:**
- [ ] Correct client (Browser for CMS, Server for Website)
- [ ] Explicit return types (TanStack Query needs them)
- [ ] Throw errors in queries (not return them)
- [ ] Shared types if used by multiple apps

## Real Bugs Fixed

**Phase 2:**
- Bug: CMS `label`, Website `question` → field name mismatch
- Fix: Moved to shared-types with single name
- Impact: Forms render correctly in both apps

---

**Key Lesson:** Browser vs Server client depends on context. Start types local, move if shared.
