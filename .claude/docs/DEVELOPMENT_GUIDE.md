# Development Guide - Legal-Mind

**For:** Human developers building features in this codebase

**Core Philosophy:** Signal over Noise - Focus on high-value work

**Related:** See `.claude/docs/SIGNAL_VS_NOISE_PHILOSOPHY.md` for universal concept

---

## 🎯 Signal vs Noise in Development

### The Core Idea

**Signal** = Work with real impact (users, business, code quality)
**Noise** = Work that feels productive but doesn't improve outcomes

**Before any work, ask:** "What's the measurable value?"
- Can't articulate → Likely noise
- Can point to benefit → Signal

**Remember:** 1 hour of signal work > 10 hours of noise work

---

## 🧪 Testing Best Practices

### The 3-Question Rule (Before Every Test)

**Ask:**
1. ❓ Does test verify **business outcome** (not implementation)?
2. ❓ Would lack of test increase **production risk**?
3. ❓ Is logic **non-trivial** (>3 conditions OR caused bugs before)?

**If ANY answer is NO → Skip the test**

### Examples

**✅ Write These:**
```typescript
// Complete user journey (passes all 3 questions)
test('lawyer creates survey, generates link, client submits form', async () => {
  // 1. Lawyer creates survey
  const survey = await createSurvey({ title: 'Client Intake' })
  expect(survey.id).toBeDefined()

  // 2. Generate link
  const link = await generateSurveyLink(survey.id)
  expect(link.token).toBeDefined()

  // 3. Client submits
  const response = await submitSurveyResponse(link.token, { answers: {...} })
  expect(response.status).toBe('new')

  // 4. Lawyer sees response
  const responses = await getResponses()
  expect(responses).toHaveLength(1)
})

// Error handling (passes all 3)
test('expired survey link shows error to client', async () => {
  const expiredLink = await createExpiredLink()

  const result = await submitSurveyResponse(expiredLink.token, { answers: {...} })

  expect(result.error).toBe('Link expired')
  expect(result.success).toBe(false)
})
```

**❌ Skip These:**
```typescript
// Obvious computed property (fails Q2, Q3)
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

### Testing ROI

**Comprehensive approach:**
- 20 tests, 95% coverage
- 3 catch real bugs, 17 test obvious code
- Time: 150 min (write + maintain)

**Signal-first approach:**
- 5 tests, 65% coverage
- 5 catch real bugs, 0 test obvious code
- Time: 50 min

**Result:** Catch MORE bugs in LESS time (3x better ROI)

---

## 🏛️ Architecture Best Practices

### YAGNI - You Aren't Gonna Need It

**Write code needed NOW, not code MIGHT need later**

### Simple Feature = Simple Architecture

**Match complexity to actual need:**

**User profile screen:**
```
✅ Right-sized (3 layers):
Types → Queries/Actions → Component

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

**Add complexity when second use appears**

### Shared Package Decision

**Simple rule:**

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

**Remember:** Duplication sometimes better than wrong abstraction

---

## ⚡ Performance Best Practices

### Weighted Priority (Fix Critical First)

**P0 - Production Blockers (70% time):**

**Database N+1 queries (30%):**
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

**Large data serialization (30%):**
```typescript
// ❌ P0 ISSUE - Serialize huge objects
export async function getResponses() {
  const { data } = await supabase
    .from('responses')
    .select('*')  // Returns all JSONB data!
  return data  // 5MB JSON serialized to client
}
// Impact: 5s load time

// ✅ FIX - Select only what you need
export async function getResponses() {
  const { data } = await supabase
    .from('responses')
    .select('id, status, created_at, survey_links(survey_id)')
  return data  // 50KB
}
// Impact: 5s → 500ms (10x faster)
```

**Missing TanStack Query cache (10%):**
```typescript
// ❌ P0 ISSUE - No caching
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

**P1 - Engineering Quality (20% time):**
- Unnecessary re-renders
- Client-side data fetching (should be RSC)
- Missing error boundaries

**P2 - Nice to Have (10% or skip):**
- Minor bundle size optimizations
- Image format optimizations
- Cold path improvements

**Rule:** Fix P0 first, P1 if time, skip P2

---

## 💬 Comments Best Practices

### Only Comment WHY (Never WHAT)

**Code explains WHAT, comments explain WHY**

### Good Comments

**Non-obvious decisions:**
```typescript
// ✅ GOOD - Explains RLS limitation
// Split query to avoid RLS infinite recursion
// Anon queries surveys → RLS checks survey_links → Database loop
const { data: link } = await supabase
  .from('survey_links')
  .select('*')
  .eq('token', token)
  .single()

