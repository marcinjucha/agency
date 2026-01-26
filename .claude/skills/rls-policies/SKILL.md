---
name: rls-policies
description: Use when creating or debugging Row Level Security (RLS) policies in Supabase. Critical for avoiding infinite recursion bug (caused PostgreSQL crashes in production), understanding multi-tenant isolation patterns, and testing policies with anon/authenticated roles. Includes helper function patterns and real bugs from Phase 2.
---

# RLS Policies - Row Level Security Patterns

## Purpose

Create secure, correct RLS policies for multi-tenant data isolation and public access control. Prevents critical bugs like infinite recursion (crashed production in Phase 2) and unauthorized data access.

## When to Use

- Creating policies for multi-tenant isolation (tenant_id filtering)
- Adding public access policies (anon role)
- Debugging "infinite recursion detected in policy" errors
- Understanding when to use helper functions vs direct queries
- Testing RLS policies before deployment
- Fixing unauthorized data access issues

## Critical Bug: Infinite Recursion 🚨

**THE MOST IMPORTANT PATTERN - READ THIS FIRST**

### What Happened in Phase 2

```sql
-- ❌ THIS CAUSED PRODUCTION CRASH
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Error: "infinite recursion detected in policy for relation surveys"
-- PostgreSQL crashed, 100% of SELECT queries failed
```

**Why it crashed:**

1. User queries `surveys` table
2. RLS policy triggers: check `tenant_id` matches user's tenant
3. Policy runs subquery: `SELECT tenant_id FROM users WHERE id = auth.uid()`
4. Subquery hits `users` table → triggers `users` RLS policy
5. `users` RLS policy runs subquery → queries `users` again
6. **Infinite loop** → PostgreSQL stack overflow → crash 💥

**The Fix: SECURITY DEFINER Helper Function**

```sql
-- ✅ CORRECT: Use helper function
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- Helper function (already exists in schema):
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

-- SECURITY DEFINER = bypasses RLS when executing
-- No recursion! ✅
```

**Why this works:**
- `SECURITY DEFINER` makes function run with superuser privileges
- Query to `users` table bypasses RLS (no recursion)
- Result cached within transaction (`STABLE` optimization)
- Function becomes safe, reusable building block

### The Golden Rule

**NEVER use subqueries in RLS policies that query the same table or tables with RLS policies.**

**ALWAYS use `SECURITY DEFINER` helper functions for cross-table checks.**

## Core Patterns

### Pattern 1: Multi-Tenant Isolation (Authenticated Users)

**For ALL authenticated user policies:**

```sql
-- SELECT: Filter rows by tenant
CREATE POLICY "Users view own tenant data"
  ON table_name FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- INSERT: Verify tenant on insert
CREATE POLICY "Users insert into own tenant"
  ON table_name FOR INSERT
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- UPDATE: Check both current and new tenant
CREATE POLICY "Users update own tenant data"
  ON table_name FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- DELETE: Filter by tenant
CREATE POLICY "Users delete own tenant data"
  ON table_name FOR DELETE
  USING (tenant_id = public.current_user_tenant_id());
```

**Why use helper function:**
- Prevents infinite recursion (see above)
- Consistent across all policies
- Performance: cached per transaction

### Pattern 2: Public Access (Anon Role)

**For public endpoints (survey submissions, etc):**

```sql
-- Option A: Simple public read
CREATE POLICY "Public can view active items"
  ON table_name FOR SELECT TO anon
  USING (status = 'active');

-- Option B: Conditional public access
CREATE POLICY "Public can view via links"
  ON surveys FOR SELECT TO anon
  USING (
    id IN (
      SELECT survey_id FROM survey_links WHERE is_active = true
    )
  );

-- Option C: Public insert (with validation)
CREATE POLICY "Public can submit responses"
  ON responses FOR INSERT TO anon
  WITH CHECK (status = 'new');
```

**Safe subquery patterns for anon:**
- ✅ Subquery to different table (if that table has no RLS or simple RLS)
- ✅ Simple WHERE conditions
- ❌ Subquery that triggers another RLS policy with subqueries (recursion risk)

### Pattern 3: UUID Obscurity (No Policy Needed)

**Alternative to RLS for some cases:**

```sql
-- Instead of RLS policy:
CREATE POLICY "Public can view surveys via links"
  ON surveys FOR SELECT TO anon
  USING (id IN (SELECT survey_id FROM survey_links));

-- Use UUID obscurity:
-- NO RLS POLICY ON surveys FOR anon!

-- Security model:
-- - Anon can read surveys ONLY if they know the UUID
-- - UUIDs only exposed through survey_links (which has RLS)
-- - survey_links.token is public, but survey_links.survey_id (UUID) is not shown
-- - To get survey, anon needs exact UUID (impossible to guess)
```

**When to use:**
- UUID primary keys (impossibly hard to guess)
- Data not sensitive if UUID leaked
- Simpler than complex RLS policies

**From Phase 2:**
- Surveys table has no anon policy
- Security: anon needs UUID from survey_links (which has RLS)
- Avoids infinite recursion risk entirely

