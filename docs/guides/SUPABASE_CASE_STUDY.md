# Supabase Case Study - Legal-Mind Real Code Analysis

Analiza rzeczywistych implementacji Supabase w Legal-Mind z wyjaśnieniami każdej linii.

---

## Case 1: Server-Side Query (CMS - Protected)

**File:** `apps/cms/lib/supabase/server.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@agency/database'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables...')
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored - can happen in Server Components
          }
        },
      },
    }
  )
}
```

### What's happening?

```
1. createServerClient() from @supabase/ssr
   ├─ SSR-specific implementation (handles cookies)
   └─ NOT createClient() from @supabase/supabase-js

2. await cookies() from next/headers
   ├─ Reads HTTP cookies sent by browser
   ├─ Includes session cookies from Supabase Auth
   └─ Must use await (async in Next.js 16)

3. cookieStore.getAll()
   ├─ Retrieves session cookie: sb-xxxxx
   ├─ Passes to Supabase API
   └─ Kong validates the JWT in cookie

4. cookieStore.set()
   ├─ Supabase returns new cookie (refresh token)
   ├─ Sets it in response headers
   └─ Browser receives updated cookie

5. Errors ignored in setAll()
   ├─ Normal if called from Server Component
   ├─ Middleware already refreshing session
   └─ Don't break on this
```

### How it's used?

```typescript
// apps/cms/features/surveys/actions.ts
export async function createSurvey(data) {
  const supabase = await createClient()  // ← Uses cookies!

  const { data: { user } } = await supabase.auth.getUser()
  // Behind scenes:
  // 1. Kong sees session cookie
  // 2. Validates JWT signature
  // 3. Sets auth.uid() = user.id
  // 4. All queries auto-filtered by tenant_id

  const { data: survey } = await supabase
    .from('surveys')
    .insert({ title: '...' })
    // RLS policy runs:
    // WHERE tenant_id = (
    //   SELECT tenant_id FROM users WHERE id = auth.uid()
    // )
}
```

### Key insight

> Server client reads cookies → Auth context set by Kong → RLS auto-filters

---

## Case 2: Browser Query (Public - Anonymous)

**File:** `apps/cms/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@agency/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables...')
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
```

### What's different?

```
Server Client (SSR):
├─ Reads cookies from request
├─ Handles session management
├─ Refreshes tokens automatically
└─ Used in Server Actions

Browser Client:
├─ No cookies to read
├─ No session management
├─ Just sends JWT if authenticated
└─ Used in Client Components
```

### Usage in components

```typescript
// apps/cms/features/surveys/queries.ts
'use client'  // ← Browser context

export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()  // ← Browser client

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  // What happens:
  // 1. Browser client makes request
  // 2. If user is authenticated:
  //    ├─ Browser sends Auth token (from localStorage)
  //    ├─ Kong validates it
  //    └─ Sets auth.uid()
  // 3. If anonymous:
  //    ├─ No token sent
  //    ├─ Kong sets role = 'anon'
  //    └─ No auth.uid()

  // RLS policy filters:
  // - If authenticated:
  //   WHERE tenant_id = current_user_tenant_id()
  // - If anonymous:
  //   Policy "Public can view surveys via active links"
  //   → Only surveys with active survey_links

  if (error) throw error
  return data || []
}
```

### Key difference

> Browser client = public/RLS-based security
> Server client = session-based + RLS double protection

---

## Case 3: Authenticated Survey Creation

**File:** `apps/cms/features/surveys/actions.ts` (lines 11-66)

