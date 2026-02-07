---
name: supabase-patterns
description: Supabase database patterns for AI Agency. Use when working with RLS policies, Supabase clients, migrations, or type regeneration.
---

# Supabase Patterns

## Purpose

Database patterns specific to AI Agency multi-tenant architecture.

---

## RLS Policy Rule (CRITICAL)

**Never use subqueries in RLS policies** - causes infinite recursion.

**Why:** Anon queries surveys → RLS checks survey_links → Database recursion loop

**Solution:** UUID obscurity + split queries in application code.

See: [@resources/rls-policies.md](./resources/rls-policies.md) for complete pattern.

---

## Supabase Client Selection

| Context | Client | Import | Async? |
|---------|--------|--------|--------|
| Server Component | Server | `@/lib/supabase/server` | ✅ Yes (`await createClient()`) |
| Server Action (`'use server'`) | Server | `@/lib/supabase/server` | ✅ Yes (`await createClient()`) |
| Client Component (`'use client'`) | Browser | `@/lib/supabase/client` | ❌ No (`createClient()`) |
| Query function (browser) | Browser | `@/lib/supabase/client` | ❌ No |

**Most common mistake:** Using wrong client or forgetting `await` on server client.

See: [@resources/client-selection.md](./resources/client-selection.md) for implementation details.

---

## Split Query Pattern

**When:** Avoiding RLS recursion with related tables.

```typescript
// Step 1: Fetch survey_links (has anon RLS policy)
const { data: link } = await supabase
  .from('survey_links')
  .select('*')
  .eq('token', token)
  .single()

// Step 2: Validate link
if (!link.is_active) return { error: 'inactive' }

// Step 3: Fetch survey separately (no RLS recursion)
const { data: survey } = await supabase
  .from('surveys')
  .select('*')
  .eq('id', link.survey_id)
  .single()
```

---

## RLS Testing Commands

**Always test before pushing migrations:**

```sql
-- Test as anon user
SET ROLE anon;
SELECT * FROM surveys WHERE id = 'test-uuid-here';
RESET ROLE;

-- If recursion error → fix policy before migration
```

---

## Type Regeneration

**After schema changes:** `npm run db:types` (regenerates `packages/database/src/types.ts`)

---

## Public Write Pattern (Service Role)

**When:** Public endpoint writes with tenant_id from database

**Solution:** Service role bypasses RLS

```typescript
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// tenant_id from database (YOU control it)
const { data: survey } = await supabase.from('surveys').select('tenant_id').eq('id', surveyId).single()
await supabase.from('responses').insert({ tenant_id: survey.tenant_id, ... })
```

**Safe when:** INSERT only + tenant_id from database (not user input)

---

## Migration Best Practices

See: **schema-management** skill for migration workflow, testing, type regeneration

---

## Quick Reference

| Task | Command/Pattern |
|------|-----------------|
| Regenerate types | `npm run db:types` |
| Test RLS as anon | `SET ROLE anon; SELECT...; RESET ROLE;` |
| Avoid RLS recursion | Split queries in app code |
| Server client | `await createClient()` from `@/lib/supabase/server` |
| Browser client | `createClient()` from `@/lib/supabase/client` |
| Public writes | Service role IF tenant_id from database |
