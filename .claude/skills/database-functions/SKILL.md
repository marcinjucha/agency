---
name: database-functions
description: Use when creating PostgreSQL functions, triggers, or stored procedures in Supabase. Covers PL/pgSQL syntax, GRANT permissions for anon/authenticated roles, SECURITY DEFINER pattern for RLS helpers, and deciding when to use database functions vs application logic.
---

# Database Functions - PostgreSQL Functions & Triggers

## Purpose

Create PostgreSQL functions for database-level logic - atomic operations, helper functions for RLS policies, triggers, and calculations that must happen at database level. Understand when to use functions vs application code.

## When to Use

- Creating atomic operations (counters, locks)
- Helper functions for RLS policies (SECURITY DEFINER)
- Database constraints enforcement
- Triggers for automatic actions
- Calculations that must be atomic
- Functions need GRANT permissions for anon/authenticated

## Core Patterns

### Pattern 1: Atomic Counter Function

**Use case:** Increment submission count atomically (prevent race conditions)

```sql
-- Migration: 20251210130000_create_increment_function.sql
CREATE OR REPLACE FUNCTION increment_submission_count(link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE survey_links
  SET submission_count = submission_count + 1
  WHERE id = link_id;
END;
$$;

-- CRITICAL: Grant permission to anon (public surveys)
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO authenticated;

-- Verification:
-- 1. SELECT submission_count FROM survey_links WHERE id = 'test-uuid';
-- 2. SELECT increment_submission_count('test-uuid');
-- 3. SELECT submission_count FROM survey_links WHERE id = 'test-uuid';
-- 4. Count should increment by 1
```

**Why function vs application:**
- ✅ Atomic - no race condition if 2 users submit simultaneously
- ✅ Database-level guarantee
- ❌ Application: `count = get() + 1; update(count)` - race condition!

### Pattern 2: SECURITY DEFINER Helper (RLS)

**Use case:** Helper function for RLS policies (prevents infinite recursion)

```sql
CREATE FUNCTION public.current_user_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT tenant_id FROM users WHERE id = auth.uid(); $$;
```

**Why SECURITY DEFINER critical:**
- Without it: Policy queries users → triggers RLS → infinite recursion → crash
- With it: Bypasses RLS → queries directly → no recursion

### Pattern 3: Validation Function

**Use case:** Complex validation logic at database level

```sql
CREATE OR REPLACE FUNCTION validate_survey_submission(
  link_id UUID,
  answers JSONB
)
RETURNS TABLE(valid BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  link_record RECORD;
  survey_record RECORD;
BEGIN
  -- Get link
  SELECT * INTO link_record FROM survey_links WHERE id = link_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Survey link not found';
    RETURN;
  END IF;

  -- Check expiration
  IF link_record.expires_at IS NOT NULL AND link_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Survey link expired';
    RETURN;
  END IF;

  -- Check max submissions
  IF link_record.max_submissions IS NOT NULL AND
     link_record.submission_count >= link_record.max_submissions THEN
    RETURN QUERY SELECT false, 'Maximum submissions reached';
    RETURN;
  END IF;

  -- Get survey
  SELECT * INTO survey_record FROM surveys WHERE id = link_record.survey_id;

  IF survey_record.status != 'active' THEN
    RETURN QUERY SELECT false, 'Survey not active';
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_survey_submission(UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION validate_survey_submission(UUID, JSONB) TO authenticated;
```

**Why function vs application:**
- ✅ Single source of truth (validation logic in one place)
- ✅ Can be used by triggers, policies, application code
- ✅ Database-level guarantee
- ❌ Complex functions hard to test/debug

### Pattern 4: Trigger Function

**Use case:** Automatic actions on INSERT/UPDATE/DELETE

```sql
-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Apply to surveys table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification:
-- 1. UPDATE surveys SET title = 'New Title' WHERE id = 'test-uuid';
-- 2. SELECT updated_at FROM surveys WHERE id = 'test-uuid';
-- 3. updated_at should be NOW()
```

**Common trigger use cases:**
- `updated_at` timestamp updates
- Audit logging (record who changed what)
- Cascade updates (update related tables)
- Validation enforcement

## Decision Tree: Function vs Application

### Use PostgreSQL Function When:

✅ **Atomic operations** (race condition prevention)
- Counter increments
- Stock/inventory management
- Reservation systems

✅ **Database constraints enforcement**
- Complex CHECK constraints
- Multi-table validation

✅ **Helper for RLS policies**
- `current_user_tenant_id()`
- Permission checks

✅ **Triggers/automatic actions**
- `updated_at` updates
- Audit logging

### Use Application Code When:

❌ **Business logic**
- User workflows
- State machines
- Multi-step processes

❌ **External API calls**
- Email sending
- Webhook calls
- Third-party integrations

❌ **Complex validation**
- More than 3-4 checks
- Requires external data
- User-facing error messages

❌ **Frequent changes**
- Logic changes often
- Needs A/B testing
- Business rules evolve

### Example Decision

**Scenario:** Increment submission count when survey submitted

**Option A: PostgreSQL Function** ✅
```sql
CREATE FUNCTION increment_submission_count(link_id UUID) ...
-- Atomic, database-level guarantee
```

**Option B: Application Code** ❌
```typescript
const current = await getSubmissionCount(linkId);
await updateSubmissionCount(linkId, current + 1);
// Race condition if 2 users submit simultaneously!
```

**Decision: Use function** (atomic operation critical)

## Quick Reference

**Decision Rule:**
- Atomic/RLS helper → Function
- Business logic → Application

**Critical:** GRANT permissions to anon/authenticated

**SECURITY DEFINER:** For RLS helpers (prevents recursion)

## Integration with Other Skills

- **rls-policies** - Functions used by RLS policies (SECURITY DEFINER)
- **schema-management** - Functions created in migrations
- **server-action-patterns** - Application calls functions with `.rpc()`

---

**Key Lesson:** Use functions for atomic operations and RLS helpers. Keep business logic in application code. Always GRANT permissions. Use SECURITY DEFINER for RLS helpers.
