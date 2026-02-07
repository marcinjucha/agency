---
name: route-patterns
description: Use when creating Next.js routes (page.tsx files). Critical pattern - ADR-005 app/ vs features/ separation (routing logic ONLY in app/, business logic in features/). Prevents mixing concerns and enables code reuse.
---

# Route Patterns - Next.js Routes & ADR-005

## Purpose

ADR-005 architectural rule: app/ for routing ONLY, features/ for business logic. Prevents route-logic mixing that makes refactoring hard and code reuse impossible.

## When to Use

- Creating page.tsx files
- Understanding ADR-005 separation
- Route has too much logic (move to features/)

## Critical Pattern: ADR-005 Separation

**Rule:** app/ = routing ONLY, features/ = business logic

**Why (ADR-005):** Previous approach mixed logic in app/ → hard to reuse. New: logic in features/ → reusable, clear ownership.

### Minimal Route Pattern

```typescript
// ✅: app/admin/surveys/page.tsx
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return (
    <div className="container mx-auto py-8">
      <h1>Surveys</h1>
      <SurveyList />
    </div>
  )
}
// Just imports + render. No logic.
```

```typescript
export default async function SurveysPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('surveys').select('*')

  return (
    <div>
      {data.map(survey => ...)}  // Business logic in route!
    </div>
  )
}
```

**Why minimal routes:**
- Routes change when URLs change (refactoring nightmare if logic inside)
- Components reusable across routes (if logic separated)
- Clear ownership (route = URL structure, feature = logic)

### Next.js 15 Async Params

**Pattern:** params is Promise, must await

```typescript
// ✅ - Next.js 15
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params  // AWAIT required
}
```

## Quick Reference

**Route checklist (ADR-005):**
- [ ] Imports component from features/
- [ ] No database queries in route
- [ ] No business logic in route
- [ ] Async params (await params in Next.js 15)
- [ ] Error handling (notFound() or error UI)

**When route fetches data:**
```typescript
// Server Component pattern
export default async function Page({ params }: PageProps) {
  const { id } = await params
  const data = await getDataFromFeatures(id)  // Query from features/
  return <ComponentFromFeatures data={data} />
}
```

## Real Project Pattern

**Phase 2 Survey Routes:**

```typescript
// apps/website/app/survey/[token]/page.tsx
import { getSurveyByToken } from '@/features/survey/queries'  // From features/
import { SurveyForm } from '@/features/survey/components/SurveyForm'

export default async function SurveyPage({ params }: PageProps) {
  const { token } = await params
  const { data } = await getSurveyByToken(token)

  if (!data) return <ErrorUI />

  return <SurveyForm linkData={data} />
}
```

**What's in route:** Fetch + render
**What's in features/:** SurveyForm component, getSurveyByToken query, all validation

---

**Key Lesson:** Routes import from features/, never contain business logic (ADR-005).
