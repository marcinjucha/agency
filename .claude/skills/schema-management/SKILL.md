---
name: schema-management
description: Use when creating or modifying database schema through migrations - table structure changes, column additions, type regeneration, and migration workflow. Essential for understanding Supabase migration patterns and avoiding multiple migrations for same issue.
---

# Schema Management - Database Migrations & Types

## Purpose

Manage database schema changes through Supabase migrations - creating migration files, applying schema changes, and regenerating TypeScript types. Prevents common mistakes like multiple migrations for same bug or incorrect migration naming.

## When to Use

- Creating new tables or modifying existing schema
- Adding/removing/altering columns
- Creating indexes for performance
- Schema requires type regeneration
- Need to test migrations before pushing
- Understanding migration workflow and naming conventions

## Core Patterns

### Pattern 1: Migration File Naming

**Convention:**
```bash
YYYYMMDDHHMMSS_description.sql

✅ Examples:
20251210120000_add_public_survey_access.sql
20251210130000_create_increment_function.sql
20251212090000_add_responses_status_index.sql

❌ Wrong:
migration.sql
add_policy.sql
20251210_migration.sql  # Missing time
```

**Why timestamp matters:**
- Supabase applies migrations in chronological order
- Prevents conflicts when multiple developers create migrations
- Clear audit trail of schema evolution

### Pattern 2: Migration Structure Template

```sql
-- Migration: 20251210120000_add_survey_fields.sql
-- Purpose: Add description and status fields to surveys table
-- Affected: surveys table

-- 1. Schema changes
ALTER TABLE surveys
  ADD COLUMN description TEXT,
  ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

-- 2. Add indexes if needed
CREATE INDEX idx_surveys_status ON surveys(status);

-- 3. Add comments for documentation
COMMENT ON COLUMN surveys.description IS 'Survey description shown to respondents';
COMMENT ON COLUMN surveys.status IS 'Publication status: draft, published, archived';

-- Verification steps:
-- 1. Run: SELECT * FROM surveys LIMIT 1;
-- 2. Verify new columns exist
-- 3. Verify status constraint works: INSERT INTO surveys (status) VALUES ('invalid'); -- Should fail
```

**Why this structure:**
- Clear purpose and affected objects
- Verification steps for testing
- Documentation via SQL comments

### Pattern 3: Type Regeneration (CRITICAL)

**After EVERY schema change:**

```bash
# Apply migration
supabase db push

# Regenerate TypeScript types
npm run db:types

# Verify types updated
cat packages/database/src/types.ts | grep "new_column"
```

**Why critical:**
- TypeScript types must match database schema
- Stale types cause runtime errors (accessing non-existent columns)
- Type safety depends on up-to-date definitions

**What regenerates:**
- `packages/database/src/types.ts` - All table types
- `Tables<'table_name'>` - Row types
- `TablesInsert<'table_name'>` - Insert types
- `TablesUpdate<'table_name'>` - Update types

### Pattern 4: Testing Migrations Locally

**Before pushing to production:**

```bash
# Method 1: Dry run (check SQL syntax)
supabase db push --dry-run

# Method 2: Local database test
supabase db reset  # Resets local DB and applies all migrations

# Method 3: Test specific migration
psql postgresql://postgres:postgres@localhost:54322/postgres
\i supabase/migrations/20251210120000_migration.sql
```

**Why test first:**
- Catch SQL syntax errors early
- Verify constraints work correctly
- Avoid creating multiple fix migrations (Phase 2 created 6 migrations for one RLS bug)

### Pattern 5: Migration Workflow

```
1. Create migration file
   ↓
2. Write SQL with verification steps
   ↓
3. Test locally (db reset or dry-run)
   ↓
4. Apply to remote
   ↓
5. Regenerate types
   ↓
6. Verify in Supabase Dashboard
   ↓
7. Update code to use new schema
```

## Anti-Patterns (Critical Mistakes)

