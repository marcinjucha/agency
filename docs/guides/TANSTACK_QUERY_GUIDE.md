# TanStack Query Deep Dive - Halo-Efekt Implementation

Praktyczny przewodnik zrozumienia TanStack Query na bazie rzeczywistego kodu Halo-Efekt.

---

## Spis treści

1. [Co to jest TanStack Query?](#co-to-jest-tanstack-query)
2. [Setup w Halo-Efekt](#setup-w-halo-efekt)
3. [Architektura & Koncepty](#architektura--koncepty)
4. [useQuery (Czytanie danych)](#usequery-czytanie-danych)
5. [useMutation (Pisanie danych)](#usemutation-pisanie-danych)
6. [Cache Management](#cache-management)
7. [Error Handling](#error-handling)
8. [Loading & Pending States](#loading--pending-states)
9. [Advanced Patterns](#advanced-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Co to jest TanStack Query?

**TanStack Query = Server State Management**

```
Traditional React State            TanStack Query
─────────────────────────         ─────────────────
useState (Client State)            useQuery (Server State)
  ├─ UI preferences                  ├─ Database data
  ├─ Form input                      ├─ API responses
  └─ Modal open/close               └─ Cached from server

Problems it solves:
❌ Manual fetch() calls with useState
❌ Racing conditions with concurrent requests
❌ Stale data after mutations
❌ "Loading..." spinners everywhere
❌ Cache invalidation complexity

✅ Automatic caching & synchronization
✅ Deduplication (same request → same response)
✅ Background refetching
✅ Optimistic updates
✅ Built-in error handling
```

### Why Halo-Efekt uses it

```
Halo-Efekt has TWO apps:

CMS (Admin) ─────────────→ TanStack Query ✅
├─ Complex data flows
├─ Multiple data sources
├─ Real-time list updates
└─ Frequent mutations

Website (Public) ────────→ NO TanStack Query ❌
├─ Simple forms
├─ One-time submissions
└─ No complex state
```

---

## Setup w Halo-Efekt

### Installation

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### QueryClientProvider (apps/cms/app/providers.tsx)

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance (once per app)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,      // 5 minutes
            gcTime: 1000 * 60 * 10,        // 10 minutes (garbage collection)
            retry: 1,                       // Retry failed queries once
            refetchOnWindowFocus: false,    // Don't refetch when tab regains focus
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

### Wrap Root Layout

```typescript
// apps/cms/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Configuration Explained

```
staleTime: 1000 * 60 * 5
├─ Data marked as "stale" after 5 minutes
├─ Stale data still shown to user
├─ But marked for potential refetch
└─ If user navigates away/back → fetch fresh data

gcTime: 1000 * 60 * 10 (formerly cacheTime)
├─ Cache entry DELETED after 10 minutes of no access
├─ If user comes back in 5-10 min window → shows cached data
├─ If user comes back after 10 min → refetch from server
└─ Saves memory on long-running apps

retry: 1
├─ If query fails (network error, 500), retry once
├─ If fails again → show error to user
├─ Prevents temporary network glitches

refetchOnWindowFocus: false
├─ When user tabs back to app → don't auto-refetch
├─ Default is true (can waste requests)
├─ Halo-Efekt disabled for better UX
```

---

## Architektura & Koncepty

### Request Lifecycle

```
1. Component mounts
   └─ useQuery({ queryKey: ['surveys'], queryFn: getSurveys })

2. Check cache
   ├─ Cache miss → Go to step 3
   └─ Cache hit → Return cached data + mark as "stale" (step 4)

3. Fetch from server
   ├─ Call queryFn (getSurveys)
   ├─ Wait for response
   └─ Store in cache

4. Mark data as stale
   ├─ After staleTime expires
   ├─ Data still shown (no refetch yet)
   └─ Next action might refetch

5. Garbage collect
   ├─ After gcTime with no subscribers
   ├─ Cache entry deleted
   └─ Memory freed

Lifecycle Diagram:
fetching → success → stale → fresh (if refetched)
   ↓
  cached until gcTime
   ↓
  garbage collected
```

### Query Keys

```
Purpose: Unique identifier for cached data

Syntax: Array of values

Examples:
['surveys'] → All surveys

['surveys', surveyId] → Specific survey
├─ Different surveyId = different cache entry
└─ Component gets its own cache

['survey-links', surveyId] → Survey links for specific survey

['responses', { surveyId, status }] → Responses with filters
├─ Object keys matter: { a: 1, b: 2 } !== { b: 2, a: 1 }
└─ Use consistent ordering

Key Principles:
1. Unique keys = separate cache entries
2. Related data = related keys (e.g., ['surveys'] vs ['survey-links'])
3. Dynamic keys = component-scoped caching
4. Used for invalidation: invalidateQueries({ queryKey: ['surveys'] })
```

### Query States

```
useQuery returns:

status: 'pending' | 'success' | 'error'
├─ pending: Initial fetch or refetching
├─ success: Data available (might be stale)
└─ error: Query failed

Alternative flags:
isLoading ─ True if initial fetch (pending + no data)
isFetching ─ True if any fetch happening (refetch too)
isPending ─ Same as status === 'pending'

data ─ The actual data (undefined if not loaded)
error ─ Error object (undefined if no error)

Example:
const { status, data, error, isLoading, isFetching } = useQuery({...})

if (status === 'pending') return <div>Loading...</div>
if (status === 'error') return <div>Error: {error.message}</div>
return <div>{data}</div>
```

---

## useQuery (Czytanie danych)

### Basic Pattern

```typescript
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from './queries'

export function SurveyList() {
  // Execute query
  const { data, error, isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  // Handle states
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  // Render
  return (
    <ul>
      {data?.map((survey) => (
        <li key={survey.id}>{survey.title}</li>
      ))}
    </ul>
  )
}
```

### Query Function

```typescript
// features/surveys/queries.ts
import { createClient } from '@/lib/supabase/client'

// Query function (just a regular async function)
export async function getSurveys() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  // Important: Throw errors (don't return them)
  if (error) throw error

  return data || []
}

// Why throw?
// TanStack Query catches throws → shows in error state
// If you return error → TanStack Query treats it as success!
```

### Multiple Queries

```typescript
export function DashboardPage() {
  // Query 1: All surveys
  const surveysQuery = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  // Query 2: Dashboard stats
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  // Wait for both
  if (surveysQuery.isLoading || statsQuery.isLoading) {
    return <div>Loading dashboard...</div>
  }

  // Or use combined pattern
  const isLoading = surveysQuery.isLoading || statsQuery.isLoading
  const error = surveysQuery.error || statsQuery.error

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <SurveyList surveys={surveysQuery.data} />
      <Stats stats={statsQuery.data} />
    </div>
  )
}
```

### Dynamic Query Keys

```typescript
// Component for single survey
export function SurveyDetail({ surveyId }: { surveyId: string }) {
  const { data: survey } = useQuery({
    queryKey: ['surveys', surveyId],  // ← Unique per surveyId
    queryFn: () => getSurvey(surveyId),
  })

  return <div>{survey?.title}</div>
}

// Why dynamic keys?
// - Page 1: surveyId = 'abc' → cache key ['surveys', 'abc']
// - Page 2: surveyId = 'def' → cache key ['surveys', 'def']
// - Each cached separately!
// - Back to page 1: 'abc' still in cache, shows instantly
```

### Conditional Queries

```typescript
export function SurveyBuilder({ surveyId }: { surveyId: string }) {
  const { data: survey } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
    enabled: !!surveyId,  // ← Don't fetch if no ID
  })

  if (!surveyId) return <div>No survey selected</div>
  if (!survey) return <div>Loading...</div>

  return <div>{survey.title}</div>
}

// Use case:
// - Modal opens, user picks survey
// - surveyId goes from null → 'abc'
// - Query automatically enabled, fetches data
// - Smooth UX
```

### Polling (Auto-Refetch)

```typescript
export function LiveResponseCount({ surveyId }: { surveyId: string }) {
  const { data: count } = useQuery({
    queryKey: ['response-count', surveyId],
    queryFn: () => getResponseCount(surveyId),
    refetchInterval: 1000 * 30,  // Refetch every 30 seconds
  })

  return <div>Responses: {count}</div>
}

// Use case:
// - Dashboard showing live stats
// - Auto-updates without user refresh
// - Stops refetching when component unmounts
```

### Parallel Queries with Suspension

```typescript
// If queryKey doesn't depend on other data
export function MultiSurveyView() {
  const query1 = useQuery({
    queryKey: ['surveys', 'id1'],
    queryFn: () => getSurvey('id1'),
  })

  const query2 = useQuery({
    queryKey: ['surveys', 'id2'],
    queryFn: () => getSurvey('id2'),
  })

  // TanStack Query fetches both in parallel ✅
  // No waterfall effect
}
```

---

## useMutation (Pisanie danych)

### Basic Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSurvey } from './actions'

export function CreateSurveyForm() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data) => createSurvey(data),
    onSuccess: () => {
      // Refetch surveys list after create
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    createMutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <input name="description" />
      <button
        type="submit"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>

      {createMutation.error && (
        <div>Error: {createMutation.error.message}</div>
      )}
    </form>
  )
}
```

### Real Halo-Efekt Example

```typescript
// apps/cms/features/surveys/components/SurveyLinks.tsx
export function SurveyLinks({ surveyId }: { surveyId: string }) {
  const queryClient = useQueryClient()

  // Query: Get links for this survey
  const { data: links, isLoading } = useQuery({
    queryKey: ['survey-links', surveyId],
    queryFn: () => getSurveyLinks(surveyId),
  })

  // Mutation: Generate new link
  const generateMutation = useMutation({
    mutationFn: (options) =>
      generateSurveyLink(surveyId, options),
    onSuccess: (result) => {
      if (result.success) {
        // Refetch links
        queryClient.invalidateQueries({ queryKey: ['survey-links', surveyId] })
        // Reset form
        setShowForm(false)
        setFormData({ clientEmail: '', expiresAt: '', maxSubmissions: '' })
      }
    },
  })

  // Mutation: Delete link
  const deleteMutation = useMutation({
    mutationFn: (linkId) => deleteSurveyLink(linkId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['survey-links', surveyId] })
      }
    },
  })

  return (
    <div>
      {links?.map((link) => (
        <div key={link.id}>
          <span>{link.token}</span>
          <button
            onClick={() => deleteMutation.mutate(link.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}

      <button
        onClick={() => generateMutation.mutate({ maxSubmissions: null })}
        disabled={generateMutation.isPending}
      >
        Generate Link
      </button>
    </div>
  )
}
```

### Mutation States

```typescript
const mutation = useMutation({...})

mutation.status          // 'idle' | 'pending' | 'success' | 'error'
mutation.isPending       // True while executing
mutation.isError         // True if error
mutation.data            // Returned data from mutationFn
mutation.error           // Error object if failed
mutation.variables       // Arguments passed to mutate()

// Manual trigger
mutation.mutate(variables)

// Async version (returns promise)
await mutation.mutateAsync(variables)
```

### Optimistic Updates

```typescript
// When you want UI to update immediately (before server confirms)
const updateMutation = useMutation({
  mutationFn: (data) => updateSurvey(surveyId, data),

  // 1. Before mutation, update cache optimistically
  onMutate: async (newData) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({ queryKey: ['surveys', surveyId] })

    // Get old data (for rollback)
    const oldData = queryClient.getQueryData(['surveys', surveyId])

    // Update cache immediately (UI shows new data instantly)
    queryClient.setQueryData(['surveys', surveyId], (old) => ({
      ...old,
      ...newData,
    }))

    // Return old data for rollback
    return { oldData }
  },

  // 2. If error, rollback to old data
  onError: (error, variables, context) => {
    if (context?.oldData) {
      queryClient.setQueryData(['surveys', surveyId], context.oldData)
    }
  },

  // 3. If success, refetch to confirm
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['surveys', surveyId] })
  },
})
```

### Mutation Callbacks

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    return createSurvey(data)
  },

  // Called before mutation
  onMutate: (variables) => {
    console.log('Mutation starting with:', variables)
  },

  // Called if successful
  onSuccess: (data, variables, context) => {
    console.log('Success!', data)
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  },

  // Called if error
  onError: (error, variables, context) => {
    console.error('Error:', error)
  },

  // Always called (success or error)
  onSettled: (data, error, variables, context) => {
    console.log('Mutation finished')
  },
})
```

---

## Cache Management

### Invalidation (Cache Busting)

```typescript
const queryClient = useQueryClient()

// Invalidate all
queryClient.invalidateQueries()

// Invalidate by key
queryClient.invalidateQueries({ queryKey: ['surveys'] })

// Invalidate specific entry
queryClient.invalidateQueries({ queryKey: ['surveys', surveyId] })

// Invalidate partial match
queryClient.invalidateQueries({
  queryKey: ['survey-links'],  // All survey-links queries
  exact: false                  // Partial match (default)
})

// Refetch immediately
queryClient.invalidateQueries({
  queryKey: ['surveys'],
  refetchType: 'all',  // 'all' | 'active' | 'stale' | 'none'
})

// After mutation
const mutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  },
})
```

### Manual Cache Updates

```typescript
// Set data directly
queryClient.setQueryData(['surveys', surveyId], {
  id: surveyId,
  title: 'Updated Title',
  ...
})

