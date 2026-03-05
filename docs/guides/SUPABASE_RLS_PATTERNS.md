# Supabase RLS Patterns - Real-World Solutions

Rzeczywiste problemy RLS które napotykałeś w Halo-Efekt i jak je rozwiązywać.

---

## Problem 1: Public Survey Access (Phase 2 Battle)

### The Problem

**Requirements:**
- Anonymous clients muszą zobaczyć survey'e
- Ale nie mogą widzieć innych survey'ów
- RLS musi być na na surveys table

**Initial attempt (FAILS):**

```sql
-- ❌ TOO PERMISSIVE
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read surveys"
  ON surveys FOR SELECT
  TO anon
  USING (true);  -- Anyone can see ANY survey!
```

### The Solution

**Use survey_links as gatekeeper:**

```sql
-- Step 1: surveys table
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Step 2: survey_links table (controls access)
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Step 3: RLS policy on survey_links
CREATE POLICY "Anonymous can view active survey links"
  ON survey_links FOR SELECT
  TO anon
  USING (is_active = true);

-- Step 4: RLS policy on surveys (the key!)
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT survey_id
      FROM survey_links
      WHERE is_active = true
    )
  );
```

**How it works:**

```typescript
// Client (anonymous) does:
const { data: link } = await supabase
  .from('survey_links')
  .select('survey_id')
  .eq('token', 'abc123-token')
  .single()
// RLS checks:
// - Is user anon? YES
// - Does policy exist for anon on survey_links? YES (allows anon SELECT)
// - Is is_active = true? YES
// → Returns survey_id

// Then client does:
const { data: survey } = await supabase
  .from('surveys')
  .select('*')
  .eq('id', link.survey_id)
  .single()
// RLS checks:
// - Is user anon? YES
// - Does policy exist for anon on surveys? YES
// - Is survey_id in (SELECT survey_id FROM survey_links WHERE is_active)?
// - YES
// → Returns survey

// But if client tries:
const { data: hidden } = await supabase
  .from('surveys')
  .select('*')
  .eq('id', 'some-uuid-without-link')
// RLS checks same policy
// - Is survey_id in (SELECT survey_id...)? NO
// → No rows returned (silent failure)
```

**Key insight:** RLS policies can contain subqueries!

---

## Problem 2: Recursive RLS (Infinite Loop)

### The Problem

**What you might try:**

```sql
-- ❌ CAUSES INFINITE RECURSION
CREATE POLICY "Users can view tenant surveys"
  ON surveys FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
```

**Why it fails:**

```
1. User runs: SELECT * FROM surveys
2. PostgreSQL checks RLS on surveys table
3. Policy references: (SELECT ... FROM users WHERE ...)
4. PostgreSQL checks RLS on users table too!
5. Users table also has RLS policies
6. Which also reference users table internally
7. → Infinite recursion!
8. Error: Stack depth limit exceeded
```

### The Solution

**Use SECURITY DEFINER helper function:**

```sql
-- Create helper function (ONCE, in initial schema)
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

-- Now use in policies (no recursion!)
CREATE POLICY "Users can view tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());
```

**Why it works:**

```
SECURITY DEFINER means:
- Function runs with database OWNER privileges
- Can read users table WITHOUT triggering RLS on users table
- Returns tenant_id directly
- No recursion!

STABLE means:
- Result cached within single query
- Performance optimization
```

---

## Problem 3: Atomic Counters (Race Conditions)

### The Problem

**What you need:**
- Track submission count on survey_links
- Multiple clients submit simultaneously
- Count must be accurate (no race conditions)

**Naive approach (WRONG):**

```typescript
// App logic (JavaScript)
const { data: link } = await supabase
  .from('survey_links')
  .select('submission_count')
  .eq('id', linkId)
  .single()

// Calculate new count
const newCount = link.submission_count + 1

// Update back
await supabase
  .from('survey_links')
  .update({ submission_count: newCount })
  .eq('id', linkId)

// ❌ PROBLEM:
// Client 1 reads: count = 5
// Client 2 reads: count = 5 (same value!)
// Client 1 writes: count = 6
// Client 2 writes: count = 6 (overwrites!)
// → Lost one submission!
```

