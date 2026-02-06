# TanStack Query Case Study - Legal-Mind Real Code Analysis

Analiza rzeczywistych implementacji TanStack Query w Legal-Mind z wyjaśnieniami każdej linii.

---

## Case 1: QueryClientProvider Setup

**File:** `apps/cms/app/providers.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,       // 5 minutes
            gcTime: 1000 * 60 * 10,         // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Why useState?

```typescript
// ❌ WRONG: Creates new QueryClient on every render
const queryClient = new QueryClient()  // Recreated every time!

// ✅ CORRECT: Create once, reuse
const [queryClient] = useState(
  () => new QueryClient(...)  // Runs once on mount
)
```

### Configuration Meaning

```
staleTime: 1000 * 60 * 5
├─ 5 minutes (300 seconds)
├─ After 5 min, query marked as "stale"
├─ Data still shown (no flash)
└─ Marked for potential background refetch

Use case for Legal-Mind:
├─ Surveys don't change frequently
├─ 5 min stale time good balance
├─ User can see data immediately
├─ Background refetch if navigation triggered

gcTime: 1000 * 60 * 10
├─ 10 minutes (600 seconds)
├─ After 10 min of NO USE, cache deleted
├─ If user comes back in 5-10 min → cached data shown
├─ If user comes back after 10 min → refetch

Example lifecycle:
  T=0: User navigates to /surveys
  ├─ useQuery fetches getSurveys()
  └─ Data cached, staleTime starts

  T=5min: Data marked as stale
  ├─ But still shown to user
  └─ Background refetch IF triggered

  T=10min: Cache entry deleted
  ├─ User navigates back
  └─ Data refetched (not in cache)

retry: 1
├─ If query fails (e.g., network error)
├─ TanStack Query automatically retries once
├─ If still fails → show error to user
├─ Prevents temporary glitches breaking app

refetchOnWindowFocus: false
├─ By default: true (standard browser pattern)
├─ User tabs away (browser loses focus)
├─ User tabs back (window gets focus)
├─ TanStack Query auto-refetches all queries!
├─ Problem: Wastes bandwidth, annoying
├─ Legal-Mind disabled: Better UX
```

### Integration in Layout

```typescript
// apps/cms/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>  // ← All children use QueryClient
      </body>
    </html>
  )
}
```

---

## Case 2: SurveyList - Reading Data

**File:** `apps/cms/features/surveys/components/SurveyList.tsx`

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading surveys...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading surveys: {error.message}
      </div>
    )
  }

  if (!surveys || surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No surveys yet</p>
        <CreateSurveyButton />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {surveys.map((survey) => (
        <SurveyItem key={survey.id} survey={survey} />
      ))}
    </div>
  )
}
```

### Flow Analysis

```
1. Component mounts
   └─ useQuery({ queryKey: ['surveys'], queryFn: getSurveys })

2. TanStack Query checks:
   ├─ Is ['surveys'] in cache?
   ├─ If no: Call getSurveys() (fetch from server)
   ├─ If yes: Return cached data

3. Component state DURING fetch:
   ├─ isLoading = true
   ├─ data = undefined
   ├─ error = undefined
   └─ Returns: <p>Loading surveys...</p>

4. Server responds with data
   ├─ isLoading = false
   ├─ data = [...surveys]
   ├─ error = undefined
   └─ Returns: <SurveyList>

5. After 5 minutes (staleTime)
   ├─ Data marked as stale
   ├─ But isLoading = false (data shown)
   ├─ Background refetch if user navigates away/back
   └─ Next navigation: Fresh data fetched

6. If error occurs:
   ├─ isLoading = false
   ├─ error = Error object
   ├─ Returns: <error message>
   └─ User can retry
```

### Why Three Conditions?

```typescript
if (isLoading) // Initial load
if (error)     // Something went wrong
if (!surveys || surveys.length === 0)  // Empty state

// Why check empty AFTER error?
// Because error takes priority - user needs to know what failed
// Then if loads successfully but empty → show helpful message

Timeline:
fetch → loading → empty → (5 min) → stale → refetch → updated
```

---

## Case 3: SurveyLinks - Complex Mutations