const { data: survey } = await supabase
  .from('surveys')
  .select('*')
  .eq('id', link.survey_id)
  .single()
```

**Timing dependencies:**
```typescript
// ✅ GOOD - Documents timing
// Revalidate after mutation to bust Next.js cache
// Without this, list shows stale data until manual refresh
revalidatePath('/admin/surveys')
```

**Business constraints:**
```typescript
// ✅ GOOD - Documents business rule
// Max 100 submissions per link to prevent abuse
// Based on typical law firm intake (10-50 clients/month)
const MAX_SUBMISSIONS = 100
```

### Bad Comments

**Obvious code:**
```typescript
// ❌ BAD
// Fetch surveys
const surveys = await getSurveys()

// ❌ BAD
// Set loading to true
setIsLoading(true)

// ❌ BAD
// Loop through surveys
surveys.forEach((survey) => {
  console.log(survey.title)
})
```

**Better - no comments, clear names:**
```typescript
const surveys = await getSurveys()
setIsLoading(true)
surveys.forEach((survey) => console.log(survey.title))
```

### Checklist

- [ ] Does comment explain WHY (decision, constraint)?
- [ ] Is reason non-obvious from code?
- [ ] Would developer make mistake without this?

**All YES → Write comment**
**Any NO → Delete, improve naming instead**

---

## 📊 Logging Best Practices

### Log Errors + Milestones Only

**Good logging:**
```typescript
// ✅ SIGNAL - Helps production debugging
console.info(`Survey created: surveyId=${id}, tenantId=${tenantId}`)
console.error(`Form submission failed: linkToken=${token}, error=${error.message}`)
console.info(`Link generated: surveyId=${surveyId}, token=${token}, expiresAt=${expiresAt}`)
```

**Why good:** 3 logs per operation, complete picture, useful context

**Bad logging:**
```typescript
// ❌ NOISE - 1000 logs/min
console.debug('Entering getSurveys()')
console.debug('Fetching from supabase')
console.debug(`x = ${x}, y = ${y}`)
console.debug('Exiting getSurveys()')
```

**Why bad:** Buries errors in noise, obvious from execution

### Checklist

- [ ] Helps debug production issues?
- [ ] ERROR or important MILESTONE?
- [ ] Concise with useful context?

**All YES → Add log**
**Any NO → Use debugger instead**

---

## 🎯 Decision Frameworks

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

## 🚀 Workflows & Project Structure

### Monorepo Structure

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

### Feature Structure (ADR-005)

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
├── new/
│   └── page.tsx            # Create page
└── [id]/
    └── page.tsx            # Edit page
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

## 📐 Code Patterns

### Server Actions (Mutations)

**When:** Creating, updating, deleting data

**File Pattern:** `features/{feature}/actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TablesInsert } from '@legal-mind/database'

export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()  // ← AWAIT required

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Create survey
    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title: formData.title,
        description: formData.description,
        tenant_id: user.tenant_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    // ✅ Revalidate path to bust cache
    revalidatePath('/admin/surveys')

    return { success: true, surveyId: survey.id }
  } catch (error) {
    return { success: false, error: 'Failed to create survey' }
  }
}
```

**Key Points:**
- ✅ Always `'use server'` as first line
- ✅ Use server client with `await createClient()`
- ✅ Return structured result `{ success, data?, error? }`
- ✅ Always `revalidatePath()` after mutations
- ✅ Try-catch for error handling

### Queries (Data Fetching)

**When:** Reading data from database

**File Pattern:** `features/{feature}/queries.ts`

```typescript
import { createClient } from '@/lib/supabase/client'  // ← Browser client
import type { Tables } from '@legal-mind/database'

export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()  // ← NO await (browser client)

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error  // ← Throw for TanStack Query to catch
  return data || []
}

export async function getSurvey(id: string): Promise<Tables<'surveys'>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle()  // ← Returns null if not found

  if (error) throw error
  if (!data) throw new Error('Survey not found')

  return data
}
```

**Key Points:**
- ✅ Use browser client (NO await on createClient)
- ✅ Explicit return types `Promise<Tables<'table'>>`
- ✅ Throw errors (TanStack Query catches them)
- ✅ Use `.maybeSingle()` for single row queries

### Components with TanStack Query (CMS)

**When:** CMS app, frequent data fetching, caching needed

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'
import { Button, Card } from '@legal-mind/ui'
import Link from 'next/link'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!surveys || surveys.length === 0) return <EmptyState />

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <Card key={survey.id}>
          <h3>{survey.title}</h3>
          <p>{survey.description}</p>
        </Card>
      ))}
    </div>
  )
}
```

