# Legal-Mind: Code Patterns & Examples

> **Purpose:** Concrete examples of how to write code in this project
> **For:** AI assistants and developers implementing features
> **Last Updated:** 2025-12-10

---

## 📚 Table of Contents

1. [RLS Policy Pitfalls (CRITICAL)](#1-rls-policy-pitfalls-critical)
2. [Supabase Clients](#2-supabase-clients)
3. [Server Actions (Mutations)](#3-server-actions-mutations)
4. [Queries (Data Fetching)](#4-queries-data-fetching)
5. [Components with TanStack Query](#5-components-with-tanstack-query)
6. [Components without TanStack Query](#6-components-without-tanstack-query)
7. [Types (Auto-generated)](#7-types-auto-generated)
8. [Validation (Zod)](#8-validation-zod)
9. [File Organization (ADR-005)](#9-file-organization-adr-005)

---

## 1. RLS Policy Pitfalls (CRITICAL)

### ⚠️ Never Use Subqueries in RLS Policies

**Phase 2 Bug:** RLS policy with subquery caused infinite recursion.

```sql
-- ❌ WRONG: Infinite recursion
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT TO anon
  USING (
    id IN (SELECT survey_id FROM survey_links WHERE is_active = true)
  );
```

**Error:** `infinite recursion detected in policy for relation "surveys"`

**Why:** Anon queries surveys → RLS checks survey_links → Database recursion loop

### ✅ Solution: UUID Obscurity + Split Queries

**No RLS policy needed on surveys:**
```sql
-- ✅ CORRECT: Drop the problematic policy
DROP POLICY IF EXISTS "Public can view surveys via active links" ON surveys;

-- Security: UUIDs are only exposed through survey_links
-- Anon can read surveys IF they know the UUID
```

**Split queries in application code:**
```typescript
// Step 1: Fetch survey_links (has anon RLS policy)
const { data: link } = await supabase
  .from('survey_links')
  .select('*')
  .eq('token', token)
  .single()

// Step 2: Validate link (expired, inactive, max_submissions)
if (!link.is_active) return { error: 'inactive' }

// Step 3: Fetch survey separately (no RLS recursion)
const { data: survey } = await supabase
  .from('surveys')
  .select('*')
  .eq('id', link.survey_id)
  .single()
```

### Testing RLS Policies

**Always test before pushing:**
```sql
-- Test as anon user
SET ROLE anon;
SELECT * FROM surveys WHERE id = 'test-uuid-here';
RESET ROLE;

-- If you see recursion error → fix policy before migration
```

---

## 2. Supabase Clients

### ⚠️ Most Common Mistake: Using Wrong Client

**Rule:**
- **Server Component / Server Action** → `@/lib/supabase/server` (async)
- **Client Component / Browser** → `@/lib/supabase/client` (sync)

### Server Client (for Server Components & Actions)

**File:** `apps/cms/lib/supabase/server.ts` (lines 5-37)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@legal-mind/database'

// ✅ ASYNC function - returns Promise
export async function createClient() {
  const cookieStore = await cookies()  // ← Next.js 15 requires await

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Handle cookie setting
        }
      }
    }
  )
}
```

**Usage:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function myServerAction() {
  const supabase = await createClient()  // ← AWAIT required
  const { data } = await supabase.from('surveys').select('*')
  return data
}
```

### Browser Client (for Client Components)

**File:** `apps/cms/lib/supabase/client.ts` (lines 4-13)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@legal-mind/database'

// ✅ SYNC function - returns client directly
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**Usage:**
```typescript
import { createClient } from '@/lib/supabase/client'

export async function getSurveys() {
  const supabase = createClient()  // ← NO await
  const { data } = await supabase.from('surveys').select('*')
  return data
}
```

### When to Use Which?

| Context | Client | Import From | Async? |
|---------|--------|-------------|--------|
| Server Component | Server | `@/lib/supabase/server` | ✅ Yes (`await`) |
| Server Action (`'use server'`) | Server | `@/lib/supabase/server` | ✅ Yes (`await`) |
| Client Component (`'use client'`) | Browser | `@/lib/supabase/client` | ❌ No |
| Query function (called from browser) | Browser | `@/lib/supabase/client` | ❌ No |

---

## 3. Server Actions (Mutations)

**When:** Creating, updating, deleting data

**File Pattern:** `features/{feature}/actions.ts`

### Example: Create Survey

**File:** `apps/cms/features/surveys/actions.ts` (lines 11-66)

```typescript
'use server'  // ← MUST be first line

import { createClient } from '@/lib/supabase/server'  // ← Server client
import { revalidatePath } from 'next/cache'
import type { Tables, TablesInsert } from '@legal-mind/database'

/**
 * Create a new survey
 * Automatically assigns current user's tenant_id
 */
export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()  // ← AWAIT required

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get user's tenant_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return { success: false, error: 'User not found in database' }
    }

    // Type assertion for Supabase inference
    const userWithTenant = userData as Pick<Tables<'users'>, 'tenant_id'>

    // Create survey
    const surveyData: TablesInsert<'surveys'> = {
      title: formData.title,
      description: formData.description || null,
      tenant_id: userWithTenant.tenant_id,
      created_by: user.id,
      questions: [],
      status: 'draft',
    }

    const { data: survey, error: insertError } = await supabase
      .from('surveys')
      .insert(surveyData as any)  // ← Type assertion for Supabase
      .select()
      .single()

    if (insertError || !survey) {
      return { success: false, error: insertError?.message || 'Failed to create survey' }
    }

    // ✅ Revalidate path to bust Next.js cache
    revalidatePath('/admin/surveys')

    return { success: true, surveyId: (survey as Tables<'surveys'>).id }
  } catch (error) {
    // ✅ Catch-all error handler
    return { success: false, error: 'Failed to create survey' }
  }
}
```

### Example: Update Survey

**File:** `apps/cms/features/surveys/actions.ts` (lines 71-91)

```typescript
'use server'

export async function updateSurvey(
  id: string,
  data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'status' | 'questions'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // @ts-expect-error - Supabase type inference issue with Server Actions
    const { error } = await supabase.from('surveys').update(data).eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    // ✅ Revalidate multiple paths
    revalidatePath('/admin/surveys')
    revalidatePath(`/admin/surveys/${id}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update survey' }
  }
}
```

### Pattern Summary

**Structure:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'  // ← Server
import { revalidatePath } from 'next/cache'

export async function actionName(
  input: InputType
): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()  // ← AWAIT

    // 1. Validate auth (if needed)
    // 2. Validate input
    // 3. Database operation
    // 4. Revalidate cache
    // 5. Return result

    revalidatePath('/path/to/revalidate')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'User-friendly message' }
  }
}
```

**Key Points:**
- ✅ Always `'use server'` as first line
- ✅ Use server client with `await createClient()`
- ✅ Return structured result `{ success, data?, error? }`
- ✅ Always `revalidatePath()` after mutations
- ✅ Try-catch for error handling
- ✅ User-friendly error messages (don't expose internals)

---

## 4. Queries (Data Fetching)

**When:** Reading data from database

**File Pattern:** `features/{feature}/queries.ts`

### Example: Get All Surveys

**File:** `apps/cms/features/surveys/queries.ts` (lines 8-18)

```typescript
import { createClient } from '@/lib/supabase/client'  // ← Browser client
import type { Tables } from '@legal-mind/database'

/**
 * Fetch all surveys for the current user's tenant
 * Type-safe query with full TypeScript autocomplete
 */
export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()  // ← NO await (browser client)

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error  // ← Throw for TanStack Query to catch
  return data || []
}
```

### Example: Get Single Survey

**File:** `apps/cms/features/surveys/queries.ts` (lines 24-37)

```typescript
/**
 * Fetch a single survey
 * Returns full survey data
 */
export async function getSurvey(id: string): Promise<Tables<'surveys'>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()  // ← Returns null if not found

  if (error) throw error
  if (!data) throw new Error('Survey not found')  // ← Explicit error

  return data
}
```

### Example: Get Survey with Join

**File:** `apps/cms/features/surveys/queries.ts` (lines 77-88)

```typescript
/**
 * Fetch all links for a specific survey
 * Returns links ordered by creation date (newest first)
 */
export async function getSurveyLinks(surveyId: string): Promise<Tables<'survey_links'>[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('survey_links')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
```

### Pattern Summary

**Structure:**
```typescript
import { createClient } from '@/lib/supabase/client'  // ← Browser
import type { Tables } from '@legal-mind/database'

export async function getThings(): Promise<Tables<'things'>[]> {
  const supabase = createClient()  // ← NO await

  const { data, error } = await supabase
    .from('things')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error  // ← Throw for error handling
  return data || []       // ← Return empty array if null
}

export async function getThing(id: string): Promise<Tables<'things'>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('things')
    .select('*')
    .eq('id', id)
    .maybeSingle()  // ← Use maybeSingle for unique queries

  if (error) throw error
  if (!data) throw new Error('Thing not found')

  return data
}
```

**Key Points:**
- ✅ Use browser client (NO await on createClient)
- ✅ Explicit return types `Promise<Tables<'table'>>`
- ✅ Throw errors (TanStack Query catches them)
- ✅ Return empty array `[]` instead of null
- ✅ Use `.maybeSingle()` for single row queries
- ✅ Check `if (!data)` after maybeSingle

---

## 5. Components with TanStack Query

**When:** CMS app, frequent data fetching, caching needed

**File Pattern:** `features/{feature}/components/ComponentName.tsx`

### Example: Survey List

**File:** `apps/cms/features/surveys/components/SurveyList.tsx` (lines 9-83)

```typescript
'use client'  // ← Required for hooks

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'  // ← Import query function
import { Button, Card } from '@legal-mind/ui'
import Link from 'next/link'

export function SurveyList() {
  // ✅ TanStack Query hook
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],        // ← Cache key
    queryFn: getSurveys,          // ← Query function
  })

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading surveys...</p>
      </div>
    )
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading surveys: {error.message}
      </div>
    )
  }

  // ✅ Empty state
  if (!surveys || surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-semibold text-gray-900">No surveys</h3>
        <p className="text-sm text-gray-500">Get started by creating a new survey.</p>
        <Link href="/admin/surveys/new">
          <Button>Create Survey</Button>
        </Link>
      </div>
    )
  }

  // ✅ Data rendering
  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <Card key={survey.id} className="p-6">
          <Link href={`/admin/surveys/${survey.id}`}>
            <h3 className="text-lg font-semibold">{survey.title}</h3>
            {survey.description && (
              <p className="text-sm text-gray-600">{survey.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>
                {Array.isArray(survey.questions) ? survey.questions.length : 0} questions
              </span>
              <span className="px-2 py-1 rounded-full text-xs">
                {survey.status}
              </span>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  )
}
```

### Pattern Summary

**Structure:**
```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { getThings } from '../queries'

export function ThingList() {
  const { data: things, isLoading, error } = useQuery({
    queryKey: ['things'],
    queryFn: getThings,
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!things || things.length === 0) return <EmptyState />

  return (
    <div>
      {things.map(thing => (
        <div key={thing.id}>{thing.name}</div>
      ))}
    </div>
  )
}
```

**Key Points:**
- ✅ Always `'use client'` directive
- ✅ Import query function (don't inline)
- ✅ Destructure `{ data, isLoading, error }`
- ✅ Handle all states: loading, error, empty, success
- ✅ Use `queryKey` for cache management
- ✅ `queryFn` is just a reference (no call)

---

## 6. Components without TanStack Query

**When:** Website app, one-time submission, no caching needed

**File Pattern:** `features/{feature}/components/ComponentName.tsx`

### Example: Survey Form (React Hook Form)

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitSurveyResponse } from '../actions'
import { generateSurveySchema } from '../validation'
import type { SurveyAnswers } from '../types'

type SurveyFormProps = {
  surveyId: string
  questions: Question[]
}

export function SurveyForm({ surveyId, questions }: SurveyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()

  // ✅ Dynamic Zod schema
  const schema = generateSurveySchema(questions)

  // ✅ React Hook Form with Zod resolver
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SurveyAnswers>({
    resolver: zodResolver(schema),
    mode: 'onBlur'  // ← Validate on blur for better UX
  })

  const onSubmit = async (data: SurveyAnswers) => {
    setIsSubmitting(true)
    setSubmitError(null)

    // ✅ Call Server Action
    const result = await submitSurveyResponse({
      surveyId,
      answers: data
    })

    if (result.success) {
      router.push(`/survey/success`)
    } else {
      setSubmitError(result.error || 'Failed to submit')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {questions.map((question) => (
        <div key={question.id}>
          <label>{question.label}</label>
          <input {...register(question.id)} />
          {errors[question.id] && (
            <span className="text-red-500">
              {errors[question.id]?.message}
            </span>
          )}
        </div>
      ))}

      {submitError && (
        <div className="text-red-500">{submitError}</div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

**Key Points:**
- ✅ Use `useState` for local state (loading, error)
- ✅ Use `useRouter` for navigation
- ✅ Call Server Actions directly (no TanStack Query)
- ✅ Handle loading/error states manually
- ✅ React Hook Form for form management
- ✅ Zod for validation

---

## 7. Types (Auto-generated)

**NEVER manually edit** `packages/database/src/types.ts`!

### Regenerate Types

```bash
npm run db:types
# → supabase gen types typescript --linked > packages/database/src/types.ts
```

### Usage: SELECT Query Result

```typescript
import type { Tables } from '@legal-mind/database'

// ✅ Type for SELECT result
type Survey = Tables<'surveys'>

function processSurvey(survey: Survey) {
  console.log(survey.id)          // ← Autocomplete works
  console.log(survey.title)       // ← Type-safe
  console.log(survey.tenant_id)   // ← All columns typed
}
```

### Usage: INSERT Data

```typescript
import type { TablesInsert } from '@legal-mind/database'

// ✅ Type for INSERT data
const newSurvey: TablesInsert<'surveys'> = {
  title: 'My Survey',
  description: 'Test',
  tenant_id: 'uuid-here',
  created_by: 'uuid-here',
  questions: [],
  status: 'draft',
  // id, created_at, updated_at are optional (auto-generated)
}
```

### Usage: UPDATE Data

```typescript
import type { Tables } from '@legal-mind/database'

// ✅ Partial update
const updates: Partial<Pick<Tables<'surveys'>, 'title' | 'status'>> = {
  title: 'New Title',
  status: 'active'
}
```

**Key Points:**
- ✅ Always use `Tables<'table_name'>` for SELECT
- ✅ Use `TablesInsert<'table_name'>` for INSERT
- ✅ Use `Partial<Pick<...>>` for UPDATE
- ✅ Run `npm run db:types` after schema changes

---

## 8. Validation (Zod)

**File Pattern:** `packages/validators/src/{feature}.ts`

### Example: Survey Schema

**File:** `packages/validators/src/survey.ts`

```typescript
import { z } from 'zod'

// ✅ Schema for survey structure
export const surveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['text', 'textarea', 'email', 'tel', 'select', 'radio', 'checkbox']),
      label: z.string().min(1),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })
  ),
})

// ✅ Infer TypeScript type from schema
export type Survey = z.infer<typeof surveySchema>
```

### Dynamic Schema Generation

```typescript
import { z } from 'zod'
import type { Question } from './types'

// ✅ Generate schema based on questions
export function generateSurveySchema(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  questions.forEach((question) => {
    let fieldSchema: z.ZodTypeAny

    switch (question.type) {
      case 'email':
        fieldSchema = z.string().email('Invalid email')
        break
      case 'tel':
        fieldSchema = z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone')
        break
      case 'checkbox':
        fieldSchema = z.array(z.string()).min(1, 'Select at least one')
        break
      default:
        fieldSchema = z.string().min(1, 'Required')
    }

    if (!question.required) {
      fieldSchema = fieldSchema.optional()
    }

    shape[question.id] = fieldSchema
  })

  return z.object(shape)
}
```

**Key Points:**
- ✅ Shared schemas in `packages/validators/`
- ✅ Use `.min()`, `.max()`, `.regex()` for validation
- ✅ Use `z.infer<typeof schema>` for types
- ✅ Custom error messages for user-friendly feedback

---

## 9. File Organization (ADR-005)

### Rule: app/ = Routing, features/ = Logic

**Bad (all in app/):**
```
❌ apps/cms/app/admin/surveys/page.tsx
   - 200 lines of code
   - Fetching, state, rendering all mixed
```

**Good (separated):**
```
✅ apps/cms/app/admin/surveys/page.tsx
   - 10 lines (just import and layout)

✅ apps/cms/features/surveys/components/SurveyList.tsx
   - 80 lines (component logic)

✅ apps/cms/features/surveys/queries.ts
   - 40 lines (data fetching)

✅ apps/cms/features/surveys/actions.ts
   - 70 lines (mutations)
```

### Feature Structure

```
apps/cms/features/surveys/
├── components/
│   ├── SurveyList.tsx          # List view
│   ├── SurveyBuilder.tsx       # Edit form
│   └── SurveyLinks.tsx         # Link management
├── actions.ts                   # Server Actions (create, update, delete)
├── queries.ts                   # Data fetching (get, getAll)
├── types.ts                     # TypeScript types (optional)
└── validations.ts               # Zod schemas (optional)
```

### Route Structure

```
apps/cms/app/admin/surveys/
├── page.tsx                     # List page (imports SurveyList)
├── new/
│   └── page.tsx                 # Create page (imports CreateForm)
└── [id]/
    └── page.tsx                 # Edit page (imports SurveyBuilder)
```

**Example Route:**

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

**Key Points:**
- ✅ `app/` folder = routing ONLY (minimal code)
- ✅ `features/` folder = business logic
- ✅ Group by feature, not by type
- ✅ Components, actions, queries in same feature folder

---

## 🎯 Quick Reference

### When to Use What

| Task | Pattern | File |
|------|---------|------|
| Create/Update/Delete | Server Action | `features/{feature}/actions.ts` |
| Fetch data (CMS) | Query + TanStack Query | `features/{feature}/queries.ts` + component |
| Fetch data (Website) | Query + useState | `features/{feature}/queries.ts` + component |
| Form validation | Zod + React Hook Form | `packages/validators/` + component |
| Display data (CMS) | TanStack Query component | `features/{feature}/components/` |
| Display data (Website) | useState component | `features/{feature}/components/` |
| Database types | Auto-generated | `packages/database/src/types.ts` |
| Routing | Minimal page | `app/{route}/page.tsx` |

### Common Imports

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
import { getThings } from '../queries'

// Components (Website)
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

// Validation
import { z } from 'zod'
```

---

## 📝 Checklist Before Writing Code

- [ ] Determined if Server Component or Client Component
- [ ] Chose correct Supabase client (server vs browser)
- [ ] Followed ADR-005 (logic in features/, routing in app/)
- [ ] Used explicit TypeScript types
- [ ] Added error handling (try-catch, throw, or states)
- [ ] Revalidated paths after mutations
- [ ] Handled all states (loading, error, empty, success)

---

**Next Steps:** Use these patterns when implementing Phase 2!

See [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) for what to build next.
