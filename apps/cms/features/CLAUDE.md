# features/ - Business Logic (CMS)

This directory contains business logic separated from routing (ADR-005 pattern).

## Purpose

Keep `app/routes/` clean (routing only) and put all business logic here:

- Data fetching (server functions)
- State management
- Component logic
- Mutations (server functions)
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
├── server.ts        # createServerFn — all data fetching + mutations
├── validations.ts   # Zod schemas
├── types.ts         # TypeScript interfaces
└── __tests__/       # Tests
```

**Why `server.ts` (not `actions.ts` or `queries.ts`):** CMS fully migrated from Next.js to TanStack Start (2026-04-16). All server logic uses `createServerFn({ method: 'POST' })`. No more Server Actions (`'use server'`), no more separate query files. Single file owns all server-side data access per feature.

## Example: Surveys Feature

### server.ts

```typescript
import { createServerFn } from '@tanstack/start'
import { createServerClient } from '@/lib/supabase/server-start'
import type { Tables } from '@agency/database'

export const getSurveysFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  })

export const createSurveyFn = createServerFn({ method: 'POST' })
  .validator((input: { title: string }) => createSurveySchema.parse(input))
  .handler(async ({ input }) => {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('surveys')
      .insert(input)
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data)
  })
```

### components/SurveyList.tsx

```typescript
import { useQuery } from '@tanstack/react-query'
import { getSurveysFn } from '../server'
import { queryKeys } from '@/lib/query-keys'

export function SurveyList() {
  const { data: surveys } = useQuery({
    queryKey: queryKeys.surveys.all,
    queryFn: getSurveysFn,
  })
  // Component logic here
}
```

## Usage in Routes

**app/routes/admin/surveys/index.tsx:**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { SurveyList } from '@/features/surveys/components/SurveyList'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/admin/surveys/')({
  head: () => buildCmsHead(messages.nav.surveys),
  component: () => <SurveyList />,
})
```

**Minimal routing logic** - all complex logic in features/.

## Server Logic

All server logic uses `createServerFn({ method: 'POST' })` in `features/{name}/server.ts`. API routes only for external webhooks (OAuth callbacks).

**Why POST for everything:** Default GET serializes data in URL params, causing 431 on large payloads (blog content, landing page blocks). User confirmed: always POST for all server fns.

## TanStack Query Integration (Pattern A)

Server functions used directly as `queryFn` — no browser client needed. CMS is auth-required with no SEO needs; components own data via `useQuery` with server fn queryFn.

```typescript
// features/surveys/server.ts — server function
export const getSurveysFn = createServerFn({ method: 'POST' })
  .handler(async () => { /* ... */ })

// features/surveys/components/SurveyList.tsx — server fn as queryFn
const { data } = useQuery({
  queryKey: queryKeys.surveys.all,
  queryFn: getSurveysFn,
})
```

**Why no browser client:** Browser client was only needed during Next.js coexistence. Server fns have auth via request cookies. Pattern evolved 4x total (2026-04-16).

## Type Safety

Always use explicit return types:

```typescript
export const getSurveysFn = createServerFn({ method: 'POST' })
  .handler(async (): Promise<Tables<'surveys'>[]> => {
    // TanStack Query requires explicit return types for type inference
  })
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

## File Naming

- Components: PascalCase (`SurveyList.tsx`)
- Server functions: camelCase with `Fn` suffix (`getSurveysFn`, `createSurveyFn`)
- Types: PascalCase (`Survey`, `Question`)
- Files: lowercase with dash (`survey-utils.ts`)

## Adding a New Feature

```bash
# 1. Create feature folder
mkdir -p features/new-feature/components

# 2. Create files
touch features/new-feature/components/NewFeatureList.tsx
touch features/new-feature/server.ts
touch features/new-feature/types.ts
touch features/new-feature/validations.ts

# 3. Create route
touch app/routes/admin/new-feature/index.tsx

# 4. Route file
# app/routes/admin/new-feature/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { NewFeatureList } from '@/features/new-feature/components/NewFeatureList'