### The Solution

**Use PostgreSQL atomic increment:**

```sql
-- Create helper function
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

**Use in application:**

```typescript
// After successful response insert
const { error } = await supabase
  .rpc('increment_submission_count', {
    link_id: surveyLinkId
  })

if (error) throw error
```

**Why it works:**

```
PostgreSQL guarantees atomicity:
- ALL operations in function run together
- No interleaving with other requests
- Increment is atomic:
  submission_count = submission_count + 1
- Race condition IMPOSSIBLE

Performance:
- Single database operation
- No network round-trips
- Sub-millisecond execution
```

---

## Problem 4: Tenant Isolation Verification

### The Problem

**You want to verify:** "Can Alice access Bob's surveys?"

**Test scenario:**

```sql
-- Setup
INSERT INTO tenants (id, name) VALUES ('tenant-a', 'Firm A');
INSERT INTO tenants (id, name) VALUES ('tenant-b', 'Firm B');

INSERT INTO users (id, tenant_id, email) VALUES ('user-a', 'tenant-a', 'alice@a.com');
INSERT INTO users (id, tenant_id, email) VALUES ('user-b', 'tenant-b', 'bob@b.com');

INSERT INTO surveys (id, tenant_id, created_by, title)
VALUES ('survey-a', 'tenant-a', 'user-a', 'Alice Survey');
INSERT INTO surveys (id, tenant_id, created_by, title)
VALUES ('survey-b', 'tenant-b', 'user-b', 'Bob Survey');

-- Test as Alice
SET LOCAL request.jwt.claims.sub = 'user-a';
SELECT id, title FROM surveys;
-- Returns: survey-a only ✅

-- Test as Bob
SET LOCAL request.jwt.claims.sub = 'user-b';
SELECT id, title FROM surveys;
-- Returns: survey-b only ✅

-- Test as Alice accessing Bob's survey directly
SET LOCAL request.jwt.claims.sub = 'user-a';
SELECT id, title FROM surveys WHERE id = 'survey-b';
-- Returns: nothing (RLS blocks it) ✅

-- If Alice tries to update Bob's survey
SET LOCAL request.jwt.claims.sub = 'user-a';
UPDATE surveys SET title = 'Hacked' WHERE id = 'survey-b';
-- Result: 0 rows affected (silently rejected) ✅
```

---

## Problem 5: Service Role Keys (Admin Operations)

### The Problem

**Scenarios requiring admin access:**

```
✅ User submits form (anonymous) → INSERT response
✅ Lawyer creates survey → INSERT survey (their tenant only)
❌ Migrate data from old system
❌ Delete stale test data
❌ Bulk update for bug fix
```

**RLS blocks admin operations → Need Service Role Key**

### The Solution

```typescript
// apps/website/lib/supabase/anon-server.ts
import { createClient } from '@supabase/supabase-js'

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Secret!
  )
}
```

**Usage pattern:**

```typescript
// Server-side only (never expose to browser!)
const supabase = createServiceRoleClient()

// Bypass RLS - use carefully!
const { data } = await supabase
  .from('responses')
  .select('*')
  .eq('survey_link_id', 'abc')

// Can see ALL responses across all tenants
// Power + Responsibility!
```

**Safe usage rules:**

```typescript
// ✅ SAFE: Data comes from database
const { data: link } = await supabase
  .from('survey_links')
  .select('survey_id, surveys(tenant_id)')
  .eq('id', linkId)
  .single()

const { error } = await supabase
  .from('responses')
  .insert({
    survey_link_id: linkId,
    tenant_id: link.survey.tenant_id,  // ← From database!
    answers
  })

// ❌ UNSAFE: User input for tenant_id
const { error } = await supabase
  .from('responses')
  .insert({
    survey_link_id: req.body.surveyLinkId,
    tenant_id: req.body.tenantId,  // ← From user input!
    answers: req.body.answers
  })
