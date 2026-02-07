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

**Pattern:** `{ success, data?, error? }`

```typescript
// ✅
export async function createSurvey(
  data: CreateSurveyInput
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    return { success: true, surveyId: survey.id }
  } catch {
    return { success: false, error: 'Failed' }
  }
}
```

**Why:** Throwing errors crashes Next.js middleware (Phase 2 bug)

### Server Client (await required)

```typescript
// ✅
'use server'
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // AWAIT required
```

### revalidatePath After Mutations

```typescript
import { revalidatePath } from 'next/cache'

revalidatePath('/admin/surveys')
```

**Why:** Next.js caches → without revalidate, stale data

## Quick Reference

**Template:**

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actionName(input: InputType): Promise<{ success: boolean; data?: DataType; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('table').insert(input)
    if (error) return { success: false, error: error.message }
    revalidatePath('/path')
    return { success: true, data }
  } catch {
    return { success: false, error: 'Error' }
  }
}
```

## Real Bug Fixed

**Phase 2:** Throwing errors in Server Actions crashed Next.js middleware
**Fix:** Changed to structured returns `{ success, error }`
**Impact:** Stable error handling across all actions

---

**Key Lesson:** Structured returns, Server client with await, revalidatePath always.
