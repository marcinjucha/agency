---
name: code-patterns
description: Application code patterns for AI Agency Next.js apps. Use when writing Server Actions, queries, components, or organizing features.
---

# Code Patterns

## Purpose

Application-level patterns for AI Agency Next.js applications.

---

## Server Action Pattern

**Rule: Structured return + revalidatePath**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actionName(
  input: InputType
): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()
    // 1. Validate, 2. Execute, 3. Revalidate
    revalidatePath('/path/to/revalidate')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'User-friendly message' }
  }
}
```

**Critical Rules:**
- ✅ `await createClient()` (server client)
- ✅ Structured return (no throws)
- ✅ `revalidatePath()` after mutations

**Why:** Throwing crashes middleware, missing revalidatePath causes stale cache.

See: [@resources/server-actions.md](./resources/server-actions.md) for complete examples.

---

## ADR-005: app/ vs features/

**Rule:** `app/` = routing only, `features/` = business logic.

```
apps/cms/
├── app/admin/surveys/
│   └── page.tsx              # 10 lines - imports component
│
└── features/surveys/
    ├── components/
    │   └── SurveyList.tsx    # 80 lines - component logic
    ├── actions.ts            # Server Actions
    ├── queries.ts            # Data fetching
    └── types.ts              # TypeScript types
```

**Route Page Pattern:**
```typescript
// apps/cms/app/admin/surveys/page.tsx
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return (
    <div>
      <h1>Surveys</h1>
      <SurveyList />
    </div>
  )
}
```

**Why:** Separates routing from logic, enables code reuse, cleaner architecture.

---

## Type Safety Pattern

**Pattern: Raw type + transform for nested relations**

```typescript
// 1. Raw Supabase type
type SupabaseRow = Tables<'responses'> & {
  survey_links: (Tables<'survey_links'> & {
    surveys: Tables<'surveys'>
  }) | null
}

// 2. Transform with explicit return type
function transform(data: SupabaseRow): ResponseListItem {
  return {
    id: data.id,
    title: data.survey_links?.surveys?.title || 'Unknown'
  }
}

// 3. Single cast + map
export async function getResponses(): Promise<ResponseListItem[]> {
  const { data, error } = await supabase.from('responses').select('...')
  if (error) throw error
  return (data as SupabaseRow[] || []).map(transform)
}
```

**Why:** Supabase returns generic JSON for nested relations. Cast once, transform with type safety.

See: [@resources/type-safety.md](./resources/type-safety.md) for when casting is justified.

---

## TanStack Query Rules (CMS Only)

**Used in:** CMS app only (frequent data fetching, caching needed)
**NOT used in:** Website app (one-time submission, no caching)

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],  // Cache key
    queryFn: getSurveys,    // Query function reference
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!surveys?.length) return <EmptyState />

  return surveys.map(survey => <SurveyCard key={survey.id} survey={survey} />)
}
```

**Key Rules:**
- ✅ Always handle: loading, error, empty, success states
- ✅ `queryFn` is a reference (no call)
- ✅ Use `queryKey` for cache management
- ✅ Query functions throw errors (TanStack catches them)

---

## Query Function Pattern

```typescript
import { createClient } from '@/lib/supabase/client'  // Browser client
import type { Tables } from '@agency/database'

export async function getThings(): Promise<Tables<'things'>[]> {
  const supabase = createClient()  // NO await (browser client)

  const { data, error } = await supabase
    .from('things')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error  // TanStack catches
  return data || []
}
```

---

## Quick Reference

| Task | File Location | Pattern |
|------|---------------|---------|
| Create/Update/Delete | `features/{feature}/actions.ts` | Server Action |
| Fetch data (CMS) | `features/{feature}/queries.ts` | Query + TanStack |
| Fetch data (Website) | `features/{feature}/queries.ts` | Query + useState |
| Form validation | `packages/validators/` | Zod schema |
| Route page | `app/{route}/page.tsx` | Minimal (import component) |
| Component | `features/{feature}/components/` | React component |
| Shared types | `packages/shared-types/` | Cross-app domain objects |
