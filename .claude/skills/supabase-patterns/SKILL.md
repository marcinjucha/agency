---
name: supabase-patterns
description: Supabase database patterns for Legal-Mind. Use when working with RLS policies, Supabase clients, migrations, or type regeneration.
---

# Supabase Patterns

**Purpose:** Database patterns specific to Legal-Mind multi-tenant architecture.

---

## RLS Policy Rule (CRITICAL)

**Never use subqueries in RLS policies** - causes infinite recursion.

```sql
-- ❌ WRONG: Infinite recursion
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT TO anon
  USING (
    id IN (SELECT survey_id FROM survey_links WHERE is_active = true)
  );
-- Error: infinite recursion detected in policy for relation "surveys"
```

**Why:** Anon queries surveys → RLS checks survey_links → Database recursion loop

**Solution:** UUID obscurity + split queries in application code.

See: [rls-policies.md](./rls-policies.md) for complete pattern.

---

## Supabase Client Selection

| Context | Client | Import | Async? |
|---------|--------|--------|--------|
| Server Component | Server | `@/lib/supabase/server` | ✅ Yes (`await createClient()`) |
| Server Action (`'use server'`) | Server | `@/lib/supabase/server` | ✅ Yes (`await createClient()`) |
| Client Component (`'use client'`) | Browser | `@/lib/supabase/client` | ❌ No (`createClient()`) |
| Query function (browser) | Browser | `@/lib/supabase/client` | ❌ No |

**Most common mistake:** Using wrong client or forgetting `await` on server client.

```typescript
// Server Action
const supabase = await createClient()  // ← AWAIT required

// Client Component
const supabase = createClient()  // ← NO await
```

See: [client-selection.md](./client-selection.md) for implementation details.

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

**After schema changes:**

```bash
npm run db:types
# → supabase gen types typescript --linked > packages/database/src/types.ts
```

**NEVER manually edit** `packages/database/src/types.ts`!

**Usage:**
```typescript
import type { Tables, TablesInsert } from '@legal-mind/database'

// SELECT result
type Survey = Tables<'surveys'>

// INSERT data
const newSurvey: TablesInsert<'surveys'> = {...}

// UPDATE data
const updates: Partial<Pick<Tables<'surveys'>, 'title' | 'status'>> = {...}
```

---

## Public Write Pattern (Service Role)

**When:** Public endpoint needs to write data with tenant_id from database.

**Problem:** Next.js Server Actions don't have HTTP request context → Supabase SDK can't apply anon role correctly → RLS blocks insert even with correct policy.

**Solution:** Use service role key (bypasses RLS).

```typescript
// ✅ Safe for public submissions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// tenant_id comes from database query (NOT user input)
const { data: survey } = await supabase.from('surveys').select('tenant_id').eq('id', surveyId).single()

await supabase.from('responses').insert({
  survey_id: surveyId,
  tenant_id: survey.tenant_id,  // ← From database, safe
  answers: data.answers
})
```

**When is service role safe:**
- ✅ INSERT operations only
- ✅ tenant_id fetched from database (YOU control it)
- ✅ Public endpoint (anyone can submit)

**When is service role DANGEROUS:**
- ❌ NEVER when user controls tenant_id
- ❌ NEVER for UPDATE/DELETE without validation
- ❌ NEVER for authenticated operations (use SSR client)

**Key principle:** Service role is safe when YOU control tenant_id, not the user.

---

## Migration Best Practices

**Problem:** Multiple migrations for same bugfix clutters history.

**Anti-pattern:**
```
20251210143628_add_public_survey_access.sql
20251210145536_drop_surveys_rls_policy.sql
20251210150000_add_survey_links_anon_policy.sql
20251210151000_enable_rls_survey_links.sql
20251210152000_fix_surveys_rls_recursion.sql
20251210153000_allow_anon_read_surveys.sql
```

**Prevention:**
- ✅ Test migrations locally FIRST with `SET ROLE anon`
- ✅ Squash if fixing same issue multiple times
- ✅ Use migration repair to mark old migrations as reverted

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
