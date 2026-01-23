---
name: development-practices
description: Legal-Mind development practices and decision frameworks. Use when making testing decisions, architecture choices, or performance optimizations.
---

# Development Practices

**Purpose:** Project-specific development practices and decision frameworks for Legal-Mind.

---

## Testing: 3-Question Rule

**Before writing ANY test, ask:**

1. ❓ Does test verify **business outcome** (not implementation)?
2. ❓ Would lack of test increase **production risk**?
3. ❓ Is logic **non-trivial** (>3 conditions OR caused bugs before)?

**If ANY answer is NO → Skip the test**

### ✅ Write These Tests

```typescript
// Complete user journey (passes all 3 questions)
test('lawyer creates survey, generates link, client submits form', async () => {
  const survey = await createSurvey({ title: 'Client Intake' })
  const link = await generateSurveyLink(survey.id)
  const response = await submitSurveyResponse(link.token, { answers: {...} })
  const responses = await getResponses()
  expect(responses).toHaveLength(1)
})

// Error handling (passes all 3)
test('expired survey link shows error to client', async () => {
  const expiredLink = await createExpiredLink()
  const result = await submitSurveyResponse(expiredLink.token, { answers: {...} })
  expect(result.error).toBe('Link expired')
})
```

### ❌ Skip These Tests

```typescript
// Obvious property (fails Q2, Q3)
test('survey has title', () => {
  const survey = { title: 'Test' }
  expect(survey.title).toBe('Test')
})

// Implementation detail (fails Q1)
test('getSurveys calls supabase.from', async () => {
  const spy = vi.spyOn(supabase, 'from')
  await getSurveys()
  expect(spy).toHaveBeenCalledWith('surveys')
})
```

### Testing ROI Comparison

**Comprehensive approach:**
- 20 tests, 95% coverage
- 3 catch real bugs, 17 test obvious code
- Time: 150 min

**Signal-first approach:**
- 5 tests, 65% coverage
- 5 catch real bugs, 0 test obvious code
- Time: 50 min
- **Result: Catch MORE bugs in LESS time (3x ROI)**

---

## Performance: Weighted Priority

**Fix critical issues first, skip micro-optimizations.**

### P0 - Production Blockers (70% of time)

**Database N+1 Queries (30%):**

```typescript
// ❌ P0 ISSUE - 100 queries
for (const survey of surveys) {
  const links = await supabase
    .from('survey_links')
    .select('*')
    .eq('survey_id', survey.id)  // Separate query per survey!
}
// Impact: 1s → 10s

// ✅ FIX - 1 query with join
const { data } = await supabase
  .from('surveys')
  .select(`
    *,
    survey_links(*)
  `)
// Impact: 10s → 100ms (100x faster)
```

**Large Data Serialization (30%):**

```typescript
// ❌ P0 ISSUE - Serialize huge objects
export async function getResponses() {
  const { data } = await supabase
    .from('responses')
    .select('*')  // Returns all JSONB data!
  return data  // 5MB JSON serialized to client
}
// Impact: 5s load time

// ✅ FIX - Select only needed fields
export async function getResponses() {
  const { data } = await supabase
    .from('responses')
    .select('id, status, created_at, survey_links(survey_id)')
  return data  // 50KB
}
// Impact: 5s → 500ms (10x faster)
```

**Missing TanStack Query Cache (10%):**

```typescript
// ❌ P0 ISSUE - No caching (CMS app)
function SurveyList() {
  const [surveys, setSurveys] = useState([])
  useEffect(() => {
    getSurveys().then(setSurveys)  // Fetches every render!
  }, [])
}

// ✅ FIX - TanStack Query
function SurveyList() {
  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
    staleTime: 5 * 60 * 1000  // Cache 5 min
  })
}
```

### P1 - Engineering Quality (20% of time)
- Unnecessary re-renders
- Client-side data fetching (should be RSC)
- Missing error boundaries

### P2 - Nice to Have (10% or skip)
- Minor bundle size optimizations
- Image format optimizations
- Cold path improvements

