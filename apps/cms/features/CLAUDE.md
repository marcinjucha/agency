# features/ - Business Logic (CMS)

This directory contains business logic separated from routing (ADR-005 pattern).

## Purpose

Keep `app/` clean (routing only) and put all business logic here:
- Data fetching
- State management
- Component logic
- Server Actions
- Validation

## Structure

```
features/
├── surveys/         # Survey management
│   ├── components/  # SurveyList, SurveyBuilder
│   ├── actions.ts   # createSurvey, updateSurvey, deleteSurvey
│   ├── queries.ts   # getSurveys, getSurvey, getSurveyByToken
│   ├── validations.ts # Zod schemas (future)
│   └── types.ts     # TypeScript types (future)
│
├── responses/       # Response management (TODO)
├── calendar/        # Calendar integration (TODO)
└── auth/            # Auth helpers (TODO)
```

## Pattern (ADR-005)

Each feature follows this structure:

```
features/{feature}/
├── components/      # Feature-specific React components
├── actions.ts       # Server Actions (mutations)
├── queries.ts       # Data fetching functions
├── validations.ts   # Zod schemas
├── types.ts         # TypeScript interfaces
└── __tests__/       # Tests
```

**queries.ts vs queries.server.ts** — `queries.ts` = browser client (TanStack Query in client components). `queries.server.ts` = server client (Server Components/SSR). Wrong naming causes silent bugs: browser client in Server Component works at runtime but fails at build time (no cookies context). **Why:** Multiple features had wrong client usage discovered during architecture audit.

## Example: Surveys Feature

### components/SurveyList.tsx
```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys
  })
  // Component logic here
}
```

### queries.ts
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@agency/database'

export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
```

### actions.ts
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSurvey(data: { title: string }) {
  const supabase = await createClient()

  const { data: survey, error } = await supabase
    .from('surveys')
    .insert(data)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/surveys')
  return { success: true, surveyId: survey.id }
}
```

## Usage in Routes

**app/admin/surveys/page.tsx:**
```typescript
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

**Minimal routing logic** - all complex logic in features/.

## Why This Pattern?

**Benefits:**
- ✅ **Testable:** Business logic isolated from Next.js
- ✅ **Reusable:** Features can be extracted to packages
- ✅ **Discoverable:** Find all survey code in one place
- ✅ **Maintainable:** Clear separation of concerns
- ✅ **Scalable:** Easy to add new features

**Pattern Result:**
- app/admin/surveys/page.tsx: 10 lines (just imports and layout)
- features/surveys/components/SurveyList.tsx: 80 lines (component logic)
- features/surveys/queries.ts: 40 lines (data fetching)
- features/surveys/actions.ts: 70 lines (mutations)

## File Naming

- Components: PascalCase (`SurveyList.tsx`)
- Actions/Queries: camelCase functions (`getSurveys()`, `createSurvey()`)
- Types: PascalCase (`Survey`, `Question`)
- Files: lowercase with dash (`survey-utils.ts`)

## Adding a New Feature

```bash
# 1. Create feature folder
mkdir -p features/new-feature/components

# 2. Create files
touch features/new-feature/components/NewFeatureList.tsx
touch features/new-feature/actions.ts
touch features/new-feature/queries.ts

# 3. Create route
mkdir -p app/admin/new-feature
touch app/admin/new-feature/page.tsx

# 4. Import in route
# app/admin/new-feature/page.tsx
import { NewFeatureList } from '@/features/new-feature/components/NewFeatureList'
```

## Server Actions vs API Routes

**Use Server Actions (preferred):**
```typescript
'use server'
export async function createSurvey(data: FormData) {
  // Direct database access
  // Automatic serialization
  // Built-in with Next.js
}
```

**Use API Routes only for:**
- External webhooks (n8n)
- Third-party integrations
- Public endpoints

## TanStack Query Integration

**queries.ts exports functions** that TanStack Query calls:

```typescript
// features/surveys/queries.ts
export async function getSurveys() {
  // Fetch logic
}

// features/surveys/components/SurveyList.tsx
const { data } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys  // ← References query function
})
```

## Type Safety

Always use explicit return types:

```typescript
export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  // TanStack Query requires explicit return types for type inference
}
```

## Gotchas

**Recurring patterns (see skills for details):**
- Tiptap renderHTML: inline styles only → see `ag-ui-components` skill
- TanStack Query: root key invalidation → see `ag-ui-components` skill
- useMutation + Server Action silent failure → see `ag-ui-components` skill
- Zod `.nullable().optional()` for DB nullable → see `ag-database-patterns` skill

**datetime-local vs Zod .datetime() mismatch** — HTML `datetime-local` input produces `"2026-03-28T14:30"` (no seconds, no timezone) but `z.string().datetime()` requires full ISO 8601. Fix: use `z.string().min(1)` — PostgreSQL `timestamptz` handles parsing. **Why:** Pre-existing bug in generate + update survey link schemas (AAA-T-88).

**Trigger payload schemas as cross-feature contract** — Each workflow trigger type (survey_submitted, booking_created, lead_scored) declares a payload schema in `lib/trigger-schemas.ts`. This schema defines what `{{variables}}` are available in email templates. Adding a new trigger = adding one payload schema → variables auto-appear in email template editor. **WHY:** Decouples triggers from email templates — no hardcoded variable lists per template type. Features communicate through schema contracts, not direct imports.

## Related Documentation

- [ADR-005: App vs Features Separation](../../../docs/adr/ARCHIVED-005-app-vs-features-separation.md)
- [ADR-006: Component Organization](../../../docs/adr/006-agency-project-structure.md#7-component-organization-pattern)