// Get current data
const survey = queryClient.getQueryData(['surveys', surveyId])

// Update with function
queryClient.setQueryData(['surveys'], (old) => [
  ...old,
  newSurvey,  // Add new survey to list
])

// Clear specific
queryClient.removeQueries({ queryKey: ['surveys', surveyId] })

// Clear all
queryClient.clear()
```

### Combining with Next.js Cache

```typescript
// Server Action (apps/cms/features/surveys/actions.ts)
'use server'

export async function createSurvey(data) {
  const supabase = await createClient()
  // ... create survey

  // Invalidate Next.js cache
  revalidatePath('/admin/surveys')
}

// Component (apps/cms/features/surveys/components/SurveyList.tsx)
'use client'

export function SurveyList() {
  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  // Flow:
  // 1. User submits form
  // 2. createSurvey() runs (Server Action)
  // 3. revalidatePath() invalidates Next.js cache
  // 4. Component auto-refetches (TanStack Query sees stale data)
  // 5. getSurveys() gets fresh data from server
  // 6. UI updates with new survey
}
```

---

## Error Handling

### Query Errors

```typescript
const { data, error, status } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
})

if (status === 'error') {
  return (
    <div className="error">
      <h2>Failed to load surveys</h2>
      <p>{error?.message}</p>
      <button onClick={() => queryClient.invalidateQueries()}>
        Retry
      </button>
    </div>
  )
}
```

### Mutation Errors

```typescript
const mutation = useMutation({
  mutationFn: createSurvey,
  onError: (error, variables) => {
    // Show error to user
    toast.error(`Failed to create: ${error.message}`)
  },
})