### ❌ Mistake 1: Multiple Migrations for Same Bug

**Problem:** Creating 6+ migrations while debugging one issue

```bash
# Phase 2 actual history:
20251210143628_add_rls_policy.sql
20251210145536_fix_rls_policy.sql
20251210150000_fix_rls_again.sql
20251210151000_fix_rls_v3.sql
20251210152000_fix_rls_v4.sql
20251210153000_fix_rls_final.sql
```

**Why bad:**
- Clutters migration history
- Hard to understand what actually changed
- Migrations run sequentially on deployment (slow)

**Fix: Test First, Migrate Once**

```bash
# 1. Test locally BEFORE pushing
supabase db reset

# 2. If migration fails, FIX same file
# Don't create new migration, edit existing one

# 3. Test again until works
supabase db reset

# 4. Push only when confirmed working
supabase db push

# 5. If already pushed wrong migration:
supabase migration repair --status reverted 20251210143628
# Then create new migration with fix
```

### ❌ Mistake 2: Forgetting Type Regeneration

**Problem:** Schema changed but types not updated

```typescript
// Migration added: surveys.description
// Types NOT regenerated

// Code tries to access new column:
const survey: Tables<'surveys'> = await getSurvey(id)
console.log(survey.description)  // TypeScript error: Property doesn't exist
```

**Fix: Always Run After Schema Changes**

```bash
# After every migration:
npm run db:types

# Verify change reflected:
grep "description" packages/database/src/types.ts
```

### ❌ Mistake 3: No Verification Steps

**Problem:** Migration applied but no way to verify it worked

```sql
-- Migration without verification
ALTER TABLE surveys ADD COLUMN status TEXT;
```

**Fix: Add Verification Comments**

```sql
ALTER TABLE surveys ADD COLUMN status TEXT;

-- Verification:
-- 1. SELECT * FROM surveys LIMIT 1;
-- 2. Check status column exists and is NULL for existing rows
-- 3. Test constraint: INSERT INTO surveys (status) VALUES ('test');
```

## Quick Reference

**Commands:**

```bash
# Create migration
supabase migration new migration_name

# Test locally
supabase db reset
supabase db push --dry-run

# Apply migration
supabase db push

# Regenerate types (CRITICAL)
npm run db:types

# Check migration status
supabase db migrations list

# Repair failed migration
supabase migration repair --status reverted <timestamp>
```

**Migration checklist:**

- [ ] File named: `YYYYMMDDHHMMSS_description.sql`
- [ ] Purpose comment at top
- [ ] Verification steps included
- [ ] Tested locally first
- [ ] Types regenerated after applying
- [ ] Verified in Supabase Dashboard

## Real Project Example

**From Phase 2 implementation:**

```sql
-- Migration: 20251210120000_add_survey_fields.sql
-- Purpose: Add description and status to surveys table
-- Affected: surveys table

ALTER TABLE surveys
  ADD COLUMN description TEXT,
  ADD COLUMN status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived'));

CREATE INDEX idx_surveys_status ON surveys(status);

COMMENT ON COLUMN surveys.description IS 'Survey description for clients';
COMMENT ON COLUMN surveys.status IS 'draft: editing, active: accepting, archived: closed';

-- Verification:
-- 1. SELECT * FROM surveys LIMIT 1;
-- 2. INSERT INTO surveys (title, status) VALUES ('Test', 'invalid'); -- Should fail
-- 3. npm run db:types && grep "description" packages/database/src/types.ts
```

**Result:**
- ✅ Single migration (not 6)
- ✅ Types regenerated
- ✅ Verified working before push

## Integration with Other Skills

- **rls-policies** - After schema changes, update RLS policies
- **database-functions** - Functions may depend on new columns
- **code-patterns** - TypeScript code uses regenerated types

---

**Key Lesson:** Test migrations locally FIRST. One working migration > six broken ones. Always regenerate types.