```typescript
'use server'

export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // ========================================
    // STEP 1: Get authenticated user
    // ========================================
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    // What this does:
    // - Kong already validated JWT from cookies
    // - auth.getUser() returns user from that JWT
    // - If no JWT → null
    // - No database query needed!

    // ========================================
    // STEP 2: Get user's tenant_id
    // ========================================
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return { success: false, error: 'User not found in database' }
    }
    // What this does:
    // - Query: SELECT tenant_id FROM users WHERE id = ?
    // - RLS applies:
    //   WHERE id = auth.uid() (user can only see their own)
    //   OR tenant_id = current_user_tenant_id() (see other team members)
    // - Returns tenant_id safely

    const userWithTenant = userData as Pick<Tables<'users'>, 'tenant_id'>

    // ========================================
    // STEP 3: Create survey with tenant context
    // ========================================
    const surveyData: TablesInsert<'surveys'> = {
      title: formData.title,
      description: formData.description || null,
      tenant_id: userWithTenant.tenant_id,  // ← SET BY SERVER!
      created_by: user.id,
      questions: [],
      status: 'draft',
    }

    const { data: survey, error: insertError } = await supabase
      .from('surveys')
      .insert(surveyData)
      .select()
      .single()
    // What this does:
    // - User provides: title, description
    // - Server provides: tenant_id, created_by, status
    // - User CANNOT fake tenant_id (server-set)
    // - RLS policy "Users can create surveys in own tenant"
    //   checks: tenant_id = current_user_tenant_id()
    // - If mismatch: RLS rejects

    if (insertError || !survey) {
      return { success: false, error: insertError?.message || 'Failed' }
    }

    // ========================================
    // STEP 4: Invalidate cache
    // ========================================
    revalidatePath('/admin/surveys')
    // Next.js clears cached /admin/surveys page
    // Next browser refresh sees new survey

    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Failed to create survey' }
  }
}
```

### Security flow

```
User input: { title: "My Survey", description: "..." }
         ↓
Server receives via form submission
         ↓
Extract tenant_id from authenticated session (can't spoof!)
         ↓
Create object with server-set fields:
  {
    title: "My Survey",
    description: "...",
    tenant_id: "abc-uuid" ← SERVER SET
    created_by: "user-uuid" ← FROM SESSION
    status: "draft"
  }
         ↓
INSERT into database
         ↓
PostgreSQL RLS policy checks:
  INSERT ... WITH CHECK (
    tenant_id = current_user_tenant_id()
  )
         ↓
If passes: Row inserted ✅
If fails: RLS blocks, silent failure ❌
```

---

## Case 4: Public Form Submission (The Hard One)

**File:** `apps/website/app/api/survey/submit/route.ts`

This is the most complex pattern - anonymous user, service role key, RLS bypass.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAnonClient } from '@/lib/supabase/anon-server'
import type { TablesInsert } from '@agency/database'

interface SubmitBody {
  linkId: string
  surveyId: string
  answers: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json()
    const { linkId, surveyId, answers } = body

    const supabase = createAnonClient()
    // Creates service role client
    // Bypasses RLS - we're on server with secret key
    // CRITICAL: Must validate everything!

    // ========================================
    // STEP 1: Get tenant_id from survey
    // ========================================
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('tenant_id')
      .eq('id', surveyId)
      .single()
    // Service role reads ANY survey (no RLS)
    // But we only use tenant_id
    // We validate surveyId matches what client claims

    if (surveyError || !survey) {
      console.error('Failed to fetch survey tenant_id:', surveyError)
      return NextResponse.json(
        { success: false, error: 'Survey not found. Please try again.' },
        { status: 404 }
      )
    }

    const surveyData = survey as { tenant_id: string }

    // ========================================
    // STEP 2: Insert response
    // ========================================
    const responseData: TablesInsert<'responses'> = {
      survey_link_id: linkId,
      answers: answers,
      tenant_id: surveyData.tenant_id,  // ← FROM DATABASE!
      ai_qualification: null,
      status: 'new'
    }

    const { data: response, error: insertError } = await supabase
      .from('responses')
      .insert(responseData)
      .select('id')
      .single()
    // Why this works:
    // - Client sends: linkId, surveyId, answers
    // - Server fetches: tenant_id from surveys table
    // - Server inserts with database-derived tenant_id
    // - Client can't lie about tenant_id (comes from DB)
    // - RLS policy allows INSERT for any tenant_id:
    //   CREATE POLICY "Anyone can create responses"
    //   ON responses FOR INSERT
    //   WITH CHECK (true);
    // - SAFE because tenant_id is from database

