---
name: code-patterns
description: Application code patterns for Legal-Mind Next.js apps. Use when writing Server Actions, queries, components, or organizing features.
---

# Code Patterns

**Purpose:** Application-level patterns for Legal-Mind Next.js applications.

---

## Server Action Return Type Pattern

**Always return structured result:**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actionName(
  input: InputType
): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()

    // 1. Validate auth (if needed)
    // 2. Validate input
    // 3. Database operation
    // 4. Revalidate cache

    revalidatePath('/path/to/revalidate')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'User-friendly message' }
  }
}
```

**Key Rules:**
- ✅ Always `'use server'` as first line
- ✅ Use server client with `await createClient()`
- ✅ Return `{ success, data?, error? }` structure
- ✅ Always `revalidatePath()` after mutations
- ✅ User-friendly error messages (don't expose internals)

See: [server-actions.md](./server-actions.md) for complete examples.

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

**Problem:** Supabase returns generic JSON types for nested relations.

**Solution:** Define raw types + transform function.

```typescript
// 1. Define raw Supabase structure
type SupabaseRow = Tables<'responses'> & {
  survey_links: (Tables<'survey_links'> & {
    surveys: Tables<'surveys'>
  }) | null
}

// 2. Create transform function with explicit return type
function transform(data: SupabaseRow): ResponseListItem {
  return {
    id: data.id,
    title: data.survey_links?.surveys?.title || 'Unknown'
  }
}

// 3. Use in query with single type cast
export async function getResponses(): Promise<ResponseListItem[]> {
  const { data, error } = await supabase.from('responses').select('...')
  if (error) throw error
  return (data as SupabaseRow[] || []).map(transform)
}
```

See: [type-safety.md](./type-safety.md) for when casting is justified.

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
import type { Tables } from '@legal-mind/database'

export async function getThings(): Promise<Tables<'things'>[]> {
  const supabase = createClient()  // NO await

  const { data, error } = await supabase
    .from('things')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error  // Throw for TanStack Query
  return data || []       // Return empty array if null
}
```

---

## Anti-Patterns (Critical Mistakes)

### ❌ Field Name Mismatch Between Apps

**Problem:** CMS used `label`, Website expected `question` → forms rendered blank.

**Root cause:** No shared types between apps.

**Fix:**
```typescript
// ✅ Create shared types in packages/shared-types/
export type Question = {
  id: string
  question: string  // ← Consistent field name
  type: QuestionType
  required: boolean
  order: number     // ← Required for sorting
}
```

**Prevention:**
- ✅ Shared types for domain objects used across apps
- ✅ E2E test: create in CMS → display in Website
- ✅ Field validation in CMS before save

### ❌ Debug Logs Left in Production

**Problem:** 11 `console.log` statements left after debugging.

**Example:**
```typescript
// ❌ Found in production:
console.log('[getSurveyByToken] Looking for token:', token)
console.log('[getSurveyByToken] Link query result:', { error, linkExists })
```

**Fix:**
- ✅ Use debugger or browser DevTools
- ✅ Review code before commit
- ✅ Keep only `console.error` in Server Actions

### ❌ Missing order Field

**Problem:** Website needed `order` to sort questions, CMS didn't generate it.

**Fix:**
```typescript
// CMS: Generate order when adding questions
const newQuestion: Question = {
  id: crypto.randomUUID(),
  type: 'text',
  question: 'New Question',
  required: false,
  order: questions.length  // ← Added
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

---

## Common Imports

```typescript
// Server Actions
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TablesInsert } from '@legal-mind/database'

// Queries (CMS)
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@legal-mind/database'

// Components (CMS)
'use client'
import { useQuery } from '@tanstack/react-query'

// Components (Website)
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
```