**File:** `apps/cms/features/surveys/components/SurveyLinks.tsx`

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveyLinks, generateSurveyLink, deleteSurveyLink } from '../actions'

export function SurveyLinks({ surveyId }: { surveyId: string }) {
  const queryClient = useQueryClient()

  // ==========================================
  // QUERY: Get all links for this survey
  // ==========================================
  const { data: links, isLoading } = useQuery({
    queryKey: ['survey-links', surveyId],
    queryFn: () => getSurveyLinks(surveyId),
  })
  // Why dynamic key ['survey-links', surveyId]?
  // ├─ Different surveyId = different cache
  // ├─ User navigates: Survey A (cache A) → Survey B (cache B)
  // ├─ Back to Survey A: Instantly shows cached links!
  // └─ Each component instance has its own cache entry

  // ==========================================
  // MUTATION 1: Generate new link
  // ==========================================
  const generateMutation = useMutation({
    mutationFn: () =>
      generateSurveyLink(surveyId, {
        clientEmail: formData.clientEmail || undefined,
        expiresAt: formData.expiresAt || undefined,
        maxSubmissions: formData.maxSubmissions
          ? parseInt(formData.maxSubmissions)
          : null,
      }),
    onSuccess: (result) => {
      // Server returns { success: true, token: '...' }
      if (result.success) {
        // 1. Refetch the links list
        queryClient.invalidateQueries({
          queryKey: ['survey-links', surveyId],
        })

        // 2. Clear form
        setShowForm(false)
        setFormData({
          clientEmail: '',
          expiresAt: '',
          maxSubmissions: '',
        })

        // 3. Clear error
        setError(null)
      } else {
        // Server-side validation failed
        setError(result.error || 'Failed to generate link')
      }
    },
  })
  // Flow:
  // ├─ User clicks "Generate"
  // ├─ generateMutation.mutate() called
  // ├─ generateSurveyLink (Server Action) executes
  // ├─ Server creates link in database
  // ├─ revalidatePath('/admin/surveys/[id]') invalidates Next.js cache
  // ├─ onSuccess fires
  // ├─ queryClient.invalidateQueries marks cache as stale
  // ├─ useQuery detects stale data
  // ├─ Automatically fetches fresh data
  // └─ Links list updated with new link!

  // ==========================================
  // MUTATION 2: Delete link
  // ==========================================
  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => deleteSurveyLink(linkId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['survey-links', surveyId],
        })
        setError(null)
      } else {
        setError(result.error || 'Failed to delete link')
      }
    },
  })
  // Same pattern as generate

  // ==========================================
  // RENDERING
  // ==========================================

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Links List */}
      <div className="space-y-2">
        {links?.map((link) => (
          <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <code>{link.token}</code>
              <p>{link.submission_count} submissions</p>
            </div>

            <button
              onClick={() => deleteMutation.mutate(link.id)}
              disabled={deleteMutation.isPending}
              className={deleteMutation.isPending ? 'opacity-50' : ''}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ))}
      </div>

      {/* Generate Form */}
      {showForm && (
        <form onSubmit={handleGenerateSubmit}>
          <input
            name="clientEmail"
            placeholder="Client email (optional)"
          />
          <input
            name="expiresAt"
            type="datetime-local"
            placeholder="Expires (optional)"
          />
          <input
            name="maxSubmissions"
            type="number"
            placeholder="Max submissions (optional)"
          />

          <button
            type="submit"
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate'}
          </button>
        </form>
      )}

      {/* Errors */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mt-4">
          {error}
        </div>
      )}
    </div>
  )
}
```

### Key Concepts

```
1. Query State Management:
   - useQuery: Handles caching & fetching
   - queryKey: Unique identifier for this component's data

2. Mutation State Management:
   - useMutation 1: Generate new link
   - useMutation 2: Delete link
   - Each has own isPending state
   - Both update same query

3. Cache Coordination:
   - Both mutations invalidate same queryKey
   - Triggers useQuery to refetch
   - Results in fresh list

4. UI Feedback:
   - generateMutation.isPending → button shows "Generating..."
   - deleteMutation.isPending → button shows "Deleting..."
   - Button disabled during operation
   - Prevents double-clicks

5. Error Handling:
   - Server returns { success, error }
   - Component checks success flag
   - Shows error to user
   - Query still validates data
