# TanStack Query Patterns - Real-World Solutions

Rzeczywiste problemy z TanStack Query które mogą się pojawić w Legal-Mind i jak je rozwiązywać.

---

## Problem 1: Stale Data After Mutation

### The Problem

```typescript
// User creates survey
const createMutation = useMutation({
  mutationFn: createSurvey,
  // No invalidation!
})

// SurveyList component still shows old list
// New survey doesn't appear until page refresh
```

### The Solution

```typescript
const queryClient = useQueryClient()

const createMutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: () => {
    // Refetch the list
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  },
})
```

**How it works:**

```
1. User submits form
2. createSurvey() executes (Server Action)
3. Server creates survey in database
4. onSuccess fires
5. invalidateQueries marks ['surveys'] cache as stale
6. useQuery sees stale data
7. TanStack Query automatically refetches getSurveys()
8. New list returned, UI updates
```

### Advanced: Granular Invalidation

```typescript
const createMutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: (data) => {
    // Invalidate all survey queries
    queryClient.invalidateQueries({
      queryKey: ['surveys'],
      exact: false,  // Matches ['surveys'], ['surveys', id], etc.
    })

    // Or more specific:
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

    // Or partial match:
    queryClient.invalidateQueries({
      queryKey: ['survey'],
      type: 'all',  // 'active' | 'all' | 'inactive'
    })
  },
})
```

---

## Problem 2: Race Conditions with Multiple Mutations

### The Problem

**Scenario:** User generates and immediately deletes a survey link

```typescript
// Generate link (takes 1 second)
generateMutation.mutate({ maxSubmissions: null })

// Quickly click delete
deleteMutation.mutate(linkId)

// What happens?
// Request 1: DELETE arrives before response from create
// Request 2: CREATE response arrives after delete
// List shows wrong state!
```

### The Solution 1: Sequential Mutations

```typescript
const handleCreateAndDelete = async () => {
  // Wait for create to finish
  const createResult = await createMutation.mutateAsync({
    maxSubmissions: null
  })

  if (createResult.success) {
    // Only then delete
    await deleteMutation.mutateAsync(createResult.linkId)
  }
}
```

### The Solution 2: Disable UI During Mutation

```typescript
// Most common in Legal-Mind

<button
  onClick={() => generateMutation.mutate()}
  disabled={generateMutation.isPending || deleteMutation.isPending}
>
  Generate
</button>

<button
  onClick={() => deleteMutation.mutate(linkId)}
  disabled={generateMutation.isPending || deleteMutation.isPending}
>
  Delete
</button>

// User can't click both at same time
// Simple and effective!
```

### The Solution 3: Optimistic Updates

```typescript
const deleteMutation = useMutation({
  mutationFn: (linkId) => deleteSurveyLink(linkId),
  onMutate: async (linkId) => {
    // Cancel ongoing query
    await queryClient.cancelQueries({
      queryKey: ['survey-links', surveyId]
    })

    // Get old data
    const oldData = queryClient.getQueryData([
      'survey-links',
      surveyId
    ]) as SurveyLink[] | undefined

    // Remove from UI immediately
    queryClient.setQueryData(['survey-links', surveyId], (old: SurveyLink[]) =>
      old.filter((link) => link.id !== linkId)
    )

    // Return old data for rollback
    return { oldData }
  },
  onError: (_, __, context) => {
    // If delete fails, put back the item
    if (context?.oldData) {
      queryClient.setQueryData(['survey-links', surveyId], context.oldData)
    }
  },
  onSuccess: () => {
    // Confirm delete by refetching
    queryClient.invalidateQueries({ queryKey: ['survey-links', surveyId] })
  },
})
```

---

## Problem 3: Unnecessary Refetches

### The Problem

```typescript
// User navigates to Survey Page
// useQuery fetches data

// User navigates away
// 5 minutes pass

// User navigates back
// useQuery fetches AGAIN (even though cached!)

// Problem: Wasted network request
```

### The Solution: Adjust Timing

```typescript
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 15,  // 15 minutes instead of 5
          gcTime: 1000 * 60 * 30,     // 30 minutes instead of 10
        },
      },
    })
)

// Now:
// - Data fresh for 15 minutes
// - If user comes back in 15 min window → instant load from cache
// - If user comes back after 15 min → refetch (stale data)
// - If unused for 30 min → garbage collected

// Tradeoff: Longer cache = less fresh data
// Choose based on your use case
```

### The Solution: Disable Refetch on Window Focus

```typescript
// Already done in Legal-Mind!
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,  // Don't refetch when tab regains focus
        },
      },
    })
)

// Without this:
// - User tabs away (playing email)
// - Tabs back
// - TanStack Query auto-refetches all queries
// - Wastes bandwidth, worse UX
```

---

## Problem 4: Overusing useQuery (When Not Needed)

### The Problem

**Website app (public):**