export const Route = createFileRoute('/admin/new-feature/')({
  component: () => <NewFeatureList />,
})
```

## Gotchas

**Recurring patterns (see skills for details):**

- Tiptap renderHTML: inline styles only → see `ag-design-patterns` skill
- TanStack Query: root key invalidation → see `ag-design-patterns` skill

### Common Bugs & Gotchas

**Zod `.nullable().optional()` for DB nullable** — `z.string().optional()` accepts undefined but NOT null. DB stores null. Fix: `.nullable().optional()`. **WHY:** Supabase returns null for optional columns, Zod rejects it silently. Recurring across features.

**`import { cn } from '@agency/ui'` NOT `'@agency/ui/lib/utils'`** — Deep path import fails. Always use the package root export. **WHY:** Recurring across new components — the deep path is not exposed.

**handleSubmit needs onFormError callback** — Without onFormError, RHF validation errors are silently swallowed. Also: empty number inputs send NaN → add Zod transform: `z.coerce.number().transform(v => isNaN(v) ? null : v)`. **WHY:** Two silent failure modes in RHF+Zod combination.

**updateSchema.partial() makes IDs optional** — Using `.partial()` on a schema with required UUID fields makes them optional, bypassing NOT NULL DB constraints. Fix: `.omit({ id: true }).partial()` to exclude IDs before partial. **WHY:** Caught at DB level, not Zod level — silent in TypeScript.

**getMediaItems folder_id: undefined=all, null=root, string=folder** — Three-way distinction: default undefined returns ALL items (backward compat); null=root folder only; string=specific folder. **WHY:** Critical backward compat — null ≠ undefined ≠ string. Breaking this distinction silently filters out items.

**Never redefine types locally if they exist in shared packages** -- Always import `QuestionType`, `Question`, `SemanticRole` (and any survey/form types) from `@agency/validators`, never define local type aliases. **Why:** SurveyBuilder.tsx had a local `type QuestionType` duplicating the shared union from `@agency/validators`. The local type lacked `'consent'` -- causing a build error when the new question type was added to the shared package. Any new type variant added to the shared package will silently diverge from local copies. Same risk applies to any feature importing from `@agency/validators`, `@agency/database`, or `@agency/ui`. (2026-04-02)

**datetime-local vs Zod .datetime() mismatch** — HTML `datetime-local` input produces `"2026-03-28T14:30"` (no seconds, no timezone) but `z.string().datetime()` requires full ISO 8601. Fix: use `z.string().min(1)` — PostgreSQL `timestamptz` handles parsing. **Why:** Pre-existing bug in generate + update survey link schemas (AAA-T-88).

**Raw `<button>` lacks focus-visible ring — always use shadcn Button from `@agency/ui`** — Button guarantees `focus-visible:ring-2`. Raw `<button>` has no visible focus indicator = P0 accessibility violation (WCAG 2.4.7). **WHY:** Design review found 5 instances in AAA-T-157 where keyboard users couldn't see focus.

**`aria-label` on generic `<div>` ignored by screen readers — add `role="group"` or use semantic element** — For status indicators conveyed by color alone, add `sr-only` text spans. **WHY:** MarketplaceStatusDots had no screen reader alternative for color-coded status (AAA-T-157).

**Extract pure functions from `.tsx` to `utils/`** -- If a function inside a component file doesn't touch JSX (no hooks, no rendering), extract it to `features/{name}/utils/{descriptive-name}.ts`. These become TDD candidates alongside `server.ts`. **WHY:** `generateMockData()` and `formatExecutionStatus()` were buried in `TestModePanel.tsx` during AAA-T-177 -- untestable without mounting the component. After extraction to `utils/`, they got unit tests in minutes. Rule of thumb: pure logic in `.tsx` = extraction candidate.

**Trigger payload schemas as cross-feature contract** — Each workflow trigger type (survey_submitted, booking_created, lead_scored) declares a payload schema in `lib/trigger-schemas.ts`. This schema defines what `{{variables}}` are available in email templates. Adding a new trigger = adding one payload schema → variables auto-appear in email template editor. **WHY:** Decouples triggers from email templates — no hardcoded variable lists per template type. Features communicate through schema contracts, not direct imports.

**`export { X } from './module'` doesn't create local binding in same file** — Re-export syntax only forwards to external consumers. If same file needs to USE `X`, must have separate `import { X } from './module'`. Caused runtime `ReferenceError` in step-registry refactor when barrel re-exports were added alongside local usage. **WHY:** TypeScript compiles without error — the binding exists for importers but not for the file itself. Only surfaces at runtime. (AAA-T-190)

**`OutputSchemaField` serves dual context — never convert `.label` to `labelKey`** — Same type used for static output schema definitions in step-registry (CAN use labelKey bridge) AND user-defined output fields saved to DB via AI Action config panel (MUST keep `.label` as freetext string entered by user, e.g. "Customer name"). Converting `.label` to `labelKey` would silently break user-defined output schemas. **WHY:** Only registry-level labels use the i18n bridge pattern. DB-persisted user input must remain raw strings — no message key lookup exists for dynamic user content. (AAA-T-190)

## Related Documentation

- [ADR-005: App vs Features Separation](../../../docs/adr/ARCHIVED-005-app-vs-features-separation.md)
- [ADR-006: Component Organization](../../../docs/adr/006-agency-project-structure.md#7-component-organization-pattern)