// In form
{mutation.error && (
  <div className="error">{mutation.error.message}</div>
)}
```

### Error Retry

```typescript
const { data } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
  retry: 3,  // Retry 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
})

// Backoff: 1s, 2s, 4s, 8s, etc.
```

---

## Loading & Pending States

### Component States

```typescript
export function SurveyList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  // Initial load
  if (isLoading) {
    return (
      <div className="spinner">
        <div className="animate-spin">Loading...</div>
      </div>
    )
  }

  // Error
  if (error) {
    return <div className="error">Failed to load surveys</div>
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="empty">
        <p>No surveys yet</p>
        <CreateSurveyButton />
      </div>
    )
  }

  // Success
  return (
    <ul>
      {data.map((survey) => (
        <SurveyItem key={survey.id} survey={survey} />
      ))}
    </ul>
  )
}
```

### Differentiating isLoading vs isFetching

```typescript
const { data, isLoading, isFetching } = useQuery({...})

isLoading
├─ True: Initial fetch (no data yet)
├─ False: Data available (even if stale)
└─ UI: Show skeleton, hide stale data

isFetching
├─ True: Any fetch (initial or refetch)
├─ False: Not fetching
└─ UI: Show "Updating...", keep showing data

Usage:
{isLoading && <Skeleton />}
{!isLoading && data && (
  <>
    {isFetching && <div className="updating">Updating...</div>}
    <ListContent data={data} />
  </>
)}
```

### Mutation Pending

```typescript
const mutation = useMutation({...})