```typescript
// ❌ OVERKILL: Simple one-time form submission
export function SurveyForm() {
  const { mutate: submitForm } = useMutation({
    mutationFn: submitSurveyResponse,
    // Needs onSuccess, invalidation, etc.
  })
}

// Only ONE submission, no caching needed, no refetch
// TanStack Query overhead not justified
```

### The Solution: Use Direct Fetch

```typescript
// ✅ BETTER: Direct fetch for simple forms
export function SurveyForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/survey/submit', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (result.success) {
        router.push('/success')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      <button disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
      {error && <div>{error}</div>}
    </form>
  )
}
```

**Principle:**
- Simple one-time operations → Direct fetch
- Complex data flows with caching → TanStack Query
- Multiple components sharing data → TanStack Query

---

## Problem 5: Memory Leak with Dynamic Query Keys

### The Problem

```typescript
// SurveyDetail component
export function SurveyDetail({ surveyId }: { surveyId: string }) {
  const { data } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  // User navigates: SurveyDetail('abc') → SurveyDetail('def') → SurveyDetail('abc')
  // Query keys: ['surveys', 'abc'] → ['surveys', 'def'] → ['surveys', 'abc']
  //
  // Each unique key creates new cache entry
  // After 30 minutes (gcTime), old entries garbage collected
  //
  // If user visits 100 surveys → 100 cache entries!
  // Problem: High memory usage
}
```

### The Solution: Increase GC Time Strategically

```typescript
// For apps with many dynamic routes
new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5,  // Only 5 min cache (default 10)
      // Aggressive cleanup of unused entries
    },
  },
})

// Or clear on route change
useEffect(() => {
  return () => {
    // Optional: Clear unrelated queries when component unmounts
    queryClient.removeQueries({
      queryKey: ['surveys'],
      type: 'inactive',  // Only remove if not in use
    })
  }
}, [surveyId])
```

### The Solution: Monitor with DevTools

```typescript
// Open DevTools in development
<ReactQueryDevtools initialIsOpen={false} />

// In DevTools:
// - See all query keys
// - See cache sizes
// - See which queries are stale/inactive
// - Manual cache clearing
```

---

## Problem 6: Synchronizing with Next.js Cache

### The Problem

**Combination of two caches:**

```
TanStack Query (Client-side)  ← Browser memory
    ↓
Next.js Cache (Server-side)   ← Vercel CDN
    ↓
Database                      ← Source of truth

When user creates survey:
1. Server Action (createSurvey) runs
2. Database updated
3. revalidatePath() invalidates Next.js cache
4. But TanStack Query cache still has old data!
5. User sees new survey, but after 5-minute staleTime it's gone!
```

### The Solution: Coordinate Invalidation

```typescript
// apps/cms/features/surveys/actions.ts
'use server'

export async function createSurvey(data) {
  const supabase = await createClient()

  const { data: survey, error } = await supabase
    .from('surveys')
    .insert({...})
    .select()
    .single()

  if (!error) {
    // Invalidate Next.js cache
    revalidatePath('/admin/surveys')

    // Component will refetch via TanStack Query
    // when it sees stale data
  }

  return { success: !error, surveyId: survey?.id }
}

// apps/cms/features/surveys/components/SurveyList.tsx
'use client'

export function SurveyList() {
  // TanStack Query hook
  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  // Flow:
  // 1. User creates survey
  // 2. Server Action invalidates Next.js cache via revalidatePath()
  // 3. Component runs again (gets fresh data from server)
  // 4. useQuery sees fresh data
  // 5. TanStack Query cache auto-updated
  // 6. Stays fresh for 5 minutes
}
```

### The Solution: Manual Invalidation in Component

```typescript
export function SurveyList() {
  const queryClient = useQueryClient()
  const { data } = useQuery({...})

  // Listen for router changes
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // When URL changes, maybe invalidate
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  }, [searchParams])

  // Or use server-sent events for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/survey-updates')
    eventSource.onmessage = (event) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    }
    return () => eventSource.close()
  }, [])
}
```

---

## Problem 7: Error Recovery

### The Problem

```typescript
// User has network error
// TanStack Query retries once (retry: 1)
// Both fail
// Error state shown to user
// User presses back/refresh
// Same component mounted again
// Already failed, no retry!

// Solution: No retry on mount
```

### The Solution: Manual Retry

```typescript
export function SurveyList() {
  const { data, error, refetch } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
    retry: 1,  // Automatic retry
  })

  if (error) {
    return (
      <div>
        <p>Failed to load surveys</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  return <div>{/* ... */}</div>
}
```

### The Solution: Exponential Backoff

```typescript
const { data } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
  retry: 3,
  retryDelay: (attemptIndex) => {
    // Attempt 0: 1000ms (1s)
    // Attempt 1: 2000ms (2s)
    // Attempt 2: 4000ms (4s)
    // Attempt 3: 8000ms (8s)
    return Math.min(1000 * 2 ** attemptIndex, 30000)
  },
})
```

---

## Problem 8: Dependent Queries

### The Problem

**Get survey, then get its links:**

