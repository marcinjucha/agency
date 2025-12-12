# Supabase Quick Reference - Copy-Paste Ready

Szybkie snippety do kopiowania przy codziennej pracy.

---

## Setup

### Local Development

```bash
# Start local Supabase
supabase start

# Get credentials
supabase status

# Update .env.local with output:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from status>
SUPABASE_SERVICE_ROLE_KEY=<from status>
```

### New Migration

```bash
supabase migration new your_change_description

# Edit supabase/migrations/YYYYMMDDHHMMSS_your_change_description.sql

# Test locally
supabase db reset

# Regenerate types
npm run db:types

# Push to production
supabase db push
```

---

## Reading Data (queries.ts)

### Simple Query

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@legal-mind/database'

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

### Single Row

```typescript
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
```

### With Joins

```typescript
export async function getSurveyWithLinks(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select(`
      *,
      survey_links (
        id,
        token,
        submission_count,
        expires_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
```

### Filtering

```typescript
// Equals
.eq('status', 'active')

// In array
.in('id', ['id1', 'id2', 'id3'])

// Greater than
.gt('created_at', '2025-01-01')

// Like (text search)
.like('title', '%keyword%')

// Text search (requires FTS)
.textSearch('title', 'keyword')

// Multiple filters (AND)
.eq('status', 'active')
.eq('tenant_id', tenantId)

// Sorting
.order('created_at', { ascending: false })

// Pagination
.range(0, 9)  // First 10 rows
.range(10, 19)  // Rows 10-19
```

### In React Components

```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
    staleTime: 1000 * 60 * 5,  // 5 minutes
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

---

## Writing Data (actions.ts)

### Create (Auto-set tenant_id)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TablesInsert } from '@legal-mind/database'

export async function createSurvey(
  formData: { title: string; description?: string }
): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get user's tenant_id
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (dbError || !userData) {
      return { success: false, error: 'User not found' }
    }

    // Create with tenant context
    const surveyData: TablesInsert<'surveys'> = {
      title: formData.title,
      description: formData.description || null,
      tenant_id: userData.tenant_id,
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
      return { success: false, error: insertError?.message || 'Failed' }
    }

    revalidatePath('/admin/surveys')
    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Internal error' }
  }
}
```

### Update

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

### Delete

```typescript
export async function deleteSurvey(id: string): Promise<{ success: boolean; error?: string }> {
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

### Atomic Counter (RLS-safe)

```typescript
export async function incrementCounter(linkId: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('increment_submission_count', {
    link_id: linkId
  })

  if (error) throw error
}
```

---

## RLS Policies (SQL)

### Basic Multi-Tenant Policy

```sql
-- Helper function (create once in initial schema)
CREATE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_tenant_id() TO authenticated, anon;

-- Enable RLS on table
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- SELECT policy (authenticated users see their tenant data)
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- INSERT policy
CREATE POLICY "Users can create surveys in own tenant"
  ON surveys FOR INSERT
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- UPDATE policy
CREATE POLICY "Users can update own tenant surveys"
  ON surveys FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- DELETE policy
CREATE POLICY "Users can delete own tenant surveys"
  ON surveys FOR DELETE
  USING (tenant_id = public.current_user_tenant_id());
```

### Public Read Access (via gatekeeper table)

```sql
-- survey_links acts as gatekeeper
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Anonymous users can see active links
CREATE POLICY "Public can view active survey links"
  ON survey_links FOR SELECT
  TO anon
  USING (is_active = true);

-- Surveys only visible via active links
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT survey_id FROM survey_links WHERE is_active = true
    )
  );

-- Anonymous can create responses
CREATE POLICY "Anyone can create responses"
  ON responses FOR INSERT
  WITH CHECK (true);
```

### Atomic Counter Function

```sql
CREATE FUNCTION increment_submission_count(link_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE survey_links
  SET submission_count = submission_count + 1
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO anon, authenticated;
```

---

## Testing RLS (SQL Editor)

```sql
-- Set user context
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';
SET LOCAL role to authenticated;

-- Test query (behaves as that user)
SELECT * FROM surveys;

-- Reset
RESET ALL;
```

---

## Common Patterns

### Check User's Tenant

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

const { data: userData } = await supabase
  .from('users')
  .select('tenant_id, role')
  .eq('id', user.id)
  .single()

const tenantId = userData.tenant_id
const role = userData.role  // 'owner', 'admin', 'member'
```

### Get Data for Multiple IDs

```typescript
const surveyIds = ['id1', 'id2', 'id3']

const { data } = await supabase
  .from('surveys')
  .select('*')
  .in('id', surveyIds)
```

### Paginate Results

```typescript
const pageSize = 20
const page = 1

const { data, count } = await supabase
  .from('surveys')
  .select('*', { count: 'exact' })
  .range((page - 1) * pageSize, page * pageSize - 1)

const totalPages = Math.ceil((count || 0) / pageSize)
```

### Search & Filter

```typescript
const { data } = await supabase
  .from('surveys')
  .select('*')
  .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
```

### Upsert (Insert or Update)

```typescript
const { data, error } = await supabase
  .from('users')
  .upsert({
    id: userId,
    email: 'new@example.com',
    updated_at: new Date(),
  })
  .select()
  .single()
```

---

## Environment Setup

### .env.local (Development)

```bash
# Get from: supabase status
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Or production:
NEXT_PUBLIC_SUPABASE_URL=https://zsrpdslhnuwmzewwoexr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Vercel Dashboard (Production)

```
Settings → Environment Variables

NEXT_PUBLIC_SUPABASE_URL=https://zsrpdslhnuwmzewwoexr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (marked as Sensitive)
```

---

## Debugging

### Check RLS is enforced

```sql
-- See all policies
SELECT * FROM pg_policies WHERE tablename = 'surveys';

-- Test specific policy
SET LOCAL role to authenticated;
SET LOCAL request.jwt.claims.sub = 'user-id';
SELECT * FROM surveys LIMIT 1;
```

### Force RLS on table

```sql
ALTER TABLE surveys FORCE ROW LEVEL SECURITY;
-- Even table owner (postgres) must follow RLS
```

### Disable RLS (dev only!)

```sql
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
-- ⚠️ Only for debugging, always re-enable!
```

### View RLS violations

```bash
# In application logs
# Look for: "new row violates row-level security policy"
# Means: Trying to insert/update row that fails RLS check

# In Supabase dashboard:
# Dashboard → Logs → Edge Function Logs
# Shows failed queries with details
```

---

## Performance Tips

### Add Indexes for RLS

```sql
-- Most common: Filter by tenant_id
CREATE INDEX idx_surveys_tenant ON surveys(tenant_id);

-- Second filter: Status
CREATE INDEX idx_surveys_status ON surveys(status);

-- Composite index for common combo
CREATE INDEX idx_surveys_tenant_status ON surveys(tenant_id, status);

-- Check indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'surveys';
```

### Use LIMIT in queries

```typescript
// Don't do this (large dataset)
const { data } = await supabase.from('surveys').select('*')

// Do this (bounded)
const { data } = await supabase
  .from('surveys')
  .select('*')
  .limit(100)
```

### Cache with TanStack Query

```typescript
const { data } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
  staleTime: 1000 * 60 * 5,  // 5 min cache
  gcTime: 1000 * 60 * 10,    // 10 min garbage collect
})
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "RLS policy violation" | INSERT/UPDATE violates policy | Use server to set tenant_id |
| "User not found in database" | auth.users exists but public.users doesn't | Run seed_first_user.sql |
| "Stack depth limit exceeded" | Recursive RLS policy | Use SECURITY DEFINER function |
| "No rows affected" | RLS silently rejected query | Check RLS policy, user's tenant_id |
| "Cannot read property of undefined" | Type mismatch | Regenerate types: npm run db:types |

---

## TypeScript Types

### Auto-generated from database

```typescript
import type { Database, Tables, TablesInsert, TablesUpdate } from '@legal-mind/database'

// Read (existing row)
type Survey = Tables<'surveys'>

// Insert (new row)
type NewSurvey = TablesInsert<'surveys'>

// Update (partial row)
type UpdateSurvey = TablesUpdate<'surveys'>
```

### In queries

```typescript
import type { Tables } from '@legal-mind/database'

export async function getSurvey(id: string): Promise<Tables<'surveys'>> {
  // Full type safety!
}
```

---

## Useful Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View status
supabase status

# Generate types
npm run db:types

# Reset database (local only)
supabase db reset

# Push migrations to production
supabase db push

# Link to project
supabase link --project-ref zsrpdslhnuwmzewwoexr

# View logs
supabase logs
```

---

## Links

- [Docs](https://supabase.com/docs)
- [Dashboard](https://app.supabase.com)
- [Our Project Dashboard](https://app.supabase.com/project/zsrpdslhnuwmzewwoexr)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development)

---

Last updated: 2025-12-12
