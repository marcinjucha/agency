# TanStack Query Quick Reference - Copy-Paste Ready

Szybkie snippety do kopiowania przy codziennej pracy.

---

## Installation & Setup

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

```typescript
// app/providers.tsx
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
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
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

```typescript
// app/layout.tsx
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

---

## Reading Data (useQuery)

### Simple Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from './queries'

export function SurveyList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.map((survey) => (
        <li key={survey.id}>{survey.title}</li>
      ))}
    </ul>
  )
}
```

### With Dynamic Key

```typescript
export function SurveyDetail({ surveyId }: { surveyId: string }) {
  const { data: survey } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  return <div>{survey?.title}</div>
}
```

### With Conditional Query

```typescript
export function SurveyEditor({ surveyId }: { surveyId: string }) {
  const { data: survey } = useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: () => getSurvey(surveyId),
    enabled: !!surveyId,  // Don't fetch if no ID
  })

  if (!surveyId) return <div>Select a survey</div>
  if (!survey) return <div>Loading...</div>

  return <div>{survey.title}</div>
}
```

### With Error Handling

```typescript
export function SurveyList() {
  const { data, error, status } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (status === 'pending') return <div>Loading...</div>

  if (status === 'error') {
    return (
      <div className="error">
        <p>{error?.message}</p>
        <button>Retry</button>
      </div>
    )
  }

  return <div>{data?.length} surveys</div>
}
```

### Multiple Queries

```typescript
export function Dashboard() {
  const surveysQuery = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })

  const isLoading = surveysQuery.isLoading || statsQuery.isLoading

  if (isLoading) return <div>Loading...</div>

  return (
    <>
      <SurveyList data={surveysQuery.data} />
      <Stats data={statsQuery.data} />
    </>
  )
}
```

### With Retry & Polling

```typescript
export function LiveStats() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    retry: 3,                    // Retry 3 times
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 1000 * 30,  // Refetch every 30 seconds
  })

  return <div>Stats: {stats}</div>
}
```

---

## Writing Data (useMutation)

### Simple Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSurvey } from './actions'

export function CreateSurveyForm() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    mutation.mutate({
      title: formData.get('title') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <button
        type="submit"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Creating...' : 'Create'}
      </button>

      {mutation.error && (
        <div>{mutation.error.message}</div>
      )}
    </form>
  )
}
```

### Create with Validation

```typescript
const mutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: (result) => {
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      router.push(`/surveys/${result.surveyId}`)
    } else {
      // Handle server-side validation error
      setFormError(result.error)
    }
  },
  onError: (error) => {
    // Handle network/other errors
    console.error('Create failed:', error)
  },
})
```

### Update Mutation

```typescript
const updateMutation = useMutation({
  mutationFn: (data) => updateSurvey(surveyId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['surveys', surveyId],
    })
  },
})

<button onClick={() => updateMutation.mutate({ title: newTitle })}>
  Save
</button>
```

### Delete with Confirmation

```typescript
const deleteMutation = useMutation({
  mutationFn: deleteSurvey,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
    router.push('/surveys')  // Navigate away
  },
})

<button
  onClick={() => {
    if (confirm('Delete?')) {
      deleteMutation.mutate(surveyId)
    }
  }}
  disabled={deleteMutation.isPending}
>
  Delete
</button>
```

### Optimistic Update

```typescript
const updateMutation = useMutation({
  mutationFn: (data) => updateSurvey(surveyId, data),

  onMutate: async (newData) => {
    // Cancel queries
    await queryClient.cancelQueries({
      queryKey: ['surveys', surveyId],
    })

    // Save old data
    const oldData = queryClient.getQueryData(['surveys', surveyId])

    // Update UI immediately
    queryClient.setQueryData(['surveys', surveyId], (old) => ({
      ...old,
      ...newData,
    }))

    return { oldData }
  },

  onError: (_, __, context) => {
    // Rollback on error
    if (context?.oldData) {
      queryClient.setQueryData(['surveys', surveyId], context.oldData)
    }
  },

  onSuccess: () => {
    // Confirm update
    queryClient.invalidateQueries({ queryKey: ['surveys', surveyId] })
  },
})
```

---

## Cache Management

### Invalidate Queries

```typescript
const queryClient = useQueryClient()

// Invalidate all
queryClient.invalidateQueries()

// Invalidate specific key
queryClient.invalidateQueries({ queryKey: ['surveys'] })

// Invalidate with ID
queryClient.invalidateQueries({ queryKey: ['surveys', surveyId] })

// Partial match
queryClient.invalidateQueries({
  queryKey: ['survey'],
  exact: false,  // Matches ['survey*']
})
```