**Rule:** Fix P0 first, P1 if time, skip P2.

---

## Architecture: Decision Frameworks

### Simple Feature = Simple Architecture

**Match complexity to actual need:**

```
User profile screen (3 layers):
✅ Types → Queries/Actions → Component

❌ Over-engineered (5 layers):
User + UserProfile + UserSettings types
→ UserRepository + ProfileRepository
→ UserProfileService + ValidationService
→ LoadUseCase + UpdateUseCase
→ Multiple components
```

**Why simpler wins:**
- Half the files (3 vs 10+)
- Faster to build (2h vs 4h)
- Easier to change
- No unused code

**Add complexity when second use appears.**

### Shared Package Decision

**Create shared package when:**
- ✅ Used by 2+ apps NOW (CMS + Website)
- ✅ Type definitions (database types)
- ✅ UI components (forms, buttons)

**Keep in app when:**
- ✅ Single app usage
- ✅ Feature-specific logic
- ✅ Not yet reused

**Example:**

```typescript
// ✅ Shared package needed (used by both apps)
packages/ui/src/components/Button.tsx
packages/database/src/types.ts
packages/validators/src/survey.ts

// ✅ App-specific (only CMS uses)
apps/cms/features/surveys/actions.ts
apps/cms/features/responses/queries.ts
```

### Abstractions: Wait for 2+ Uses

**Don't abstract until concrete second use:**

```typescript
// Feature 1: Survey filtering
// ❌ DON'T create generic FilterService<T>
// (Don't know pattern yet)

// Feature 2: Response filtering
// ✅ NOW create FilterService<T>
// (Pattern is clear)
```

**Remember:** Duplication sometimes better than wrong abstraction.

---

## Comments & Logging

### Comments: Only WHY (Never WHAT)

**✅ Good Comments:**

```typescript
// Split query to avoid RLS infinite recursion
// Anon queries surveys → RLS checks survey_links → Database loop
const { data: link } = await supabase
  .from('survey_links')
  .select('*')
  .eq('token', token)
  .single()

// Revalidate after mutation to bust Next.js cache
// Without this, list shows stale data until manual refresh
revalidatePath('/admin/surveys')

// Max 100 submissions per link to prevent abuse
// Based on typical law firm intake (10-50 clients/month)
const MAX_SUBMISSIONS = 100
```

**❌ Bad Comments:**

```typescript
// Fetch surveys
const surveys = await getSurveys()

// Set loading to true
setIsLoading(true)

// Loop through surveys
surveys.forEach((survey) => console.log(survey.title))
```

### Logging: Errors + Milestones Only

**✅ Good Logging:**

```typescript
console.info(`Survey created: surveyId=${id}, tenantId=${tenantId}`)
console.error(`Form submission failed: linkToken=${token}, error=${error.message}`)
console.info(`Link generated: surveyId=${surveyId}, expiresAt=${expiresAt}`)
```

**❌ Bad Logging:**

```typescript
console.debug('Entering getSurveys()')
console.debug('Fetching from supabase')
console.debug(`x = ${x}, y = ${y}`)
console.debug('Exiting getSurveys()')
```

**Why bad:** Buries errors in noise, obvious from execution flow.

---

## Monorepo Structure

```
legal-mind/
├── apps/
│   ├── website/           # Public app (no auth)
│   │   ├── app/          # Next.js routes
│   │   ├── features/     # Feature logic (ADR-005)
│   │   └── lib/          # App utilities
│   │
│   └── cms/              # Admin app (auth required)
│       ├── app/          # Next.js routes
│       ├── features/     # Feature logic (ADR-005)
│       └── lib/          # App utilities
│
├── packages/
│   ├── ui/               # Shared shadcn/ui components
│   ├── database/         # Supabase types
│   └── validators/       # Zod schemas
│
└── supabase/
    └── migrations/       # Database schema
```

---

## Feature Structure (ADR-005)

**Rule:** `app/` = Routing, `features/` = Logic

