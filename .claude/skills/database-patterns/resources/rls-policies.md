# RLS Policy Patterns

## The Infinite Recursion Bug

**Phase 2 Bug:** RLS policy with subquery caused infinite recursion.

```sql
-- ❌ WRONG: Infinite recursion
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT TO anon
  USING (
    id IN (SELECT survey_id FROM survey_links WHERE is_active = true)
  );
```

**Error:** `infinite recursion detected in policy for relation "surveys"`

**Why it happens:**
1. Anon queries `surveys`
2. RLS policy checks `survey_links`
3. `survey_links` might have its own RLS checking `surveys`
4. Infinite loop

---

## Solution: UUID Obscurity + Split Queries

**Step 1: Drop the problematic policy**

```sql
DROP POLICY IF EXISTS "Public can view surveys via active links" ON surveys;
```

**Step 2: Allow anon to read surveys IF they know the UUID**

Security through obscurity - UUIDs are only exposed through `survey_links`.

**Step 3: Split queries in application code**

```typescript
// In Server Action or query function

// 1. Fetch survey_links first (has anon RLS policy)
const { data: link, error: linkError } = await supabase
  .from('survey_links')
  .select('*')
  .eq('token', token)
  .single()

if (linkError || !link) {
  return { error: 'Link not found' }
}

// 2. Validate link status
if (!link.is_active) return { error: 'Link is inactive' }
if (link.expires_at && new Date(link.expires_at) < new Date()) {
  return { error: 'Link has expired' }
}
if (link.max_submissions && link.submission_count >= link.max_submissions) {
  return { error: 'Maximum submissions reached' }
}

// 3. Fetch survey separately (no RLS recursion)
const { data: survey, error: surveyError } = await supabase
  .from('surveys')
  .select('*')
  .eq('id', link.survey_id)
  .single()

if (surveyError || !survey) {
  return { error: 'Survey not found' }
}

return { link, survey }
```

---

## Testing RLS Policies

**Always test before pushing migrations:**

```sql
-- Test as anon user
SET ROLE anon;
SELECT * FROM surveys WHERE id = 'test-uuid-here';
RESET ROLE;

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM surveys;
RESET ROLE;
```

**If you see recursion error → fix policy before migration**

---

## Common RLS Policy Patterns

### Tenant Isolation (Authenticated Users)

```sql
-- Users can only see their tenant's data
CREATE POLICY "Users can view tenant surveys"
  ON surveys FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
```

### Public Access by Token

```sql
-- Anon can access survey_links by token
CREATE POLICY "Public can view active links by token"
  ON survey_links FOR SELECT TO anon
  USING (is_active = true);
```

### Insert with Tenant Assignment

```sql
-- Users can insert surveys for their tenant
CREATE POLICY "Users can create tenant surveys"
  ON surveys FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## Checklist Before Creating RLS Policy

- [ ] No subqueries referencing other tables with RLS
- [ ] Tested with `SET ROLE anon/authenticated`
- [ ] No circular references between table policies
- [ ] Clear documentation of what access is granted
