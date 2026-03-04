# Server Actions Patterns

## Basic Structure

```typescript
'use server'  // ← MUST be first line

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables, TablesInsert } from '@agency/database'

export async function actionName(
  input: InputType
): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()  // ← AWAIT required

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

---

## Example: Create with Auth & Tenant

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables, TablesInsert } from '@agency/database'

export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

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
      .insert(surveyData as any)
      .select()
      .single()

    if (insertError || !survey) {
      return { success: false, error: insertError?.message || 'Failed to create survey' }
    }

    revalidatePath('/admin/surveys')
    return { success: true, surveyId: (survey as Tables<'surveys'>).id }
  } catch (error) {
    return { success: false, error: 'Failed to create survey' }
  }
}
```

---

## Example: Update

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

    // Revalidate multiple paths
    revalidatePath('/admin/surveys')
    revalidatePath(`/admin/surveys/${id}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update survey' }
  }
}
```

---

## Example: Delete

```typescript
'use server'

export async function deleteSurvey(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('surveys').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/surveys')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete survey' }
  }
}
```

---

## Key Rules

1. **`'use server'` must be first line** - No imports or code before it

2. **Always await createClient()** - Server client is async

3. **Return structured result** - `{ success, data?, error? }`

4. **Always revalidatePath()** - Bust Next.js cache after mutations

5. **Try-catch everything** - Never let errors bubble up

6. **User-friendly errors** - Don't expose database internals

7. **Type assertions when needed** - Supabase inference can be incomplete

---

## Calling from Components

```typescript
'use client'

import { createSurvey } from '../actions'

function CreateSurveyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)

    const result = await createSurvey({
      title: data.title,
      description: data.description
    })

    if (result.success) {
      router.push(`/admin/surveys/${result.surveyId}`)
    } else {
      setError(result.error || 'Failed to create')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```
