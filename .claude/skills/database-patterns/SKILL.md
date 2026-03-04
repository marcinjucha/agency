---
name: database-patterns
description: Use when working with Supabase database — RLS policies, PostgreSQL functions, migrations, type regeneration, or Supabase client selection. Critical for avoiding RLS infinite recursion (Phase 2 crash) and selecting correct client (server vs browser).
---

# Database Patterns

## RLS: Infinite Recursion (Phase 2 Crash)

**The single most critical rule.** Subqueries in RLS policies caused PostgreSQL crash in Phase 2.

```sql
-- ❌ CAUSED PRODUCTION CRASH
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
-- surveys → users RLS → users subquery → users again → infinite loop → crash
```

**Fix: SECURITY DEFINER helper (already exists in schema):**

```sql
-- ✅ CORRECT
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- Helper bypasses RLS (SECURITY DEFINER = superuser privileges, STABLE = cached per tx)
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT tenant_id FROM users WHERE id = auth.uid(); $$;
```

**Golden rule:** NEVER subqueries in RLS policies. ALWAYS `public.current_user_tenant_id()` for cross-table checks.

---

## RLS: UUID Obscurity Pattern

**Surveys table has NO anon policy** — avoids infinite recursion risk entirely.

**Security model:** Anon gets survey UUID only through `survey_links` (which has its own RLS). UUID secrecy is the access control. Applied in Phase 2.

---

## Split Query Pattern

**When:** Public endpoint needs both `survey_links` (anon RLS) and `surveys` (no anon policy). Joining at DB level would re-trigger RLS between tables.

```typescript
// Step 1: Fetch survey_links (has anon RLS policy)
const { data: link } = await supabase
  .from('survey_links').select('*').eq('token', token).single()

// Step 2: Validate link
if (!link.is_active) return { error: 'inactive' }
if (link.expires_at && new Date(link.expires_at) < new Date()) return { error: 'expired' }
if (link.max_submissions && link.submission_count >= link.max_submissions) return { error: 'max reached' }

// Step 3: Fetch survey separately (no RLS recursion)
const { data: survey } = await supabase
  .from('surveys').select('*').eq('id', link.survey_id).single()
```

---

## Public Write Pattern (Service Role)

**When:** Public endpoint writes and needs `tenant_id` set correctly.

**Why service role:** Anon insert cannot determine correct `tenant_id`. Service role bypasses RLS, gets `tenant_id` from database (never from user input).

```typescript
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: survey } = await supabase.from('surveys').select('tenant_id').eq('id', surveyId).single()
await supabase.from('responses').insert({ tenant_id: survey.tenant_id, ... })
```

**Safe when:** INSERT only + `tenant_id` sourced from database.

---

## Supabase Client Selection

See `@resources/client-selection.md` for implementation details and common mistakes.

| Context | Client | Import | Async? |
|---------|--------|--------|--------|
| Server Component | Server | `@/lib/supabase/server` | Yes (`await createClient()`) |
| Server Action (`'use server'`) | Server | `@/lib/supabase/server` | Yes (`await createClient()`) |
| Client Component (`'use client'`) | Browser | `@/lib/supabase/client` | No |
| Query function (browser) | Browser | `@/lib/supabase/client` | No |
| Public submission (website) | Anon Server | `@/lib/supabase/anon-server` | No (`createAnonClient()`) |

**Anon Server client:** Service role bypasses RLS. Safe ONLY for public survey submissions where `tenant_id` is sourced from DB (never user input). Lives at `apps/website/lib/supabase/anon-server.ts`.

**Most common mistake:** Using wrong client, or forgetting `await` on server client.

---

## Migration Workflow

**Naming:** `YYYYMMDDHHMMSS_description.sql` — chronological order, prevents conflicts.

**Workflow:**
1. Create migration file with purpose comment and verification steps
2. Test locally: `supabase db reset` or `supabase db push --dry-run`
3. Apply: `supabase db push`
4. Regenerate types: `npm run db:types` **(CRITICAL after EVERY schema change)**
5. Verify in Supabase Dashboard

**Why types regeneration is critical:** Stale TypeScript types cause runtime errors — `packages/database/src/types.ts` must match schema.

```bash
supabase migration new migration_name                         # Create
supabase db reset                                             # Test locally (full reset)
supabase db push --dry-run                                    # Dry run (syntax check)
supabase db push                                              # Apply
npm run db:types                                              # Regenerate types (NEVER skip)
supabase db migrations list                                   # Check status
supabase migration repair --status reverted <timestamp>       # Repair failed
```

**Migration checklist:**
- [ ] File named: `YYYYMMDDHHMMSS_description.sql`
- [ ] Purpose comment at top
- [ ] Verification steps included as SQL comments
- [ ] Tested locally first
- [ ] Types regenerated after applying

---

## PostgreSQL Functions

**Use functions for:** Atomic operations (counter increments — race condition prevention), SECURITY DEFINER RLS helpers, triggers, database-level constraints.

**Use application code for:** Business logic, external API calls, complex multi-step validation, frequently changing rules.

### Atomic Counter (race condition prevention)

```sql
CREATE OR REPLACE FUNCTION increment_submission_count(link_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE survey_links SET submission_count = submission_count + 1 WHERE id = link_id;
END;
$$;

-- CRITICAL: Grant to anon for public survey endpoints
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_submission_count(UUID) TO authenticated;
```

**Why function not app code:** App reads count then writes = race condition when 2 users submit simultaneously. Function is atomic.

### Trigger Pattern (updated_at)

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Always GRANT permissions** to anon/authenticated for functions called from public endpoints.

---

## RLS Testing (Before Every Migration)

```sql
-- Test as anon
SET ROLE anon;
SELECT * FROM surveys WHERE id = 'test-uuid';
RESET ROLE;

-- Test as authenticated
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-uuid"}';
SELECT * FROM surveys;
RESET ROLE;
```

**Recursion error in test → fix policy before pushing migration.**

---

## Resources

- `@resources/client-selection.md` — Server vs browser client implementations and common mistakes
- `@resources/rls-policies.md` — RLS policy patterns, UUID obscurity, split query implementation