**Key Points:**
- ✅ Always `'use client'` directive
- ✅ Handle all states: loading, error, empty, success
- ✅ Use `queryKey` for cache management

### Components with React Hook Form (Website)

**When:** Website app, one-time submission, no caching needed

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitSurveyResponse } from '../actions'
import { surveySchema } from '../validation'

export function SurveyForm({ surveyId, questions }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(surveySchema),
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    const result = await submitSurveyResponse({ surveyId, answers: data })

    if (result.success) {
      router.push('/survey/success')
    } else {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {questions.map((question) => (
        <div key={question.id}>
          <label>{question.label}</label>
          <input {...register(question.id)} />
          {errors[question.id] && (
            <span className="text-red-500">
              {errors[question.id]?.message}
            </span>
          )}
        </div>
      ))}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

**Key Points:**
- ✅ Use `useState` for local state
- ✅ Call Server Actions directly
- ✅ React Hook Form for form management
- ✅ Zod for validation

---

## ✅ Code Review Checklist

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

## 📊 Measuring Success

### Weekly Self-Audit

**Track signal vs noise:**

**Signal work:**
- Tests catching bugs: ___ hours
- Features users need: ___ hours
- P0 performance fixes: ___ hours
- Architecture preventing issues: ___ hours

**Noise work:**
- Tests of obvious code: ___ hours
- Over-engineering: ___ hours
- Micro-optimizations: ___ hours
- Perfect architecture debates: ___ hours

**Signal ratio = signal / (signal + noise)**

**Goal:** >80%

### Expected Outcomes

**With signal-first approach:**
- ⏱️ 40% faster development
- 🐛 Same or better bug detection
- 🔧 70% easier maintenance
- 📊 Higher code clarity

**Measured by:**
- Features shipped per week
- Time from start to production
- Tests catching real bugs (not coverage %)
- Refactor frequency (unused code = high refactors)

---

## 🎯 Quick Reference Cheat Sheet

| Area | Signal | Noise | Question |
|------|--------|-------|----------|
| **Testing** | User journeys, errors, complex logic | Obvious properties, framework code | "What bug does this catch?" |
| **Architecture** | Layers needed NOW | Future-proofing, 1-use abstractions | "Needed NOW or maybe later?" |
| **Performance** | P0 (70%): DB, serialization, cache | P2 (10%): Cold paths, minor tweaks | "What's measured impact?" |
| **Comments** | WHY (race, business rules) | WHAT (obvious from code) | "Is this non-obvious?" |
| **Logging** | Errors, milestones | Function entry/exit, variables | "Helps debug production?" |
| **Shared Packages** | Used 2+ apps NOW | Might be reused later | "Reused NOW or maybe?" |

---

## 💡 Common Pitfalls

### 1. "Comprehensive Coverage"

**Mistake:** "Need 90% test coverage!"

**Reality:** Coverage % ≠ test quality

**Solution:** Track "bugs caught per test" not "%"

### 2. "Perfect Architecture"

**Mistake:** "Design for all future scenarios"

**Reality:** Future is uncertain, perfect = wrong

**Solution:** YAGNI - add when needed

### 3. "Optimize Everything"

**Mistake:** "Found issue, must fix"

**Reality:** P2 cold path ≠ P0 hot path

**Solution:** Weighted priority, fix P0

### 4. "Over-Abstracting Too Early"

**Mistake:** "Create shared package now in case we need it"

**Reality:** Premature abstraction harder to change

**Solution:** Wait for 2+ concrete uses

---

## 🌟 Success Pattern

**High-performing developers:**
1. Ask "What's the value?" before work
2. Use decision frameworks (3-Question, YAGNI, Weighted)
3. Ship working code fast (MVP > perfect)
4. Add complexity when concrete need
5. Measure signal ratio (>80%)

**Result:**
- 40% faster shipping
- Same/better quality
- 70% less maintenance
- Higher satisfaction (meaningful work)

---

**Remember:** Signal vs Noise is discipline. Practice asking "What's the value?" until automatic. Be rigorous about signal, ruthless about noise.
