---
name: nextjs-patterns
description: Use when creating Next.js routes, Server Actions, foundation files (types/queries/validation), or components. Critical patterns — ADR-005 app/features separation, structured Server Action returns (no throws), correct Supabase client, Next.js 15 async params.
---

# Next.js Patterns

## ADR-005: app/ vs features/ Separation

**Rule:** `app/` = routing ONLY, `features/` = business logic.

**Why:** Previous approach mixed logic in `app/` → hard to reuse, refactoring nightmare when URLs change. Logic in `features/` = reusable across routes, clear ownership.

```
apps/cms/
├── app/admin/surveys/
│   └── page.tsx              # 10 lines - imports component only
└── features/surveys/
    ├── components/SurveyList.tsx
    ├── actions.ts
    ├── queries.ts
    └── types.ts
```

**Minimal route pattern:**
```typescript
// ✅ app/admin/surveys/page.tsx
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return <SurveyList />
}
// Just imports + render. No logic, no DB queries.
```

**Route checklist (ADR-005):**
- [ ] Imports component from features/
- [ ] No database queries in route
- [ ] No business logic in route
- [ ] Async params awaited (Next.js 15)

---

## Next.js 15: Async Params

**Pattern:** `params` is a Promise in Next.js 15 — must `await`.

```typescript
// ✅
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params  // AWAIT required
}
```

---

## Server Actions

**Rule: Structured return `{ success, data?, error? }` + `revalidatePath` after every mutation.**

**Why:** Throwing errors crashes Next.js middleware (Phase 2 bug). Missing `revalidatePath` causes stale cache.

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actionName(
  input: InputType
): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()  // AWAIT required (server client)
    // 1. Validate, 2. Execute, 3. Revalidate
    revalidatePath('/path/to/revalidate')
    return { success: true, data }
  } catch {
    return { success: false, error: 'User-friendly message' }
  }
}
```

**Critical rules:**
- `await createClient()` — server client is async
- Structured return, never throw
- `revalidatePath()` after every mutation

See: `@resources/server-actions.md` for complete examples (create/update/delete, auth, tenant).

---

## Supabase Client Selection (3 Clients)

**Decision by context:**

| Context | Import | Await? | Used In |
|---------|--------|--------|---------|
| Server Actions / Server Components | `@/lib/supabase/server` | YES | mutations, SSR |
| Client Components / query functions | `@/lib/supabase/client` | NO | TanStack Query (CMS) |
| Public submissions (website) | `@/lib/supabase/anon-server` | NO | `createAnonClient()` — service role, bypasses RLS |

**Why 3rd client:** Public survey submissions have no user auth. Service role bypasses RLS — safe because INSERT-only + `tenant_id` sourced from DB (never user input).

**Why matters:** Wrong client = auth errors.

**Query function pattern (browser client):**
```typescript
import { createClient } from '@/lib/supabase/client'

export async function getThings(): Promise<Tables<'things'>[]> {
  const supabase = createClient()  // NO await
  const { data, error } = await supabase.from('things').select('*')
  if (error) throw error  // TanStack catches
  return data || []
}
```

---

## TanStack Query (CMS Only)

**Used in:** CMS (admin stays longer, caching valuable).
**NOT used in:** Website (one-time submission, Server Components only).

**Key rules:**
- Always handle loading, error, empty, success states
- `queryFn` is a reference — no call (`queryFn: getSurveys` not `queryFn: getSurveys()`)
- Query functions throw errors (TanStack catches them)

---

## Shared Types Strategy

**Real bug from Phase 2:** CMS used `{ label: string }`, Website used `{ question: string }` → forms rendered without labels (P0 bug).

**Pattern: Start local, move to `@agency/validators` if used by 2+ apps.**

```
Step 1: features/{feature}/types.ts (local)
Step 2: Discover shared need during integration
Step 3: Move to packages/validators/src/{domain}.ts
Step 4: Both apps import from @agency/validators
```

**Why start local:** YAGNI — move when actually shared, not speculatively.

---

## Dynamic Zod Schemas

**Use case:** Survey questions come from DB → static schema impossible.

**Pattern:** Loop questions, build `Record<string, z.ZodTypeAny>`, return `z.object(shape)`.

**Why dynamic:** Survey questions change per survey — schema must be built at runtime from DB data.

---

## Type Safety: Supabase Types

**Pattern: Raw Supabase type → transform function → explicit return type. Cast once at boundary.**

```typescript
// 1. Raw type matching .select() query
type SupabaseRow = Tables<'responses'> & {
  survey_links: (Tables<'survey_links'> & { surveys: Tables<'surveys'> }) | null
}

// 2. Transform with explicit return type
function transform(data: SupabaseRow): ResponseListItem {
  return { id: data.id, title: data.survey_links?.surveys?.title || 'Unknown' }
}

// 3. Single cast + map
export async function getResponses(): Promise<ResponseListItem[]> {
  const { data, error } = await supabase.from('responses').select('...')
  if (error) throw error
  return (data as SupabaseRow[] || []).map(transform)
}
```

**Why:** Supabase returns generic JSON for nested relations. Cast once at data boundary, transform with full type safety.

See: `@resources/type-safety.md` for when casting is justified and `as any` rules.

---

## Quick Reference

| Task | Location | Pattern |
|------|----------|---------|
| Route page | `app/{route}/page.tsx` | Minimal — import + render only |
| Component | `features/{feature}/components/` | React component |
| Mutations | `features/{feature}/actions.ts` | Server Action |
| Fetch data (CMS) | `features/{feature}/queries.ts` | Query + TanStack |
| Fetch data (Website) | `features/{feature}/queries.ts` | Query + Server Components |
| Validation | `packages/validators/` | Zod schema (dynamic if from DB) |
| Shared types | `packages/validators/` | Move to `@agency/validators` when 2+ apps need it |
