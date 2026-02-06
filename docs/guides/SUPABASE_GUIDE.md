# Supabase Deep Dive - Legal-Mind Implementation

Praktyczny przewodnik zrozumienia Supabase na bazie rzeczywistego kodu Legal-Mind.

---

## Spis treści

1. [Co to jest Supabase?](#co-to-jest-supabase)
2. [Architektura](#architektura)
3. [Authentication & Sessions](#authentication--sessions)
4. [Row Level Security (RLS) - Fundament](#row-level-security-rls---fundament)
5. [Multi-Tenancy Pattern](#multi-tenancy-pattern)
6. [Queries (Czytanie danych)](#queries-czytanie-danych)
7. [Actions (Pisanie danych)](#actions-pisanie-danych)
8. [Praktyczne scenariusze](#praktyczne-scenariusze)
9. [Troubleshooting](#troubleshooting)

---

## Co to jest Supabase?

**Supabase = Firebase dla puścizny (PostgreSQL)**

Supabase to open-source backend stworzony na bazie PostgreSQL. Zapewnia:

- **PostgreSQL Database** - potężna relacyjna baza danych
- **Authentication (Auth)** - zarządzanie użytkownikami i sesją
- **Row Level Security (RLS)** - security na poziomie wierszy
- **Realtime** - WebSocket updates (nie stosujemy, ale jest dostępne)
- **Storage** - bucket dla plików
- **Edge Functions** - serverless functions (zamiast n8n w Phase 5)

### Cloud vs Local

```bash
# Development: Local Supabase (Docker)
supabase start          # Uruchamia PostgreSQL, Auth, API Gateway

# Production: Supabase Cloud
https://zsrpdslhnuwmzewwoexr.supabase.co
```

---

## Architektura

### Komponenty

```
┌─────────────────────────────────────┐
│         Next.js App                 │
│  (browser) (apps/website/cms)       │
└──────────────┬──────────────────────┘
               │
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│    Supabase API Gateway (Kong)      │
│         Port 54321 (local)          │
└──────────────┬──────────────────────┘
               │
       ┌───────┼────────┐
       │       │        │
       ▼       ▼        ▼
    ┌─────────────────────────────┐
    │   Authentication (GoTrue)   │  ← Session management
    │                             │
    │   PostgreSQL Database       │  ← Actual data
    │                             │
    │   Row Level Security (RLS)  │  ← Access control
    └─────────────────────────────┘
```

### How requests work

```
1. Browser/Server sends request:
   GET /rest/v1/surveys?select=*
   Authorization: Bearer jwt_token

2. Kong Gateway (API)
   - Validates JWT token
   - Sets auth context (auth.uid(), auth.role())

3. PostgreSQL
   - Checks RLS policies using auth context
   - Only returns rows that pass RLS checks
   - Returns filtered data

4. Response back to client
```

---

## Authentication & Sessions

### Jak to działa w Legal-Mind (CMS)

#### 1. Login

```typescript
// apps/cms/app/login/page.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'lawyer@firm.com',
  password: 'password123'
})

// Supabase zwraca:
// {
//   session: {
//     access_token: "eyJ...",      // JWT valid for 1 hour
//     refresh_token: "...",         // For refreshing
//     expires_at: 1234567890
//   },
//   user: { id: 'uuid', email: '...' }
// }
```

#### 2. Session Storage (Next.js SSR pattern)

Supabase przechowuje sesję w **HTTP-only cookies** (nie w localStorage):

```typescript
// apps/cms/lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies()  // Next.js cookies

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()  // Read cookies
        },
        setAll(cookiesToSet) {
          // Write new cookies (refresh token)
          cookiesToSet.forEach(({ name, value }) =>
            cookieStore.set(name, value)
          )
        }
      }
    }
  )
}
```

**Dlaczego cookies a nie localStorage?**
- ✅ HTTP-only cookies - nie widać z JS (CSRF safe)
- ✅ Automatycznie wysyłane z każdym requestem
- ✅ Server może je odczytać i użyć
- ✅ Survives page reload

#### 3. Middleware Protection

```typescript
// apps/cms/middleware.ts
export function middleware(request: NextRequest) {
  // Jeśli /admin/* i brak sesji → redirect do /login
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('sb-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  return NextResponse.next()
}
```

#### 4. Logout

```typescript
// Sidebar button click
await supabase.auth.signOut()
// Cookies cleared, user redirected to /login
```

### Klucze API

```
ANON KEY:           NEXT_PUBLIC_SUPABASE_ANON_KEY
├─ Browser + Server
├─ Respects RLS policies
└─ Safe to expose publicly

SERVICE ROLE KEY:   SUPABASE_SERVICE_ROLE_KEY
├─ Server only (NEVER in browser!)
├─ Bypasses RLS
├─ For admin operations
└─ Keep SECRET in .env
```

**Praktycznie:**
- Twoje aplikacje zawsze używają ANON KEY (nawet authenticated users)
- RLS policies automatycznie filtrują dane na bazie `auth.uid()`

---

## Row Level Security (RLS) - Fundament

**RLS = Database-level security** - PostgreSQL sprawdza każdy query

### Concept: Who Am I?

```typescript
// Zalogowany user
auth.uid()         // Zwraca: UUID użytkownika
auth.role()        // Zwraca: 'authenticated' lub 'anon'
auth.email()       // Zwraca: email użytkownika
```

### Jak działa w Legal-Mind

#### Problem: Multi-tenant security

```
Kancelaria A         Kancelaria B
├─ Lawyer Alice      ├─ Lawyer Bob
└─ 100 surveys       └─ 200 surveys

❌ BEZ RLS:
SELECT * FROM surveys;
→ Alice widzi surveye Boba! Security breach!

✅ Z RLS:
SELECT * FROM surveys;
→ Alice widzi tylko swoje 100 surveyów
→ Bob widzi tylko swoje 200 surveyów
```

### Schema: Tenant Isolation

```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY,           -- auth.uid()
  tenant_id UUID NOT NULL,       -- Which law firm
  email TEXT,
  ...
);

-- surveys table
CREATE TABLE surveys (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,       -- Which firm owns this
  created_by UUID NOT NULL,      -- Which user created it
  title TEXT,
  questions JSONB,
  ...
);
```

### Helper Function (CRITICAL!)

```sql
-- Prevents infinite recursion in policies
CREATE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;
```

**SECURITY DEFINER** = runs as database owner (bypasses RLS on `users` query inside)
**STABLE** = cached within single query (performance)

### RLS Policies: Surveys Table

```sql
-- Policy 1: Authenticated users see only their tenant's surveys
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- Policy 2: Users can create surveys (for their tenant)
CREATE POLICY "Users can create surveys in own tenant"
  ON surveys FOR INSERT
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Policy 3: Users can update/delete their tenant's surveys
CREATE POLICY "Users can update own tenant surveys"
  ON surveys FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());
```

**Jak to działa:**

```typescript
// User Alice (tenant_id = 'abc123') wykonuje:
const { data } = await supabase.from('surveys').select('*')

// PostgreSQL robi wewnętrznie:
// SELECT * FROM surveys
// WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
//   AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid());
//
// → tenant_id zamieniamy na 'abc123' (z helper function)
// → Zwracane tylko surveye gdzie tenant_id = 'abc123'

// Nawet gdyby Alice wyślała:
// SELECT * FROM surveys WHERE id = 'xyz789'
// (xyz789 to survey z innego tenant-a)
//
// PostgreSQL i tak sprawdza RLS policy:
// → RLS policy wymaga: tenant_id = 'abc123'
// → Ale xyz789 ma tenant_id = 'def456'
// → DENIED ❌
```

### RLS Policies: Public Access (Clients)

```sql
-- Anyone can view survey_links by token (no auth required)
CREATE POLICY "Anyone can view survey links by token"
  ON survey_links FOR SELECT
  USING (true);

-- Anonymous users can create responses (submit forms)
CREATE POLICY "Anyone can create responses"
  ON responses FOR INSERT
  WITH CHECK (true);
```

**Safe because:**
- Survey UUIDs are not guessable (crypto random)
- survey_links.token is unique UUID (also not guessable)
- RLS doesn't prevent INSERT on responses (only checks field values)
- tenant_id automatically set from database, not from user input

---

## Multi-Tenancy Pattern

### The Model

```
tenants (law firms)
  ├─ id (UUID)
  ├─ name
  ├─ email
  └─ subscription_status

  ↓ 1:Many

users (lawyers within firms)
  ├─ id (UUID) ← linked to auth.uid()
  ├─ tenant_id ← FK to tenants
  ├─ email
  ├─ role (owner, admin, member)
  └─ google_calendar_token (OAuth)

  ↓ 1:Many

surveys
  ├─ id
  ├─ tenant_id ← determines access
  ├─ created_by
  ├─ questions (JSONB)

responses
  ├─ id
  ├─ survey_link_id
  ├─ tenant_id ← denormalized for RLS
  ├─ answers (JSONB)

appointments
  ├─ id
  ├─ tenant_id
  ├─ lawyer_id
```

**Key principle:** `tenant_id` on every table for RLS filtering

### Setup First User

```sql
-- 1. Create tenant (law firm)
INSERT INTO tenants (name, email)
VALUES ('Law Firm ABC', 'admin@lawfirm.com');
-- Returns: tenant_id = 'abc-uuid'

-- 2. Create auth user (via Supabase Dashboard UI)
-- Dashboard → Authentication → Users → Add User
-- Creates: auth.uid() = 'auth-uuid'

-- 3. Link auth user to tenant
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES ('auth-uuid', 'abc-uuid', 'admin@lawfirm.com', 'Alice', 'owner');

-- Now Alice can login and access her tenant's data!
```

---

## Queries (Czytanie danych)

### Pattern 1: Simple Query

```typescript
// features/surveys/queries.ts
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'

export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
```

**Co się dzieje:**

```
1. createClient()
   → Tworzy Supabase client z ANON_KEY

2. supabase.from('surveys').select('*')
   → Prepares query

3. .order('created_at', { ascending: false })
   → Adds ORDER BY

4. Execute (implicit via async)
   → POST to Kong API
   → Kong validates JWT (from cookies)
   → Kong sets auth.uid() context
   → PostgreSQL checks RLS:
      WHERE tenant_id = current_user_tenant_id()
   → Returns only user's tenant surveys

5. Returns: Promise<Tables<'surveys'>[]>
   → Fully typed from database schema!
```

### Pattern 2: Single Row with Validation

```typescript
export async function getSurvey(id: string): Promise<Tables<'surveys'>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()  // ← Returns null if not found (instead of error)

  if (error) throw error
  if (!data) throw new Error('Survey not found')

  return data
}
```

**Methods:**
- `.single()` - throws if 0 or 2+ rows
- `.maybeSingle()` - returns null if 0 rows, throws if 2+

### Pattern 3: Public Query (Anonymous)

```typescript
export async function getSurveyByToken(token: string) {
  const supabase = createClient()

  // Step 1: Get link (public access)
  const { data: link, error: linkError } = await supabase
    .from('survey_links')
    .select('survey_id')
    .eq('token', token)
    .maybeSingle()

  if (linkError) throw linkError
  if (!link) throw new Error('Survey link not found')

  // Step 2: Get survey (must be from active link)
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', link.survey_id)
    .maybeSingle()

  if (surveyError) throw surveyError
  if (!survey) throw new Error('Survey not found')

  return survey
}
```

**Why 2 queries?**
- First: Find token in survey_links (public access via policy)
- Second: Get survey by ID (public access via policy)
- Works for anonymous users!

### In React Components (TanStack Query)

```typescript
// features/surveys/components/SurveyList.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {surveys?.map((survey) => (
        <li key={survey.id}>{survey.title}</li>
      ))}
    </ul>
  )
}
```

**How TanStack Query works:**
1. Mounts component
2. Calls `getSurveys()` query function
3. Caches result under key `['surveys']`
4. Automatic refetch on 5-minute interval
5. If user creates survey, invalidate: `queryClient.invalidateQueries(['surveys'])`

---

## Actions (Pisanie danych)

### Pattern 1: Create with Tenant Context

```typescript
// features/surveys/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Step 1: Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Step 2: Get user's tenant_id
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (dbError || !userData) {
      return { success: false, error: 'User not found in database' }
    }

    // Step 3: Create survey with tenant context
    const { data: survey, error: insertError } = await supabase
      .from('surveys')
      .insert({
        title: formData.title,
        description: formData.description || null,
        tenant_id: userData.tenant_id,  // ← Set by server, not user
        created_by: user.id,
        questions: [],
        status: 'draft',
      })
      .select()
      .single()

    if (insertError || !survey) {
      return { success: false, error: insertError?.message || 'Failed' }
    }

    // Step 4: Revalidate cache
    revalidatePath('/admin/surveys')

    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Internal server error' }
  }
}
```

**CRITICAL:** `tenant_id` set by SERVER, never by user input!

### Pattern 2: Update (RLS Protection)

```typescript
export async function updateSurvey(
  id: string,
  data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'questions'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // RLS automatically ensures user can only update their tenant's surveys
    const { error } = await supabase
      .from('surveys')
      .update(data)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/surveys')
    revalidatePath(`/admin/surveys/${id}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Internal server error' }
  }
}
```

**RLS does the security:**
- If user tries to update survey from different tenant
- RLS policy checks: `tenant_id = current_user_tenant_id()`
- PostgreSQL rejects the update
- User sees: "No rows affected"

### Pattern 3: Public INSERT (Anonymous)

```typescript
// apps/website/app/api/survey/submit/route.ts
export async function POST(request: Request) {
  const { surveyLinkId, answers } = await request.json()

  // Get survey link with tenant_id
  const supabase = createAnonymousClient()  // Uses ANON_KEY

  const { data: link, error: linkError } = await supabase
    .from('survey_links')
    .select('survey_id, survey:surveys(tenant_id)')
    .eq('id', surveyLinkId)
    .maybeSingle()

  if (linkError || !link) {
    return Response.json({ error: 'Link not found' }, { status: 404 })
  }

  // Insert response (with tenant_id from database, not user)
  const { error: insertError } = await supabase
    .from('responses')
    .insert({
      survey_link_id: surveyLinkId,
      tenant_id: link.survey.tenant_id,  // ← From database!
      answers,
      status: 'new',
    })

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
```

**Security principle:** Never trust user input for `tenant_id`

---

## Praktyczne scenariusze

### Scenariusz 1: Lawyer Views Surveys

```typescript
// What Alice (tenant_id = 'abc') does:
const surveys = await getSurveys()

// Behind the scenes:
// 1. Browser sends request with session cookie
// 2. Kong validates JWT token (token has user_id = alice-uuid)
// 3. PostgreSQL runs RLS check:
//    SELECT * FROM surveys
//    WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = 'alice-uuid')
//    → tenant_id = 'abc'
// 4. Returns only Alice's surveys

// What happens if hacker tries:
const response = await fetch('/api/surveys', {
  headers: {
    // Tries to spoof auth token
    Authorization: 'Bearer eyJxxxxx'
  }
})
// Kong validates token signature
// → Invalid signature or expired
// → 401 Unauthorized
```

### Scenariusz 2: Client Submits Form

```typescript
// Client (unauthenticated) does:
// 1. Visits: website.com/survey/abc123def-token
// 2. Fetches survey by token:
//    getSurveyByToken('abc123def-token')
//    → Looks up survey_links table
//    → Finds survey_id = 'survey-xyz'
//    → Checks is_active = true
//    → Fetches survey details
// 3. Client fills form
// 4. Submits:
//    POST /api/survey/submit
//    { surveyLinkId, answers }
// 5. Backend:
//    - Gets tenant_id from survey_links join
//    - Creates response with tenant_id
//    - Calls increment_submission_count() function
//    - Function atomically updates counter
// 6. Client redirected to /success page

// Security:
// - Anonymous user can't guess survey_link_id (UUID)
// - Even if guessed, INSERT policy allows ANY tenant_id
// - But tenant_id comes from database (survey_links.survey_id)
// - Anonymous user can't modify other tenant's data
```

### Scenariusz 3: Attempting Cross-Tenant Attack

```typescript
// Alice (tenant_id = 'abc') tries:
const { data } = await supabase
  .from('surveys')
  .select('*')
  .eq('tenant_id', 'def456')  // Different tenant!

// PostgreSQL:
// 1. Checks RLS policy: tenant_id = current_user_tenant_id()
// 2. current_user_tenant_id() = 'abc'
// 3. Query wants WHERE tenant_id = 'def456'
// 4. AND tenant_id = 'abc'  (from RLS)
// 5. → false, no rows returned
// Alice sees empty array, no error

// Backend logs: "User abc attempted to access tenant def456"
// Security: Protected at database level
```

### Scenariusz 4: Changing RLS Policy

```typescript
// New requirement:
// "Surveys with questions containing 'urgent' should be visible to all lawyers"

// Current policy:
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

// Updated policy:
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR
    questions ->> 'priority' = 'urgent'
  );

// Now:
// - Alice sees her own tenant surveys
// - Alice sees surveys marked urgent from other tenants
// - RLS still enforced by PostgreSQL
// - No client-side security holes!

supabase db push  # Apply to production
npm run db:types  # Regenerate types
```

---

## Troubleshooting

### Problem: "RLS policy violation"

```typescript
// Error: "new row violates row-level security policy"

// Cause: Trying to update/insert row that violates RLS policy
// Example:
await supabase
  .from('surveys')
  .insert({ tenant_id: 'different-tenant', ... })
```

**Fix:**
```typescript
// Always let server set tenant_id:
const { data: user } = await supabase.auth.getUser()
const { data: userData } = await supabase
  .from('users')
  .select('tenant_id')
  .eq('id', user.id)
  .single()

// Use their tenant_id
await supabase.from('surveys').insert({
  tenant_id: userData.tenant_id,  // ← Server-set
  ...
})
```

### Problem: "User not found in database"

```typescript
// Error: User can login but can't access any data

// Cause: auth.users exists, but public.users record missing
```

**Fix:**
```sql
-- 1. Check auth.users exists
SELECT * FROM auth.users WHERE email = 'alice@firm.com';

-- 2. Check public.users exists
SELECT * FROM public.users WHERE email = 'alice@firm.com';

-- If missing from public.users, add:
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'alice@firm.com'),
  'abc-tenant-uuid',
  'alice@firm.com',
  'Alice',
  'owner'
);
```

### Problem: Types out of sync with database

```typescript
// Error: Property 'new_column' does not exist on type 'Tables<'surveys'>'

// Cause: Database schema changed but TypeScript types not regenerated
```

**Fix:**
```bash
# Regenerate types from live database
npm run db:types

# This creates/updates: packages/database/src/types.ts
# Now IDE autocomplete works!
```

### Problem: Queries work locally but fail in production

```typescript
// Local (supabase start): ✅ Works
// Production (Supabase Cloud): ❌ Fails

// Cause: Environment variables different between local and cloud
```

**Fix:**
```bash
# 1. Check env vars
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. For local dev:
supabase status
# Copy credentials to .env.local

# 3. For production:
# Vercel Dashboard → Settings → Environment Variables
# Set NEXT_PUBLIC_SUPABASE_URL to Cloud URL
# Set NEXT_PUBLIC_SUPABASE_ANON_KEY to Cloud key
```

### Problem: Infinite recursion in RLS policy

```sql
-- ❌ DON'T DO THIS:
CREATE POLICY "Users can view surveys"
  ON surveys FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
    -- ^ This queries users table, which also has RLS!
    -- → Infinite recursion
  ));

-- ✅ DO THIS:
CREATE POLICY "Users can view surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());
  -- ^ Uses SECURITY DEFINER function (bypasses RLS for that call)
```

### Problem: Service role key leaked

```
❌ CRITICAL: Never commit SUPABASE_SERVICE_ROLE_KEY to git!

1. Check git history:
   git log --all --full-history -- .env.local

2. If leaked:
   - Go to Supabase Dashboard
   - Settings → API → Regenerate Service Role Key
   - Update .env files
   - Redeploy

3. Prevent future leaks:
   - .env.local already in .gitignore
   - Set env vars in Vercel (not in code)
   - Use Vercel's secret management
```

---

## Praktyczne Checklist do Zmiany RLS Policy

Kiedy musisz zmienić RLS policy (bo często to robisz):

```bash
# 1. Create migration
supabase migration new update_policy_reason

# 2. Edit migration file (supabase/migrations/YYYYMMDDHHMMSS_*.sql)
#    Add your SQL changes

# 3. Test locally
supabase db reset  # Runs all migrations from scratch

# 4. Test in app (login, try actions)
npm run dev:cms
# Try to create/update/delete survey
# Check response works for clients too

# 5. Check types still match
npm run db:types

# 6. Push to production
supabase db push

# 7. Regenerate types on production
# Vercel will rebuild with new types

# 8. Monitor
# Watch Supabase dashboard for errors
# Check application logs
```

---

## Podsumowanie: Co pamiętać

| Concept | Praktycznie |
|---------|-----------|
| **RLS** | Security na poziomie bazy danych, nie aplikacji |
| **tenant_id** | Zawsze na każdej tabeli, zawsze ustawiany po stronie serwera |
| **Anon key** | Bezpieczna dla publicznego użytku, respektuje RLS |
| **Service role** | Tylko na serwerze, nigdy w przeglądarce |
| **current_user_tenant_id()** | Helper function unika nieskończonej rekursji |
| **Policies** | Zawsze kilka (SELECT, INSERT, UPDATE, DELETE) |
| **Queries vs Actions** | Queries do czytania (client), Actions do pisania (server) |
| **Revalidate** | Po mutacji, odśwież Next.js cache |
| **Types** | Zawsze regeneruj po zmianach schematu |

---

## Linki do dokumentacji

- [Supabase Official Docs](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development)
- [TypeScript Types Generation](https://supabase.com/docs/guides/api/generating-types)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/supabase-start)

---

## Quick Reference: Common Queries

```typescript
// Read (in queries.ts)
const { data } = await supabase.from('table').select('*')
const { data } = await supabase.from('table').select('*').eq('id', id)
const { data } = await supabase.from('table').select('*').in('status', ['new', 'active'])

// Write (in actions.ts with 'use server')
const { data } = await supabase.from('table').insert(record).select()
const { data } = await supabase.from('table').update(record).eq('id', id)
const { error } = await supabase.from('table').delete().eq('id', id)

// Error handling
if (error) return { success: false, error: error.message }
if (!data) throw new Error('Not found')

// Cache invalidation
revalidatePath('/admin/surveys')
```

---

Ostatnia aktualizacja: 2025-12-12
