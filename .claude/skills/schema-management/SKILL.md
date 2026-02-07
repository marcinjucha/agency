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

**Convention:** `YYYYMMDDHHMMSS_description.sql`

**Why timestamp:** Chronological order, prevents conflicts

### Pattern 2: Migration Structure Template

```sql
-- Migration: 20251210120000_add_survey_fields.sql
-- Purpose: Add description and status fields to surveys table

ALTER TABLE surveys
  ADD COLUMN description TEXT,
  ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

CREATE INDEX idx_surveys_status ON surveys(status);

-- Verification: SELECT * FROM surveys LIMIT 1;
```

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

**Why critical:** TypeScript types must match schema (stale types → runtime errors)

### Pattern 4: Testing Migrations Locally

```bash
# Dry run (check SQL syntax)
supabase db push --dry-run

# Local database test
supabase db reset  # Resets local DB and applies all migrations
```

**Why test first:** Catch errors early, verify constraints work

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