<button
  onClick={() => mutation.mutate()}
  disabled={mutation.isPending}
  className={mutation.isPending ? 'opacity-50' : ''}
>
  {mutation.isPending ? (
    <>
      <Spinner /> Creating...
    </>
  ) : (
    'Create'
  )}
</button>
```

---

## Advanced Patterns

### Prefetching (Speed Up Navigation)

```typescript
// Prefetch data before user navigates
const queryClient = useQueryClient()

export function SurveyLink({ surveyId }: { surveyId: string }) {
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['surveys', surveyId],
      queryFn: () => getSurvey(surveyId),
    })
  }

  return (
    <Link
      href={`/admin/surveys/${surveyId}`}
      onMouseEnter={handleMouseEnter}
    >
      View survey
    </Link>
  )
}

// When user hovers → fetch starts
// By time they click → data might be ready!
```

### Infinite Queries (Pagination)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

export function SurveyListPaginated() {
  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['surveys'],
    queryFn: ({ pageParam }) => getSurveys({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      return lastPage.length > 0 ? lastPageParam + 1 : undefined
    },
  })

  return (
    <>
      {data?.pages.map((page) =>
        page.map((survey) => (
          <SurveyItem key={survey.id} survey={survey} />
        ))
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetching}
        >
          Load more
        </button>
      )}
    </>
  )
}
```