### Manual Cache Updates

```typescript
// Set data
queryClient.setQueryData(['surveys', surveyId], {
  id: surveyId,
  title: 'New Title',
})

// Get data
const cached = queryClient.getQueryData(['surveys', surveyId])

// Update function
queryClient.setQueryData(['surveys'], (old) => [
  ...old,
  newSurvey,
])

// Remove
queryClient.removeQueries({ queryKey: ['surveys'] })

// Clear all
queryClient.clear()
```

### Prefetch Data

```typescript
const queryClient = useQueryClient()

<Link
  href={`/survey/${surveyId}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['surveys', surveyId],
      queryFn: () => getSurvey(surveyId),
    })
  }}
>
  View
</Link>
```

---

## Query Functions (queries.ts)

### Basic Pattern

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'

// Always return typed data
export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  // Throw errors (don't return)
  if (error) throw error

  return data || []
}

// Single item
export async function getSurvey(id: string): Promise<Tables<'surveys'>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Survey not found')

  return data
}

// With joins
export async function getSurveyWithLinks(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select(`
      *,
      survey_links (
        id,
        token,
        submission_count
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
```

---

## Server Actions (actions.ts)

### Create Pattern

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSurvey(data: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get tenant
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    // Create
    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title: data.title,
        description: data.description || null,
        tenant_id: userData.tenant_id,
        created_by: user.id,
        questions: [],
        status: 'draft',
      })
      .select()
      .single()

    if (error || !survey) {
      return { success: false, error: error?.message || 'Failed' }
    }

    revalidatePath('/admin/surveys')
    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Internal error' }
  }
}
```

### Update Pattern

```typescript
export async function updateSurvey(
  id: string,
  updates: { title?: string; description?: string; questions?: any[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('surveys')
      .update(updates)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/surveys')
    revalidatePath(`/admin/surveys/${id}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Internal error' }
  }
}
```

### Delete Pattern

```typescript
export async function deleteSurvey(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/surveys')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Internal error' }
  }
}
```

---

## Common Patterns

### Fetch + Display

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
})

if (isLoading) return <Skeleton />
if (error) return <ErrorAlert error={error} />

return <List items={data} />
```

### Create + Refetch

```typescript
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: createSurvey,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  },
})
```

### Delete + Navigate

```typescript
const router = useRouter()

const mutation = useMutation({
  mutationFn: deleteSurvey,
  onSuccess: () => {
    router.push('/surveys')
  },
})
```

### Error + Retry

```typescript
const { error, refetch } = useQuery({...})

if (error) {
  return (
    <div>
      Error: {error.message}
      <button onClick={() => refetch()}>Retry</button>
    </div>
  )
}
```

---

## Debugging

### Enable DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Check Cache

```typescript
// In browser console
queryClient.getQueryData(['surveys'])
queryClient.getQueryState(['surveys'])
queryClient.isFetching()
```

### Monitor Queries

```typescript
// In DevTools:
// - Queries tab: See all cached data
// - Mutations tab: See mutation history
// - Use search to find specific keys
// - Clear cache button available
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Data not updating | Call `invalidateQueries()` after mutation |
| Memory leak | Increase `gcTime` or use `type: 'inactive'` |
| Slow queries | Check `staleTime`, use prefetch, parallel queries |
| Duplicate requests | Already deduplicated by TanStack Query |
| Error not shown | Make sure to `throw` error in query function |
| Cache not clearing | Call `queryClient.clear()` or remove specific key |
| Race conditions | Disable UI during mutation with `isPending` |
| Infinite refetch loop | Check `refetchInterval`, disable auto-refetch |

---

## TypeScript Types

```typescript
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import type { Tables } from '@agency/database'

// Query return type
type SurveysQuery = UseQueryResult<Tables<'surveys'>[], Error>

// Mutation return type
type CreateMutation = UseMutationResult<
  { success: boolean; surveyId?: string },
  Error,
  { title: string; description?: string },
  unknown
>
```

---

## Useful Commands

```bash
# Install
npm install @tanstack/react-query @tanstack/react-query-devtools

# Types
npm install -D @tanstack/react-query@beta  # For latest types

# DevTools
npm install -D @tanstack/react-query-devtools
```

---

## Links

- [Official Docs](https://tanstack.com/query/latest)
- [API Reference](https://tanstack.com/query/latest/docs/react/reference)
- [Error Handling](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Devtools](https://tanstack.com/query/latest/docs/react/devtools)

---

Last updated: 2025-12-12