```

---

## Case 4: Query Function (Fetch)

**File:** `apps/cms/features/surveys/queries.ts`

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'

// Simple, no caching complexity
export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  // CRITICAL: Throw errors!
  if (error) throw error

  return data || []
}
```

### Why Throw?

```typescript
// ❌ WRONG: Returns error as data
if (error) return error
// TanStack Query sees this as successful query!
// Component renders: error object as HTML → broken

// ✅ CORRECT: Throws error
if (error) throw error
// TanStack Query catches throw
// useQuery.error = error
// Component shows error state

// Flow:
// throw → caught by TanStack Query
// → useQuery.error updated
// → Component re-renders
// → Shows error UI
```

### Return Type

```typescript
// Promise<Tables<'surveys'>[]>
// ├─ Promise: Async operation
// ├─ Tables<'surveys'>: Type from auto-generated schema
// └─ []: Array of surveys

// Why explicit type?
// ├─ IDE autocomplete in useQuery
// ├─ Compile-time type checking
// ├─ Self-documenting code
```

---

## Case 5: Server Action (Mutation)

**File:** `apps/cms/features/surveys/actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TablesInsert } from '@agency/database'

export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get user's tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return { success: false, error: 'User not found in database' }
    }

    // Create survey with tenant context
    const surveyData: TablesInsert<'surveys'> = {
      title: formData.title,
      description: formData.description || null,
      tenant_id: userData.tenant_id,  // ← Server-set!
      created_by: user.id,
      questions: [],
      status: 'draft',
    }

    const { data: survey, error: insertError } = await supabase
      .from('surveys')
      .insert(surveyData as any)
      .select()
      .single()

    if (insertError || !survey) {
      return {
        success: false,
        error: insertError?.message || 'Failed to create survey',
      }
    }

    // Invalidate Next.js cache
    revalidatePath('/admin/surveys')

    // Return result for component
    return {
      success: true,
      surveyId: (survey as Tables<'surveys'>).id,
    }
  } catch (error) {
    return { success: false, error: 'Failed to create survey' }
  }
}
```

### Cache Invalidation Strategy

```
Two-cache system in Legal-Mind:

1. Next.js Cache (Server-side)
   ├─ Data cached on server
   ├─ revalidatePath() invalidates
   └─ When component renders → fetches fresh data

2. TanStack Query Cache (Client-side)
   ├─ Data cached in browser memory
   ├─ queryClient.invalidateQueries() invalidates
   └─ Triggers automatic refetch

Integration:

    User creates survey
            ↓
    Server Action (createSurvey) runs
            ↓
    Database updated
            ↓
    revalidatePath('/admin/surveys')
    [Next.js cache invalidated]
            ↓
    Component re-renders with fresh server data
            ↓
    useQuery sees updated data
            ↓
    TanStack Query cache updated
            ↓
    Component shows new survey ✅

Why two caches?
├─ Next.js: Server-side rendering, ISR
├─ TanStack Query: Client-side state, real-time updates
└─ Combined = Best of both worlds
```

### Return Type

```typescript
Promise<{ success: boolean; surveyId?: string; error?: string }>

Why this shape?
├─ success: Boolean flag (client checks this)
├─ surveyId: Returned if successful (navigate to survey)
├─ error: Message if failed (show to user)

Alternative patterns:

// 1. Throw errors (simpler)
export async function createSurvey(data) {
  return { surveyId: survey.id }  // Throw on error
}

// 2. Return result object (safer)
export async function createSurvey(data) {
  return { success: bool, surveyId?, error? }  // Never throws
}

Legal-Mind uses pattern 2: Safer, easier to handle in mutations
```

---

## Case 6: Integration: Component → Query → Mutation → Cache Update

**The Full Flow:**

```
User clicks "Create Survey"
        ↓
CreateSurveyForm component
        ↓
Form submitted: handleSubmit(e)
        ↓
mutation.mutate({ title, description })
        ↓
TanStack Query calls mutationFn
        ↓
Server Action: createSurvey(data)
        ↓
Database: INSERT survey
        ↓
revalidatePath('/admin/surveys')
        ↓
return { success: true, surveyId }
        ↓
onSuccess callback fires
        ↓
queryClient.invalidateQueries(['surveys'])
        ↓
TanStack Query sees stale cache
        ↓
useQuery automatically refetches
        ↓
Server Action: getSurveys()
        ↓
Database: SELECT * FROM surveys (RLS filters)
        ↓
return [...surveys, newSurvey]
        ↓
useQuery.data updated
        ↓
SurveyList component re-renders
        ↓
New survey appears in list ✅
```

