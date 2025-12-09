# Archived Migrations

This folder contains historical migration files that were created during development to fix RLS (Row Level Security) recursion issues. These files have been consolidated into the main `20250105000001_initial_schema.sql` file.

## What Happened

During initial development (Dec 9, 2025), we encountered infinite recursion errors in RLS policies. The root cause was:

**Problem:** RLS policies on `users` and `surveys` tables were using subqueries like:
```sql
(SELECT tenant_id FROM users WHERE id = auth.uid())
```

This caused infinite loops because:
1. Query `surveys` table
2. RLS policy checks `tenant_id` by querying `users` table
3. Querying `users` triggers its RLS policy
4. That policy also queries `users` for `tenant_id`
5. → Infinite recursion 💥

**Solution:** Created a PostgreSQL function with `SECURITY DEFINER`:
```sql
CREATE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;
```

- `SECURITY DEFINER` bypasses RLS when executing (no recursion)
- `STABLE` caches the result within a single query (performance)
- All RLS policies now use `public.current_user_tenant_id()` instead of subqueries

## Archived Files

These files were incrementally created while debugging:

1. **20250109000001_fix_users_rls_recursion.sql**
   - First attempt: split users policy into two (own profile + tenant users)
   - Didn't fully solve the problem

2. **20250109000002_fix_tenant_rls_recursion.sql**
   - Fixed tenant policies that also had recursion
   - Still had issues with surveys/responses policies

3. **20250109000003_refresh_rls_cache.sql**
   - Tried to clear PostgreSQL query plan cache
   - Temporarily disabled/enabled RLS
   - Didn't solve the root cause

4. **20250109000004_fix_rls_with_function.sql**
   - **This worked!** Created `current_user_tenant_id()` function
   - Recreated all policies using the function
   - Eliminated all recursion

## Current State

The production database has all 5 migrations applied sequentially:
```
20250105000001_initial_schema.sql  (original with recursion)
20250109000001_fix_users_rls_recursion.sql
20250109000002_fix_tenant_rls_recursion.sql
20250109000003_refresh_rls_cache.sql
20250109000004_fix_rls_with_function.sql  (final fix)
```

## Clean Migrations

For **new deployments** or **local development**, use only:
```
supabase/migrations/20250105000001_initial_schema.sql
```

This file now includes:
- All table definitions
- All indexes
- `public.current_user_tenant_id()` function (the fix)
- All RLS policies using the function (no recursion)

## Why Keep These Files?

Historical reference:
- Shows the debugging process
- Documents what NOT to do with RLS policies
- Can be useful for understanding RLS recursion issues
- Educational value for team members

## For New Developers

**Do NOT apply these archived migrations!** They are only kept for reference.

If you're setting up a fresh database:
1. Use only `supabase/migrations/20250105000001_initial_schema.sql`
2. This file includes all the fixes
3. You'll have a clean, working RLS setup from the start

## Production Database

The production database (zsrpdslhnuwmzewwoexr) has all migrations applied and is working correctly. Do NOT try to "clean" the production database - it's functioning as expected.

---

**Archived:** December 9, 2025
**Reason:** Consolidated into main schema file
**Safe to delete?** Yes, but kept for historical reference