```typescript
// ❌ WATERFALL (slow)
export function SurveyBuilder({ surveyId }) {
  const { data: survey } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
    // Returns after X ms
  })

  // Only starts AFTER survey finishes!
  const { data: links } = useQuery({
    queryKey: ['survey-links', surveyId],
    queryFn: () => getSurveyLinks(surveyId),
    enabled: !!survey,  // Waits for survey
  })

  // Timeline:
  // |----1000ms----|
  //    getSurvey()
  //                |----500ms----|
  //                   getSurveyLinks()
  // Total: 1500ms ❌
}
```

### The Solution: Parallel Queries

```typescript
// ✅ PARALLEL (fast)
export function SurveyBuilder({ surveyId }) {
  const { data: survey } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  const { data: links } = useQuery({
    queryKey: ['survey-links', surveyId],
    queryFn: () => getSurveyLinks(surveyId),
    // NO enabled check - starts immediately!
  })

  // Timeline:
  // |----1000ms----|
  //    getSurvey()
  // |----500ms----|
  //    getSurveyLinks()
  // Total: 1000ms ✅ (fastest wins)
}
```

### The Solution: Join Related Data

```typescript
// ✅ BEST: Get both in one query
export async function getSurveyWithLinks(surveyId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('surveys')
    .select(`
      *,
      survey_links (
        id,
        token,
        submission_count
      )
    `)
    .eq('id', surveyId)
    .single()

  return data
}

export function SurveyBuilder({ surveyId }) {
  const { data } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurveyWithLinks(surveyId),
  })

  // Both available immediately!
  // Timeline: |----1000ms----|
  // getSurveyWithLinks() (one request)
  // Total: 1000ms ✅
}
```

---

## Problem 9: Cache Invalidation Too Aggressive

### The Problem

```typescript
// After ANY mutation, clear ALL cache
const mutation = useMutation({
  mutationFn: updateSurvey,
  onSuccess: () => {
    queryClient.invalidateQueries()  // Clear EVERYTHING!
  },
})

// Problems:
// - Dashboard stats still loading
// - Response list still loading
// - Unnecessary network requests
// - Bad UX (flickering)
```

### The Solution: Selective Invalidation

```typescript
const mutation = useMutation({
  mutationFn: (data) => updateSurvey(surveyId, data),
  onSuccess: () => {
    // Only invalidate affected queries
    queryClient.invalidateQueries({
      queryKey: ['surveys', surveyId],  // This survey
    })
    // Don't invalidate:
    // - ['surveys'] - list not affected
    // - ['dashboard'] - stats not affected
  },
})

// Or more precise:
queryClient.setQueryData(['surveys', surveyId], (old) => ({
  ...old,
  ...updatedFields,
}))
// Manual update without refetch!
```

---

## Problem 10: Testing with TanStack Query

### The Problem

```typescript
// Component uses useQuery, hard to test
describe('SurveyList', () => {
  it('shows surveys', () => {
    render(<SurveyList />)
    // Error: Query not wrapped in QueryClientProvider!
  })
})
```

### The Solution: Test Setup

```typescript
// __tests__/setup.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

export function renderWithQuery(component: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },  // Don't retry in tests
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

// __tests__/SurveyList.test.tsx
import { renderWithQuery } from './setup'

describe('SurveyList', () => {
  it('shows surveys', async () => {
    // Mock the query function
    jest.mock('@/features/surveys/queries', () => ({
      getSurveys: jest.fn().mockResolvedValue([
        { id: '1', title: 'Survey 1' }
      ])
    }))

    const { getByText } = renderWithQuery(<SurveyList />)
    expect(getByText('Survey 1')).toBeInTheDocument()
  })
})
```

---

## Real Legal-Mind Timeline

```
Current Status (Phase 2 - Dec 12):

✅ Working well:
- SurveyList with useQuery
- SurveyLinks with generate/delete mutations
- Manual invalidation after mutations
- Error handling on mutations
- Loading states

⚠️ Minor issues:
- Survey counter (non-critical, gracefully degraded)
- No race condition protection (UI disabled, so OK)

❌ Not implemented yet:
- Prefetching (navigation optimization)
- Infinite queries (pagination)
- Custom hooks (could extract patterns)
- Error retry UI (users can refresh manually)
- Real-time updates (Phase 5)

Phase 3+:
- Calendar queries (new calendar data)
- Response list queries (new query set)
- Refactor to custom hooks
- Implement error recovery UI
```

---

## Checklist: Before Deploying Changes

```bash
□ Tested in development with DevTools open
□ Invalidation strategy defined for mutations
□ Error handling added (try/catch + error state)
□ Loading states shown during fetch
□ No console warnings
□ Memory usage reasonable (checked in DevTools)
□ staleTime appropriate for data type
□ refetchOnWindowFocus setting considered
□ retry logic appropriate
□ Query keys consistent and semantic
□ useQueryClient imported where needed
□ No circular dependencies in query functions
□ Test plan includes network failures
□ Checked DevTools before building
```

