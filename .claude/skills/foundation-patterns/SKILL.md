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

**Context matters:**

```typescript
// CMS app - Browser client (TanStack Query)
// apps/cms/features/surveys/queries.ts
import { createClient } from '@/lib/supabase/client'  // Browser

export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()  // NO await
  const { data } = await supabase.from('surveys').select('*')
  if (error) throw error  // TanStack Query catches
  return data || []
}

// Website app - Server client (Server Components)
// apps/website/features/survey/queries.ts
import { createClient } from '@/lib/supabase/server'  // Server

export async function getSurveyByToken(token: string) {
  const supabase = await createClient()  // AWAIT required
  const { data } = await supabase.from('survey_links').select('*')
  return data
}
```

**Decision tree:**
- Called from Client Component (useQuery)? → Browser client
- Called from Server Component (page.tsx)? → Server client
- CMS app? → Usually Browser (TanStack Query)
- Website app? → Usually Server (Server Components)

**Why matters:** Wrong client = auth errors, wrong context

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
// Both apps now: import { Question } from '@legal-mind/shared-types'
```

**Why start local:**
- Don't prematurely create shared types
- Move when actually shared (YAGNI)
- Easier to refactor local types first

### Dynamic Zod Schemas

**Use case:** Validation rules depend on data (survey questions)

```typescript
// apps/website/features/survey/validation.ts
import { z } from 'zod'
import type { Question } from './types'

export function generateSurveySchema(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  questions.forEach((question) => {
    let fieldSchema: z.ZodTypeAny

    switch (question.type) {
      case 'email':
        fieldSchema = z.string().email('Valid email required')
        break
      case 'checkbox':
        fieldSchema = z.array(z.string()).min(1, 'Select at least one')
        break
      default:
        fieldSchema = z.string().min(1, 'Required')
    }

    // Optional fields
    if (!question.required) {
      fieldSchema = fieldSchema.optional()
    }

    shape[question.id] = fieldSchema
  })

  return z.object(shape)
}
```

**Why dynamic:**
- Survey questions defined in database (not hardcoded)
- Each survey has different questions → different validation
- Static schema impossible

### Explicit Return Types

```typescript
// ❌ WRONG - Inferred
export async function getSurveys() {
  // TanStack Query can't infer properly
}

// ✅ CORRECT - Explicit
export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  // Type clear for TanStack Query
}
```

**Why:** TanStack Query needs explicit types for proper inference

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