```

---

## Problem 6: Policy Testing in SQL Editor

### The Pattern

**Test RLS policies like a specific user:**

```sql
-- Set JWT claims (simulates being that user)
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';

-- Set role (simulates authenticated vs anonymous)
SET LOCAL role to authenticated;

-- Now queries behave like that user
SELECT * FROM surveys;
-- Returns only their tenant's surveys

-- Test as anonymous
SET LOCAL role to anon;
SELECT * FROM surveys;
-- Returns based on anon policies
```

**Real test from Supabase Dashboard:**

```sql
-- 1. Create test data
INSERT INTO tenants (id, name) VALUES ('test-tenant-1', 'Test Firm');
INSERT INTO users (id, tenant_id, email) VALUES ('test-user-1', 'test-tenant-1', 'test@firm.com');
INSERT INTO surveys (id, tenant_id, created_by, title) VALUES ('test-survey-1', 'test-tenant-1', 'test-user-1', 'Test');

-- 2. Test as that user
SET LOCAL request.jwt.claims.sub = 'test-user-1';
SET LOCAL role to authenticated;
SELECT id, title FROM surveys;
-- Expected: Returns test-survey-1

-- 3. Verify RLS works
SET LOCAL request.jwt.claims.sub = 'different-user-uuid';
SET LOCAL role to authenticated;
SELECT id, title FROM surveys;
-- Expected: No rows (different user)

-- 4. Clean up
DELETE FROM surveys WHERE id = 'test-survey-1';
DELETE FROM users WHERE id = 'test-user-1';
DELETE FROM tenants WHERE id = 'test-tenant-1';
```

---

## Problem 7: Migrations with Breaking Changes

### The Problem

**Scenario:**
- You add new column to surveys: `requires_verification BOOLEAN`
- Old RLS policy doesn't handle it
- Need to update policy WITHOUT breaking existing queries

### The Solution

**Step 1: Create migration**

```sql
-- supabase/migrations/20251212000001_add_verification_column.sql

-- Add column
ALTER TABLE surveys ADD COLUMN requires_verification BOOLEAN DEFAULT false;

-- Update existing policies to handle new column
DROP POLICY "Users can view own tenant surveys" ON surveys;

CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- Policy logic unchanged, but it's reconstructed
-- This prevents stale policy references

-- Verify migration
-- SELECT * FROM pg_policies WHERE tablename = 'surveys';
```

**Step 2: Test locally**

```bash
supabase db reset
npm run db:types
npm run dev:cms
# Test survey creation/viewing
```

**Step 3: Deploy**

```bash
supabase db push
npm run db:types
# Vercel auto-rebuilds with new types
```

---

## Problem 8: Denormalization for Performance

### The Pattern

**Problem:**
- responses table should filter by tenant
- But response doesn't directly reference tenant
- Would need JOIN to get tenant via survey_links → surveys

**Solution: Denormalize**

```sql
-- Add tenant_id directly to responses
ALTER TABLE responses ADD COLUMN tenant_id UUID NOT NULL;

-- Create index for fast filtering
CREATE INDEX idx_responses_tenant ON responses(tenant_id);

-- Now RLS is simple:
CREATE POLICY "Users can view own tenant responses"
  ON responses FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());
```

**When setting data:**

```typescript
// From survey_links, get tenant_id
const { data: link } = await supabase
  .from('survey_links')
  .select('survey:surveys(tenant_id)')
  .eq('id', surveyLinkId)
  .single()

// Store in response
await supabase.from('responses').insert({
  survey_link_id: surveyLinkId,
  tenant_id: link.survey.tenant_id,  // ← Denormalized
  answers
})
```

**Benefits:**
- RLS queries don't need JOINs
- Fast filtering by tenant_id
- Index can be optimal
- Slight data redundancy is worth it

---

## Problem 9: Handling NULL values in RLS

### The Pattern

**Scenario:**
- Optional field like `client_email` in survey_links
- RLS policy checks various conditions
- NULL behavior might break logic

```sql
-- ❌ PROBLEMATIC
CREATE POLICY "Only owner can view link"
  ON survey_links FOR SELECT
  USING (client_email = auth.email());

