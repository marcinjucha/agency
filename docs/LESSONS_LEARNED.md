# Lessons Learned: Phase 2 Implementation

> **Purpose:** Critical lessons from Phase 2 to prevent future bugs
> **Date:** 2025-12-10
> **Context:** First full feature implementation (Client Survey Form)

---

## 🚨 Critical Issues Found

### 1. Field Name Mismatch Between Apps (P0)

**What happened:**
- CMS used `label` field for question text
- Website expected `question` field
- Result: Survey forms rendered without labels

**Root cause:**
- No shared types between CMS and Website
- Each app defined its own `Question` type independently

**Fix:**
```typescript
// BEFORE (CMS):
type Question = { label: string }

// BEFORE (Website):
type Question = { question: string }

// AFTER (Both apps):
type Question = { question: string, order: number }
```

**Prevention:**
- ✅ **Create shared types in `packages/shared-types/`** for domain objects used across apps
- ✅ **Add E2E test** that creates survey in CMS → displays in Website
- ✅ **CMS data migration** to transform old format on load

---

### 2. RLS Infinite Recursion (P0)

**What happened:**
- RLS policy on `surveys` table caused infinite recursion
- Error: `infinite recursion detected in policy for relation "surveys"`

**Root cause:**
```sql
-- ❌ BAD: Policy queries same table it protects
CREATE POLICY "Public can view surveys via active links"
  ON surveys FOR SELECT
  TO anon
  USING (
    id IN (SELECT survey_id FROM survey_links WHERE is_active = true)
  );
```

**Fix:**
```typescript
// Split query into 2 separate fetches
// 1. Fetch survey_links (anon has RLS policy for this)
// 2. Validate link (expired, inactive, max_submissions)
// 3. Fetch surveys separately by survey_id (no RLS needed)
```

**Prevention:**
- ✅ **Never use subqueries in RLS policies** that reference other tables
- ✅ **Use UUID obscurity** for security: anon can read surveys IF they know ID
- ✅ **Test RLS policies** with `SET ROLE anon` before applying

---

### 3. Missing `order` Field (P1)

**What happened:**
- Website needed `order` field to sort questions
- CMS didn't generate it
- Result: Potentially random question order

**Fix:**
```typescript
// CMS now generates order when adding questions
const newQuestion: Question = {
  id: crypto.randomUUID(),
  type: 'text',
  question: 'New Question',
  required: false,
  order: questions.length  // ← Added
}
```

**Prevention:**
- ✅ **Review all fields** in shared types before implementation
- ✅ **Add field validation** in CMS to ensure required fields present

---

### 4. Debug Logs Left in Production Code (P2)

**What happened:**
- Added 11 `console.log` statements during debugging
- Left in code after fixing bugs

**Example:**
```typescript
// ❌ Found in production code:
console.log('[getSurveyByToken] Looking for token:', token)
console.log('[getSurveyByToken] Link query result:', { error, linkExists })
console.log('[getSurveyByToken] FAIL: Link not found')
```

**Prevention:**
- ✅ **Use debugger or dev tools** instead of console.log
- ✅ **Review code before commit** to remove debug logs
- ✅ **Keep `console.error`** in Server Actions for production debugging
- ✅ **ESLint rule:** Warn on console.log in production code

---

### 5. Multiple Migrations for Single Bugfix (P2)

**What happened:**
- Created 6 separate migrations while debugging RLS issue
- Migration history became cluttered

**Migrations created:**
1. `20251210143628_add_public_survey_access.sql`
2. `20251210145536_drop_surveys_rls_policy.sql`
3. `20251210150000_add_survey_links_anon_policy.sql`
4. `20251210151000_enable_rls_survey_links.sql`
5. `20251210152000_fix_surveys_rls_recursion.sql`
6. `20251210153000_allow_anon_read_surveys.sql`

**Prevention:**
- ✅ **Test migrations locally first** before pushing to remote
- ✅ **Squash migrations** if fixing same issue multiple times
- ✅ **Use migration repair** to mark old migrations as reverted

---

### 6. No Styling Checklist Before Merge (P2)

**What happened:**
- Styling changes (`globals.css`) modified ad-hoc
- No validation that UI matches design requirements

**Prevention:**
- ✅ **Add UI checklist** to test-validator agent
- ✅ **Screenshot comparison** before/after for visual changes
- ✅ **Review Tailwind classes** for consistency