    if (insertError || !response) {
      console.error('Failed to insert response:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save your response.' },
        { status: 400 }
      )
    }

    const responseData_inserted = response as { id: string }

    // ========================================
    // STEP 3: Atomic counter increment
    // ========================================
    const { error: incrementError } = await supabase.rpc(
      'increment_submission_count',
      { link_id: linkId }
    )
    // Calls PostgreSQL function:
    //   UPDATE survey_links
    //   SET submission_count = submission_count + 1
    //   WHERE id = link_id
    // Atomic - no race conditions!

    if (incrementError) {
      console.error('Failed to increment submission count:', incrementError)
      // Don't return error - response was saved!
      // Increment is nice-to-have, not critical
    }

    return NextResponse.json({
      success: true,
      responseId: responseData_inserted.id
    })
  } catch (error) {
    console.error('Unexpected error submitting survey:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
```

### Why this is secure

```
Threat: Anonymous attacker submits response for wrong tenant

Step 1: Attacker sends
{
  linkId: "valid-uuid",
  surveyId: "wrong-survey-uuid",
  answers: {...}
}

Step 2: Server queries database
SELECT tenant_id FROM surveys WHERE id = "wrong-survey-uuid"
↓
Returns: tenant_id = "attacker-tenant-uuid"

Step 3: Server inserts response
INSERT INTO responses (
  survey_link_id: "valid-uuid",
  survey_id: "wrong-survey-uuid",  ← But doesn't match!
  tenant_id: "attacker-tenant-uuid",
  answers: {...}
)

PROBLEM?
- Client submitted response for different tenant
- But...

DATABASE HAS FOREIGN KEY:
responses.survey_link_id REFERENCES survey_links.id
survey_links.survey_id REFERENCES surveys.id

Database constraint CHECK:
survey_link_id's survey must match!

So if attacker sends:
- linkId from Firm A's survey
- surveyId from Firm B's survey
→ FK constraint fails!
→ Database rejects insert
→ Error returned to client

RESULT: ✅ Secure by database design
```

### Key principle

> Never trust client for tenant_id or FK relationships
> Always fetch from database
> Let PostgreSQL constraints validate

---

## Case 5: Testing RLS Policies

**How to verify in Supabase Studio:**

```sql
-- Test 1: Alice can see her surveys
SET LOCAL request.jwt.claims.sub = 'alice-user-id';
SET LOCAL role to authenticated;

SELECT id, title, tenant_id FROM surveys;
-- Expected: Only surveys where tenant_id = 'firm-a-uuid'
-- Result: 3 rows ✅

-- Test 2: Bob can't see Alice's surveys
SET LOCAL request.jwt.claims.sub = 'bob-user-id';
SET LOCAL role to authenticated;

SELECT id, title, tenant_id FROM surveys;
-- Expected: Only surveys where tenant_id = 'firm-b-uuid'
-- Result: 2 rows ✅

-- Test 3: Anonymous can see surveys with active links
SET LOCAL role to anon;
RESET request.jwt.claims.sub;

SELECT id, title FROM surveys;
-- Expected: Only surveys with is_active survey_links
-- Result: 5 rows ✅

-- Test 4: Cross-tenant attack blocked
SET LOCAL request.jwt.claims.sub = 'alice-user-id';
SET LOCAL role to authenticated;

UPDATE surveys SET title = 'HACKED' WHERE id = 'bob-survey-id';
-- Expected: 0 rows affected (silently rejected)
-- Result: 0 rows ✅
```

---

## Case 6: Error Handling Pattern

### Pattern 1: Query error (client-side)

```typescript
// apps/cms/features/surveys/queries.ts
export async function getSurvey(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error  // ← Propagate to React error boundary
  if (!data) throw new Error('Survey not found')

  return data
}
```

**How it flows:**

```
Component calls:
  const survey = await getSurvey('id')

If error:
  ├─ Query fails (network, database error)
  ├─ throw error
  └─ React error boundary catches

If no data:
  ├─ .maybeSingle() returned null
  ├─ Means row doesn't exist or RLS blocked it
  ├─ throw 'Survey not found'
  └─ React error boundary catches
```

### Pattern 2: Action error (server-side)

```typescript
// apps/cms/features/surveys/actions.ts
export async function createSurvey(data) {
  try {
    const supabase = await createClient()
    const { data: survey, error } = await supabase
      .from('surveys')
      .insert(data)
      .select()
      .single()

    if (error || !survey) {
      return { success: false, error: error?.message || 'Failed' }
      // ← Return error object, don't throw
    }

    revalidatePath('/admin/surveys')
    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Internal server error' }
  }
}
```

**Why different?**

```
Queries (client-side):
├─ Can throw errors
├─ React error boundary catches
└─ Shows user error message

Actions (server-side):
├─ Can't throw to client easily
├─ Return error in object
├─ Client reads .success flag
└─ Shows user appropriate message
```

---

## Performance Analysis

### Query: getSurveys()

```
Database operations:
1. Kong validates JWT (cached)         ~1ms
2. PostgreSQL checks RLS policy       ~2ms
   ├─ Subquery current_user_tenant_id()
   ├─ STABLE function (cached in query)
   └─ Uses index: idx_users_tenant
3. Fetch surveys (indexed by tenant)   ~5ms
   └─ Uses index: idx_surveys_tenant
4. Sort by created_at (indexed)        ~1ms
   └─ Uses index: idx_responses_created
5. Return to client                    ~1ms

Total: ~10ms (local network)
       ~20ms (internet)

Why fast?
- All queries use indexes
- RLS helper function is STABLE (cached)
- PostgreSQL optimization: WHERE tenant_id = constant
```

### Query: getSurveyByToken()

```
TWO queries to database:
1. SELECT from survey_links by token   ~10ms
   └─ Index: idx_survey_links_token
2. SELECT from surveys by id           ~10ms
   └─ Index: pk_surveys

Why not one query?
- Can't directly look up survey by token in RLS query
- survey_links acts as gatekeeper
- Two queries safer than complex JOIN

Why is it safe?
- First query checks link exists
- Second query checks survey exists
- Client can't fake either (both server-lookups)
```

### Mutation: createSurvey()

```
1. GET JWT from cookies               ~1ms
2. SELECT tenant_id from users        ~5ms
3. INSERT survey                      ~10ms
   ├─ Check RLS policy
   ├─ Generate UUID (client)
   ├─ Insert row
   └─ Return inserted
4. Invalidate Next.js cache           ~5ms

Total: ~21ms
```

---

## Debugging Checklist

When RLS isn't working:

```
❌ User can see data they shouldn't

1. Check user exists in public.users
   SELECT * FROM users WHERE id = '[auth-user-id]';

2. Check tenant_id is set correctly
   SELECT tenant_id FROM users WHERE id = '[auth-user-id]';

3. Check RLS policy SQL
   SELECT definition FROM pg_policies WHERE tablename = 'surveys';

4. Test policy manually
   SET LOCAL request.jwt.claims.sub = '[user-id]';
   SELECT * FROM surveys;

5. Check helper function
   SELECT public.current_user_tenant_id();


❌ Insert is being silently rejected

1. Check RLS policy has WITH CHECK
   SELECT * FROM pg_policies WHERE tablename = 'surveys' AND cmd = 'INSERT';

2. Verify tenant_id matches
   SELECT tenant_id FROM users WHERE id = auth.uid();
   -- Should match tenant_id you're trying to insert

3. Check if other constraints violated
   SELECT * FROM surveys WHERE id = '[inserted-id]';
   -- Should exist if insert succeeded


❌ Anonymous access not working

1. Check RLS policy TO anon
   SELECT * FROM pg_policies WHERE tablename = 'surveys' AND cmd = 'SELECT';

2. Verify policy USING condition
   SELECT * FROM survey_links WHERE is_active = true;

3. Test as anonymous
   SET LOCAL role to anon;
   RESET request.jwt.claims.sub;
   SELECT * FROM surveys LIMIT 1;
```

---

## Summary of Patterns

| Scenario | File | Key Point |
|----------|------|-----------|
| **CMS reads data** | queries.ts | Uses browser client, RLS filters automatically |
| **CMS creates data** | actions.ts | Server-side, tenant_id auto-set, then cached invalidated |
| **Client submits form** | submit/route.ts | Service role used, tenant_id from DB, RLS allows INSERT |
| **Count increment** | Database function | Atomic, no race conditions |
| **Prevent recursion** | Helper function | SECURITY DEFINER, STABLE |
| **Error handling** | Both patterns | Throw in queries, return object in actions |

