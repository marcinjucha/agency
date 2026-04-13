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
├── appointments/        # Appointment management (Google Calendar sync)
├── blog/                # Blog with Tiptap WYSIWYG, S3 images, SEO, ISR
├── calendar/            # Calendar booking UI + settings + Google OAuth
├── editor/              # Shared Tiptap editor base (used by blog, shop, legal-pages)
├── email/               # Email template editor + live preview
├── intake/              # Unified intake hub — @dnd-kit kanban, split view
├── landing/             # Landing page block editor + live preview
├── legal-pages/         # Legal pages (regulamin, polityka prywatnosci) with shared Tiptap
├── media/               # Media library — S3 upload, 6 types, folder tree, DnD, InsertMediaModal
├── responses/           # Response list + detail view
├── shop-categories/     # Shop category CRUD (inline editing, combobox with create)
├── shop-marketplace/    # Marketplace integration (OLX + Allegro adapters, OAuth)
├── shop-products/       # Shop product editor (Tiptap, media gallery, SEO, layout selector)
├── site-settings/       # Site settings (org-level config, SEO defaults, keywords)
├── surveys/             # Survey builder + link management
└── workflows/           # Workflow engine — visual builder (ReactFlow), templates, test mode (dispatches to real n8n). ALL execution in n8n Orchestrator (staticData state, Trigger Handler, 6 step handlers).
```

## Pattern (ADR-005)

Each feature follows this structure:

```
features/{feature}/
├── components/      # Feature-specific React components
├── utils/           # Pure logic extracted from components (TDD candidates)
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
    queryFn: getSurveys,
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

  const { data: survey, error } = await supabase.from('surveys').insert(data).select().single()

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
  queryFn: getSurveys, // ← References query function
})
```

## Type Safety

Always use explicit return types:

```typescript
export async function getSurveys(): Promise<Tables<'surveys'>[]> {
  // TanStack Query requires explicit return types for type inference
}
```

**Derive typed unions from `as const` objects in `types.ts`** — When a feature has enum-like domain values (status, type, kind), define them as `as const` objects and derive the union type. Never hand-maintain string unions that duplicate a const object. DB stores TEXT — validate at query boundary.

```typescript
// ✅ types.ts — single source of truth
const STEP_TYPES = { condition: 'condition', delay: 'delay', webhook: 'webhook' } as const
type StepType = (typeof STEP_TYPES)[keyof typeof STEP_TYPES]

// ❌ Avoid — hand-maintained union drifts from runtime values
type StepType = 'condition' | 'delay' | 'webhook'
```

**Why:** RBAC (`PermissionKey`) proved this pattern catches typos at compile time and provides full autocomplete. Applies to any feature with domain constants: workflow step/trigger types, blog statuses, marketplace adapter keys, listing types.

## Gotchas

**Recurring patterns (see skills for details):**

- Tiptap renderHTML: inline styles only → see `ag-design-patterns` skill
- TanStack Query: root key invalidation → see `ag-design-patterns` skill

### Common Bugs & Gotchas

**Zod `.nullable().optional()` for DB nullable** — `z.string().optional()` accepts undefined but NOT null. DB stores null. Fix: `.nullable().optional()`. **WHY:** Supabase returns null for optional columns, Zod rejects it silently. Recurring across features.

**useMutation + Server Action = silent failure** — TanStack Query treats non-thrown results as success. Fix: throw on `!result.success` inside mutationFn. **WHY:** If you return `{ success: false }` without throwing, onSuccess fires instead of onError. Recurring pattern.

**revalidatePath does NOT invalidate TanStack Query cache** — Need BOTH `revalidatePath` (Next.js RSC cache) AND `queryClient.invalidateQueries()` (TanStack cache) after mutations. **WHY:** Two separate cache layers; revalidatePath only clears RSC cache, not client query cache.

**`import { cn } from '@agency/ui'` NOT `'@agency/ui/lib/utils'`** — Deep path import fails. Always use the package root export. **WHY:** Recurring across new components — the deep path is not exposed.

**handleSubmit needs onFormError callback** — Without onFormError, RHF validation errors are silently swallowed. Also: empty number inputs send NaN → add Zod transform: `z.coerce.number().transform(v => isNaN(v) ? null : v)`. **WHY:** Two silent failure modes in RHF+Zod combination.

**updateSchema.partial() makes IDs optional** — Using `.partial()` on a schema with required UUID fields makes them optional, bypassing NOT NULL DB constraints. Fix: `.omit({ id: true }).partial()` to exclude IDs before partial. **WHY:** Caught at DB level, not Zod level — silent in TypeScript.

**getMediaItems folder_id: undefined=all, null=root, string=folder** — Three-way distinction: default undefined returns ALL items (backward compat); null=root folder only; string=specific folder. **WHY:** Critical backward compat — null ≠ undefined ≠ string. Breaking this distinction silently filters out items.

**Never redefine types locally if they exist in shared packages** -- Always import `QuestionType`, `Question`, `SemanticRole` (and any survey/form types) from `@agency/validators`, never define local type aliases. **Why:** SurveyBuilder.tsx had a local `type QuestionType` duplicating the shared union from `@agency/validators`. The local type lacked `'consent'` -- causing a build error when the new question type was added to the shared package. Any new type variant added to the shared package will silently diverge from local copies. Same risk applies to any feature importing from `@agency/validators`, `@agency/database`, or `@agency/ui`. (2026-04-02)

**datetime-local vs Zod .datetime() mismatch** — HTML `datetime-local` input produces `"2026-03-28T14:30"` (no seconds, no timezone) but `z.string().datetime()` requires full ISO 8601. Fix: use `z.string().min(1)` — PostgreSQL `timestamptz` handles parsing. **Why:** Pre-existing bug in generate + update survey link schemas (AAA-T-88).

**Raw `<button>` lacks focus-visible ring — always use shadcn Button from `@agency/ui`** — Button guarantees `focus-visible:ring-2`. Raw `<button>` has no visible focus indicator = P0 accessibility violation (WCAG 2.4.7). **WHY:** Design review found 5 instances in AAA-T-157 where keyboard users couldn't see focus.

**`aria-label` on generic `<div>` ignored by screen readers — add `role="group"` or use semantic element** — For status indicators conveyed by color alone, add `sr-only` text spans. **WHY:** MarketplaceStatusDots had no screen reader alternative for color-coded status (AAA-T-157).

**Extract pure functions from `.tsx` to `utils/`** -- If a function inside a component file doesn't touch JSX (no hooks, no rendering), extract it to `features/{name}/utils/{descriptive-name}.ts`. These become TDD candidates alongside `actions.ts` and `queries.ts`. **WHY:** `generateMockData()` and `formatExecutionStatus()` were buried in `TestModePanel.tsx` during AAA-T-177 -- untestable without mounting the component. After extraction to `utils/`, they got unit tests in minutes. Rule of thumb: pure logic in `.tsx` = extraction candidate.

**Trigger payload schemas as cross-feature contract** — Each workflow trigger type (survey_submitted, booking_created, lead_scored) declares a payload schema in `lib/trigger-schemas.ts`. This schema defines what `{{variables}}` are available in email templates. Adding a new trigger = adding one payload schema → variables auto-appear in email template editor. **WHY:** Decouples triggers from email templates — no hardcoded variable lists per template type. Features communicate through schema contracts, not direct imports.

## Related Documentation

- [ADR-005: App vs Features Separation](../../../docs/adr/ARCHIVED-005-app-vs-features-separation.md)
- [ADR-006: Component Organization](../../../docs/adr/006-agency-project-structure.md#7-component-organization-pattern)