---

## ✅ What Worked Well

### 1. Parallel Agent Execution
- Created `queries.ts` + `validation.ts` simultaneously
- Saved ~15 minutes vs sequential execution

### 2. Specialized Agents
- Each agent focused on one responsibility
- Clear boundaries: types → queries → components → routes

### 3. Type-First Approach
- Created `types.ts` before implementation
- All files imported from single source of truth

### 4. Browser DevTools for Debugging
- Console revealed exact RLS error message
- Faster than adding/removing debug logs

---

## 📋 Updated Workflows

### For feature-foundation-developer

**NEW: Check for shared types across apps**
```yaml
before_creating_types:
  - check: "Does CMS use this type?"
  - check: "Does Website use this type?"
  - if_yes: "Create in packages/shared-types/"
  - if_no: "Create in features/{feature}/types.ts"
```

**NEW: Field name validation**
```yaml
checklist:
  - [ ] All field names match between apps
  - [ ] No field name collisions (label vs question)
  - [ ] Required fields documented in types
  - [ ] Order field present if sorting needed
```

### For supabase-schema-specialist

**NEW: RLS policy validation**
```yaml
before_creating_rls_policy:
  - [ ] Policy does NOT use subqueries on same table
  - [ ] Policy tested with SET ROLE anon
  - [ ] Security via UUID obscurity documented
  - [ ] Migration includes rollback plan
```

**NEW: Migration consolidation**
```yaml
before_pushing_migration:
  - [ ] Check if fixing same issue as previous migration
  - [ ] If yes: Squash into single migration
  - [ ] If no: Create new migration
```

### For All Agents

**NEW: Debug log cleanup**
```yaml
before_committing:
  - [ ] Remove all console.log statements
  - [ ] Keep console.error in Server Actions only
  - [ ] Remove debug comments
  - [ ] Check for TODO/FIXME comments
```

---

## 🎯 Principles (Signal vs Noise)

### SIGNAL (Keep):
- ✅ Shared types for cross-app domain objects
- ✅ Explicit field names that match database
- ✅ RLS policies with UUID obscurity
- ✅ Parallel agent execution for independent files
- ✅ Browser DevTools for debugging
- ✅ Type-first development approach

### NOISE (Remove):
- ❌ Duplicate type definitions across apps
- ❌ Debug console.log statements
- ❌ Multiple migrations for same bugfix
- ❌ RLS policies with subqueries
- ❌ Ad-hoc styling without validation
- ❌ Field name inconsistencies

---

## 📖 References

- See [CODE_PATTERNS.md](./CODE_PATTERNS.md) for implementation patterns
- See [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) for project status
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

---

## 🔥 Phase 2 Continuation: RLS Policy vs Supabase SDK (P0)

**Date:** 2025-12-12

**What happened:**
- RLS policy existed and was correct: `CREATE POLICY "Anyone can create responses" ON responses FOR INSERT TO anon WITH CHECK (true)`
- Manual SQL worked: `SET ROLE anon; INSERT INTO responses (...) -- SUCCESS`
- Supabase SDK failed: `new row violates row-level security policy for table "responses"`

**Root cause:**
Next.js Server Actions and API Routes don't have proper HTTP request context that Supabase SDK needs to determine user role. Even with anon key, SDK couldn't apply `anon` role correctly on server.

**Why manual SQL worked:**
`SET ROLE anon` explicitly tells PostgreSQL to use anon role. SDK couldn't do this from server context.

**Solution:**
```typescript
// Use service role key for public submissions
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
return createClient(supabaseUrl, supabaseServiceKey)
```

**Is this safe?**
✅ YES - Service role bypasses RLS which is acceptable here because:
- Only used for INSERT operations (creating responses)
- `tenant_id` fetched from database (surveys table), NOT user input
- CMS queries still use RLS with anon key for reading data
- This is a public endpoint - anyone should be able to submit

**Alternative (not used):**
Could use direct REST API with anon key, but service role is simpler and safe for this use case.

**Prevention:**
- ✅ For public writes where tenant_id comes from database: service role is OK
- ✅ For public reads: use browser client with RLS
- ✅ For authenticated operations: use SSR client with auth
- ❌ NEVER use service role when user controls tenant_id

**Key principle:**
Service role is safe when YOU control the tenant_id, not the user.

---

**Next Phase:** Apply these lessons to Phase 3 (Google Calendar Integration)