### Custom Hooks

```typescript
// Hook: Fetch survey with error handling
export function useSurvey(surveyId: string) {
  return useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
    enabled: !!surveyId,
  })
}

// Hook: Create survey with cache update
export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

// Usage:
export function SurveyPage({ surveyId }: { surveyId: string }) {
  const { data: survey, isLoading } = useSurvey(surveyId)
  const { mutate: create } = useCreateSurvey()

  // ...
}
```

---

## Troubleshooting

### Problem: Data not updating after mutation

```typescript
// ❌ WRONG: Doesn't invalidate
const mutation = useMutation({
  mutationFn: createSurvey,
  // No onSuccess!
})

// ✅ CORRECT: Invalidate cache
const mutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  },
})
```

### Problem: Multiple mutations race condition

```typescript
// ❌ PROBLEMATIC: Both delete operations might conflict
deleteMutation.mutate(linkId1)
deleteMutation.mutate(linkId2)

// ✅ BETTER: Sequential or controlled
await deleteMutation.mutateAsync(linkId1)
await deleteMutation.mutateAsync(linkId2)

// Or use optimistic updates
deleteMutation.mutate(linkId, {
  onMutate: async (id) => {
    // Optimistically remove from UI
  },
})
```

### Problem: Stale data displayed

```typescript
// ❌ WRONG: Cache kept too long
staleTime: 1000 * 60 * 60  // 1 hour!

// ✅ CORRECT: For frequently changing data
staleTime: 1000 * 60 * 5   // 5 minutes

// Or disable cache for sensitive data
staleTime: 0  // Mark stale immediately
```

### Problem: Memory leak warning

```typescript
// ❌ WRONG: Query not cleaned up
useQuery({
  queryKey: ['surveys', surveyId],  // surveyId changes, old query orphaned
  queryFn: () => getSurvey(surveyId),
})

// ✅ CORRECT: Dependency causes refetch
useEffect(() => {
  queryClient.invalidateQueries({ queryKey: ['surveys'] })
}, [surveyId])
```

### Problem: Slow queries

```typescript
// Check TanStack Query DevTools:
// DevTools → Check cache size
// DevTools → Check stale time settings

// Optimize:
1. Increase staleTime (less refetches)
2. Use prefetching for navigation
3. Implement pagination (useInfiniteQuery)
4. Add select option for data transformation
5. Check Supabase query performance
```

---

## Best Practices Checklist

```
□ Use QueryClientProvider in root layout
□ Define query functions in separate files (queries.ts)
□ Always throw errors in query functions (don't return)
□ Invalidate cache after mutations
□ Use dynamic query keys for component-specific data
□ Disable queries conditionally (enabled option)
□ Show loading states during initial fetch
□ Show updating indicator during refetch
□ Handle errors gracefully
□ Use mutation callbacks (onSuccess, onError)
□ Deduplicate requests (TanStack Query does this automatically)
□ Monitor DevTools in development
□ Set appropriate staleTime values
□ Consider optimistic updates for better UX
□ Test error scenarios
□ Clean up subscriptions on unmount (automatic)
```

---

## Quick Reference: Common Patterns

```typescript
// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
})

// Create/Update
const mutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: () => queryClient.invalidateQueries(['surveys']),
})
mutation.mutate(data)

// Delete with confirmation
const deleteMutation = useMutation({
  mutationFn: deleteSurvey,
  onSuccess: () => queryClient.invalidateQueries(['surveys']),
})
deleteMutation.mutate(id)

// Refetch manually
queryClient.invalidateQueries({ queryKey: ['surveys'] })

// Get cached data
const cached = queryClient.getQueryData(['surveys'])

// Clear specific cache
queryClient.removeQueries({ queryKey: ['surveys'] })
```

---

Ostatnia aktualizacja: 2025-12-12
