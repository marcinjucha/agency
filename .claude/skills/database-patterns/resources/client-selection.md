# Supabase Client Selection

## Server Client (for Server Components & Actions)

**File:** `apps/{app}/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@agency/database'

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

---

## Browser Client (for Client Components)

**File:** `apps/{app}/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@agency/database'

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

---

## Anon Server Client (for Public Submissions)

**File:** `apps/website/lib/supabase/anon-server.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'

// Service role client — bypasses RLS
// SAFE for: public survey submissions (INSERT only, tenant_id from DB)
// DO NOT use for: reading data, CMS operations
export function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}
```

**Usage:**
```typescript
import { createAnonClient } from '@/lib/supabase/anon-server'

export async function submitSurvey(data: SubmissionData) {
  const supabase = createAnonClient()  // ← NO await, sync
  // tenant_id MUST come from DB, never from user input
  const { data: survey } = await supabase.from('surveys').select('tenant_id').eq('id', surveyId).single()
  await supabase.from('responses').insert({ tenant_id: survey.tenant_id, ... })
}
```

---

## Decision Table

| Context | Client | Import From | Async? |
|---------|--------|-------------|--------|
| Server Component | Server | `@/lib/supabase/server` | ✅ Yes (`await`) |
| Server Action (`'use server'`) | Server | `@/lib/supabase/server` | ✅ Yes (`await`) |
| Client Component (`'use client'`) | Browser | `@/lib/supabase/client` | ❌ No |
| Query function (called from browser) | Browser | `@/lib/supabase/client` | ❌ No |
| Public submission (website) | Anon Server | `@/lib/supabase/anon-server` | ❌ No |

---

## Common Mistakes

### Mistake 1: Forgetting await on Server Client

```typescript
// ❌ WRONG
const supabase = createClient()  // Missing await!

// ✅ CORRECT
const supabase = await createClient()
```

### Mistake 2: Using Server Client in Client Component

```typescript
// ❌ WRONG - Server client in 'use client' component
'use client'
import { createClient } from '@/lib/supabase/server'  // Wrong import!

// ✅ CORRECT
'use client'
import { createClient } from '@/lib/supabase/client'
```

### Mistake 3: Using Browser Client in Server Action

```typescript
// ❌ WRONG - Browser client in Server Action
'use server'
import { createClient } from '@/lib/supabase/client'  // Wrong import!

// ✅ CORRECT
'use server'
import { createClient } from '@/lib/supabase/server'
```

---

## Why Three Clients?

**Server Client:**
- Has access to cookies for auth
- Runs in Node.js environment
- Can use Next.js server features
- Required for Server Actions and Server Components

**Browser Client:**
- Runs in browser
- Uses browser storage for auth
- Works with TanStack Query
- Used in Client Components and query functions

**Anon Server Client:**
- Service role key (bypasses RLS)
- For public endpoints where no user auth exists
- Safe only for INSERT-only operations with `tenant_id` from DB
- Lives only in website app (`apps/website/lib/supabase/anon-server.ts`)