-- If client_email is NULL:
-- NULL = 'alice@example.com'  → Unknown (not true, not false)
-- → Row hidden even from owner!

-- ✅ SAFE
CREATE POLICY "Only owner can view link"
  ON survey_links FOR SELECT
  USING (
    client_email = auth.email()
    OR (client_email IS NULL AND survey_id IN (
      SELECT id FROM surveys WHERE tenant_id = public.current_user_tenant_id()
    ))
  );

-- Explanation:
-- 1. If client_email matches user email → show
-- 2. OR if client_email is NULL AND user owns the survey → show
-- 3. Otherwise → hide
```

---

## Problem 10: Caching & Invalidation

### The Pattern

**Next.js caches:** Data is cached until revalidated

```typescript
// features/surveys/queries.ts
export async function getSurveys() {
  const supabase = createClient()
  const { data } = await supabase.from('surveys').select('*')
  return data
}

// After mutation, cache is stale:
revalidatePath('/admin/surveys')  // ← Bust cache

// With TanStack Query:
const queryClient = useQueryClient()
queryClient.invalidateQueries(['surveys'])  // ← Refetch
```

**Pattern in actions.ts:**

```typescript
'use server'

export async function createSurvey(data) {
  const supabase = await createClient()

  // Create
  const { data: survey } = await supabase
    .from('surveys')
    .insert(data)
    .select()
    .single()

  // Invalidate caches
  revalidatePath('/admin/surveys')  // List view
  revalidatePath('/admin/surveys/[id]')  // Detail view (all IDs)

  return survey
}
```

---

## Checklist: Before Deploying RLS Changes

```bash
# 1. Create migration file
supabase migration new describe_change

# 2. Write SQL with comments
# migrations/YYYYMMDDHHMMSS_*.sql

# 3. Test locally
supabase db reset
npm run db:types
npm run dev:cms
# Login, test CRUD operations
# Try unauthorized access (should fail silently)

# 4. Check types
npm run db:types  # Should not error

# 5. Commit
git add -A
git commit -m "chore: update RLS policies for [reason]"

# 6. Push to production
supabase db push
# Monitor Supabase dashboard for errors

# 7. Verify in production
# Try the same operations on live environment
# Check Supabase Studio → Tables → Policies

# 8. If broken
# Supabase Dashboard → SQL Editor
# DROP problematic policy
# Create fixed version
# Update local migration file
# supabase db push again
```

---

## Real Halo-Efekt Timeline

```
Week 1 (Dec 10):
- Initial schema with basic RLS
- Phase 1 complete ✅

Week 2 (Dec 10-12):
- Problem: Public survey access
- Solution: survey_links gatekeeper
- Migration 1: add_public_survey_access.sql
- Many iterations:
  - 20251210143628 - Initial attempt
  - 20251210145536 - Drop broken policy
  - 20251210150000 - Add anon policy
  - 20251210151000 - Enable RLS
  - 20251210152000 - Fix recursion
  - 20251210153000 - Allow anon read
- Phase 2: 80% complete (form submission tested)

Week 3 (Dec 12+):
- Response management UI (next blockers)
- Calendar integration (Phase 3)
```

---

## Key Takeaways

1. **RLS is powerful but tricky** - test thoroughly
2. **tenant_id everywhere** - on every table that needs isolation
3. **Helper functions** - prevent recursion, improve performance
4. **Atomic operations** - use PostgreSQL functions for counters
5. **Denormalize selectively** - for common query patterns
6. **Service role carefully** - only server-side, only when needed
7. **Test SQL policies** - use Supabase dashboard SQL editor
8. **Migrate often** - better to fix early than late
9. **Types after schema** - regenerate types after migrations
10. **Monitor in production** - check dashboard for errors