### Pattern 4: Testing RLS Policies

**CRITICAL: Test before deploying**

```sql
-- Test as anon user
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims.sub = '';

SELECT * FROM surveys WHERE id = 'test-uuid';
-- Should return row if policy allows, empty if denied

RESET ROLE;

-- Test as authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid';

SELECT * FROM surveys;
-- Should only return user's tenant rows

RESET ROLE;
```

**Testing checklist:**
- [ ] Anon can access what they should (and nothing more)
- [ ] Authenticated users see only their tenant
- [ ] No "infinite recursion" errors
- [ ] INSERT/UPDATE/DELETE policies also tested

## Anti-Patterns (Critical Mistakes)

### ❌ Mistake 1: Subquery in RLS Policy (Infinite Recursion)

**Problem:** Already covered above - crashes PostgreSQL

**Always use:** `public.current_user_tenant_id()` helper function

### ❌ Mistake 2: Forgetting `TO anon` Clause

```sql
-- ❌ WRONG: Policy applies to authenticated only (default)
CREATE POLICY "Public can view surveys"
  ON surveys FOR SELECT
  USING (status = 'active');

-- Anon users still can't access! Policy doesn't apply to them.

-- ✅ CORRECT: Explicit TO anon
CREATE POLICY "Public can view surveys"
  ON surveys FOR SELECT TO anon
  USING (status = 'active');
```

### ❌ Mistake 3: Not Testing with SET ROLE

```sql
-- ❌ WRONG: Testing as superuser
SELECT * FROM surveys;  -- Always works (bypasses RLS)

-- ✅ CORRECT: Test as actual role
SET ROLE anon;
SELECT * FROM surveys;  -- Tests actual RLS policy
RESET ROLE;
```

### ❌ Mistake 4: Complex Multi-Table Checks

```sql
-- ❌ WRONG: Multiple subqueries (recursion risk)
CREATE POLICY "Users can view related data"
  ON table_a FOR SELECT
  USING (
    id IN (
      SELECT table_a_id FROM table_b
      WHERE user_id = (
        SELECT id FROM users WHERE auth.uid() = id
      )
    )
  );

-- ✅ CORRECT: Split queries in application code
-- 1. Query table_b with user filter
-- 2. Get table_a_ids
-- 3. Query table_a with id filter
-- RLS policies stay simple, recursion impossible
```

## Real Project Examples

### Example 1: Survey Multi-Tenant Policy

```sql
-- surveys table: Lawyers manage their tenant's surveys
CREATE POLICY "Users manage own tenant surveys"
  ON surveys FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Helper function already exists (prevents recursion)
```

### Example 2: Public Survey Access via Links

```sql
-- survey_links table: Anon can view links, submit responses
CREATE POLICY "Public can view survey links"
  ON survey_links FOR SELECT TO anon
  USING (is_active = true);

-- surveys table: No anon policy (UUID obscurity)
-- Anon gets survey via application code:
-- 1. Query survey_links by token (anon can do this)
-- 2. Get survey_id (UUID)
-- 3. Query surveys by UUID (anon can do this - no RLS blocks it)
-- 4. Security: anon needs exact UUID (only from survey_links)
```

### Example 3: Response Submission

```sql
-- responses table: Anon can INSERT new responses
CREATE POLICY "Public can submit responses"
  ON responses FOR INSERT TO anon
  WITH CHECK (status = 'new');

-- Note: tenant_id comes from survey (application fetches it)
-- RLS doesn't validate tenant_id on INSERT (application responsibility)
```

## Quick Reference

**Policy operation types:**

```sql
FOR SELECT    -- Read access (USING clause)
FOR INSERT    -- Create access (WITH CHECK clause)
FOR UPDATE    -- Modify access (USING + WITH CHECK)
FOR DELETE    -- Delete access (USING clause)
FOR ALL       -- All operations (USING + WITH CHECK)
```

**Target roles:**

```sql
TO anon              -- Anonymous users (public)
TO authenticated     -- Logged-in users
TO [custom_role]     -- Custom database role
-- Default: authenticated (if TO omitted)
```

**Helper functions:**

```sql
public.current_user_tenant_id()  -- Get user's tenant (SECURITY DEFINER)
auth.uid()                       -- Current user ID
```

**Testing commands:**

```sql
SET ROLE anon;           -- Test as anonymous
SET ROLE authenticated;  -- Test as logged-in user
RESET ROLE;              -- Return to superuser
```

## Integration with Other Skills

- **schema-management** - RLS policies created in migrations
- **database-functions** - Helper functions used by policies
- **code-patterns** - Split Query Pattern when RLS too complex

## Historical Context

See `@supabase/migrations_archive/README.md` for full story of Phase 2 infinite recursion bug and how it was fixed.

---

**Key Lesson:** NEVER use subqueries in RLS policies. ALWAYS use `public.current_user_tenant_id()` helper function. Test with `SET ROLE` before deploying.
