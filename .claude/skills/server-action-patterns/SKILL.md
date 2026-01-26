---
name: server-action-patterns
description: Use when creating Server Actions for mutations. Critical patterns - structured return types (no throws), revalidatePath after mutations, Server client with await. Prevents common mistakes from Phase 2.
---

# Server Action Patterns - Data Mutations

## Purpose

Server Action patterns: structured return type `{ success, data?, error? }`, revalidatePath after mutations, Server Supabase client (NOT browser client).

## When to Use

- Creating Server Actions (data mutations)
- Server Action returns inconsistent types
- Missing revalidatePath (stale cache)
- Using wrong Supabase client

## Critical Patterns

### Structured Return Type

**Project requirement:**

```typescript
// ✅ CORRECT - Structured result
export async function createSurvey(
  data: CreateSurveyInput
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    // ...
    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Failed to create survey' }
  }
}

// ❌ WRONG - Throws errors
export async function createSurvey(data: CreateSurveyInput) {
  const result = await supabase.from('surveys').insert(data)
  if (result.error) throw new Error(result.error.message)  // Crashes middleware!
  return result.data
}
```

**Why structured:**
- Throwing errors in Server Actions crashes Next.js middleware
- Type-safe error handling in components
- Consistent interface across all actions

### Server Client (await required)

```typescript
// ❌ WRONG - Browser client
'use server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()  // Wrong client!

// ✅ CORRECT - Server client
'use server'
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()  // AWAIT required!
```

**Why:** Server Actions run on server, need server client (cookies access)

### revalidatePath After Mutations

**Critical for cache:**

```typescript
'use server'
import { revalidatePath } from 'next/cache'

export async function updateSurvey(id: string, data: UpdateData) {
  const supabase = await createClient()
  const { error } = await supabase.from('surveys').update(data).eq('id', id)

  if (error) return { success: false, error: error.message }

  // CRITICAL: Clear cache
  revalidatePath('/admin/surveys')
  revalidatePath(`/admin/surveys/${id}`)

  return { success: true }
}
```

**Why:** Next.js caches pages. Without revalidate, users see stale data.

## Quick Reference

**Server Action template:**

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actionName(
  input: InputType
): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check (if needed)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Database operation
    const { data, error } = await supabase.from('table').insert(input)
    if (error) return { success: false, error: error.message }

    // Revalidate
    revalidatePath('/path')

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Internal error' }
  }
}
```

**Checklist:**
- [ ] 'use server' directive
- [ ] Server client (await createClient())
- [ ] Structured return { success, data?, error? }
- [ ] revalidatePath after mutation
- [ ] Try-catch wrapper
- [ ] User-friendly error messages

## Real Bug Fixed

**Phase 2:** Throwing errors in Server Actions crashed Next.js middleware
**Fix:** Changed to structured returns `{ success, error }`
**Impact:** Stable error handling across all actions

---

**Key Lesson:** Structured returns, Server client with await, revalidatePath always.