---

## Case 7: Why TanStack Query in CMS, NOT Website

### CMS (Admin) - Uses TanStack Query ✅

```
Reasons:
├─ Multiple views of same data
│  ├─ SurveyList → all surveys
│  ├─ SurveyDetail → one survey
│  └─ Same data in cache!
│
├─ Frequent mutations
│  ├─ Create survey
│  ├─ Delete survey
│  ├─ Update survey
│  └─ Need cache invalidation
│
├─ Complex state management
│  ├─ Dashboard stats
│  ├─ Response list
│  ├─ Calendar events
│  └─ Multiple independent queries
│
└─ Performance critical
   ├─ Lawyers navigate fast
   ├─ Caching important
   └─ Smooth UX expected
```

### Website (Public) - NO TanStack Query ❌

```
Reasons:
├─ Simple flows
│  ├─ View survey (read-only)
│  ├─ Submit form (one-time)
│  └─ See thank you (no cache needed)
│
├─ No mutations shown to user
│  ├─ Client-side form validation
│  ├─ Single POST to /api/survey/submit
│  └─ No cache invalidation needed
│
├─ No complex state
│  ├─ One survey viewed at a time
│  ├─ No shared state between pages
│  └─ No real-time updates
│
└─ Simpler = Better
   ├─ Less JS (faster load)
   ├─ No QueryClientProvider overhead
   ├─ Direct fetch() calls sufficient
   └─ Easier to understand
```

---

## Comparison: CMS vs Website

```
                CMS                 Website
───────────────────────────────────────────────
useQuery        ✅ Yes              ❌ No
useMutation     ✅ Yes              ❌ No (direct fetch)
Cache           ✅ Multiple         ❌ None needed
Invalidate      ✅ After mutations  ❌ N/A
Users           Lawyers (admin)     Clients (public)
Data flow       Complex             Simple
Performance     Critical            Basic
```

---

## Current Status (Phase 2 - Dec 12)

```
✅ Working Well:
├─ SurveyList with caching
├─ SurveyLinks with dual mutations
├─ Survey detail queries
├─ Error handling on mutations
├─ Loading states during fetch/update
└─ DevTools debugging

⚠️ Could Improve:
├─ No prefetching (navigation slower)
├─ No infinite queries (no pagination yet)
├─ No custom hooks (patterns work but not abstracted)
├─ No error retry UI (users refresh manually)
└─ Basic optimistic updates (not yet used)

❌ Not Needed Yet:
├─ Polling/subscriptions (not real-time)
├─ Multiple endpoints (simple queries)
├─ Advanced caching (current setup sufficient)
└─ Performance optimization (fast enough now)

Phase 3+:
├─ Calendar queries (add new data type)
├─ Response list queries (new feature)
├─ Refactor patterns to custom hooks
├─ Maybe: Prefetching for speed
└─ Consider: Error boundary for error recovery
```

---

## Lessons Learned

```
1. QueryClientProvider in root layout
   ├─ Configure default staleTime/gcTime once
   └─ All components automatically benefit

2. Use dynamic queryKeys for component-specific data
   ├─ Different ID = different cache entry
   ├─ Navigating back = instant load
   └─ Perfect for SPA

3. Invalidate selectively, not aggressively
   ├─ Only invalidate affected queries
   ├─ Save bandwidth and battery
   └─ Better UX (less flickering)

4. Server Actions + TanStack Query = Powerful
   ├─ revalidatePath() + invalidateQueries()
   ├─ Coordinates two caches
   └─ Seamless user experience

5. TanStack Query is not always needed
   ├─ Website works fine without it
   ├─ Simple one-time operations: use fetch()
   └─ Complex shared state: use TanStack Query

6. DevTools is your friend
   ├─ Open during development
   ├─ See all cache entries
   ├─ Debug invalidation
   └─ Check memory usage
```