```
apps/cms/features/surveys/
├── components/
│   ├── SurveyList.tsx       # List view
│   ├── SurveyBuilder.tsx    # Edit form
│   └── SurveyLinks.tsx      # Link management
├── actions.ts               # Server Actions (create, update, delete)
├── queries.ts               # Data fetching (read)
├── types.ts                 # TypeScript types (optional)
└── validation.ts            # Zod schemas (optional)
```

**Route Structure:**

```
apps/cms/app/admin/surveys/
├── page.tsx                 # List page (imports SurveyList)
├── new/page.tsx            # Create page
└── [id]/page.tsx           # Edit page
```

**Example Route (minimal code):**

```typescript
// apps/cms/app/admin/surveys/page.tsx
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return (
    <div>
      <h1>Surveys</h1>
      <SurveyList />
    </div>
  )
}
```

**Key Points:**
- ✅ `app/` folder = routing ONLY (minimal code)
- ✅ `features/` folder = business logic
- ✅ Group by feature, not by type

---

## Decision Flowcharts

### Should I Write This Test?

```
Q1: Business outcome? ──NO→ SKIP
    ↓ YES
Q2: Production risk? ──NO→ SKIP
    ↓ YES
Q3: Non-trivial logic? ──NO→ SKIP
    ↓ YES
WRITE TEST
```

### Which Layers Does Feature Need?

```
Where is it used?
├─ Both apps (CMS + Website) → Shared package
└─ One app → App feature folder

Complex algorithm?
├─ YES → Add service layer
└─ NO → Actions + Queries enough

Result: 2-4 layers (not always 4)
```

### Should I Optimize This?

```
Measure impact
    ↓
P0 (database, serialization, cache)? ──YES→ FIX NOW
    ↓ NO
P1 (re-renders, RSC)? ──YES→ FIX IF TIME
    ↓ NO
P2 (minor tweaks)? ──YES→ SKIP
```

### Where Should Code Live?

```
Used by 2+ apps NOW?
├─ YES → Shared package (packages/*)
│         export from index.ts
└─ NO → App feature folder (apps/*/features/)
          internal, not exported

When 2nd app needs it → Move to shared package
```

---

## Code Review Checklist

### P0 - Must Fix (Blocks Merge)

**Architecture:**
- [ ] Features in `features/` folder (not `app/`)?
- [ ] Server Actions use server client?
- [ ] Queries use browser client?
- [ ] No sensitive data in client components?

**Next.js Critical:**
- [ ] `'use server'` in Server Actions?
- [ ] `'use client'` in Client Components?
- [ ] `revalidatePath()` after mutations?
- [ ] No `await` on browser client?

**Performance:**
- [ ] No N+1 queries?
- [ ] Select only needed fields?
- [ ] TanStack Query for CMS data fetching?

**Security:**
- [ ] RLS policies enforce tenant isolation?
- [ ] No service role key in client code?
- [ ] User authentication checked in Server Actions?

**Verdict:** Any P0 failed → Request changes

### P1 - Should Fix (Comment)

- [ ] Tests follow 3-Question Rule?
- [ ] No tests of obvious code?
- [ ] Comments explain WHY (not WHAT)?
- [ ] Error states handled?
- [ ] Loading states shown?

**Verdict:** All P0 passed → Approve (comment on P1)

---

## Quick Reference

| Area | Decision | Framework |
|------|----------|-----------|
| **Testing** | Write or skip? | 3-Question Rule (business outcome, risk, non-trivial) |
| **Performance** | Optimize now? | Weighted Priority (P0 70%, P1 20%, P2 skip) |
| **Architecture** | How many layers? | Simple Feature = Simple Architecture (2-4 layers) |
| **Shared Package** | Create or not? | Used by 2+ apps NOW? |
| **Abstraction** | Create or wait? | Wait for 2+ concrete uses |
| **Comments** | Add or skip? | Only WHY (non-obvious decisions, timing, constraints) |
| **Logging** | Log or skip? | Errors + Milestones only |
