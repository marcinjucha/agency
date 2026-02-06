# ADR-006: Agency Project Structure and Architecture Patterns

> **Note:** This project was renamed from "legal-mind" to "agency" in February 2026.

**Status:** Accepted
**Date:** 2025-12-05 (Last Updated: 2026-02-06)
**Context:** Agency SaaS Platform - Multi-tenant legal intake system
**Deciders:** Marcin Jucha

---

## Context and Problem Statement

Legal-Mind requires a scalable, maintainable architecture that supports:
- Multi-tenant SaaS for law firms
- Two distinct user-facing applications (public website + admin CMS)
- Shared business logic and UI components
- Future team growth (1-2 developers in 3-6 months)
- Flexibility for subdomain deployment strategy
- Type-safe database operations
- Efficient development workflow

We need to decide on:
1. Monorepo structure (Turborepo vs single repo)
2. Application separation strategy
3. Folder organization pattern
4. Shared code management
5. State management approach
6. Database and type safety patterns

---

## Decision Drivers

### Business Requirements
- **Speed to market:** MVP in 10-12 weeks
- **Scalability:** Support 100-1000 law firms
- **Team growth:** Solo → 2-3 developers within 6 months
- **Deployment flexibility:** Single domain now, subdomains later

### Technical Requirements
- **Type safety:** End-to-end TypeScript
- **Code reuse:** Minimize duplication between apps
- **Independent deployments:** Website and CMS can deploy separately
- **Developer experience:** Fast iteration, clear boundaries
- **Performance:** Optimized bundles, efficient builds

---

## Considered Options

### Option 1: Single Next.js App with Route Groups
- All code in one app
- Use route groups: `(public)`, `(admin)`
- Shared components via `/features` folder

**Pros:**
- Fastest to start
- Simplest for solo developer
- Single deployment

**Cons:**
- Hard to split later
- No deployment independence
- Larger bundle size

### Option 2: Full Turborepo with 3 Apps
- Separate apps: website, survey, cms
- Maximum separation
- Individual package.json for each

**Pros:**
- Maximum isolation
- Independent deployments
- Clear ownership

**Cons:**
- High initial complexity
- Overhead for solo developer
- More configuration

### Option 3: Turborepo with 2 Apps (CHOSEN)
- `apps/website` - Public landing + survey forms
- `apps/cms` - Admin panel for law firms
- Shared packages for common code

**Pros:**
- Logical separation (PUBLIC vs ADMIN)
- Ready for subdomain split
- Shared packages prevent duplication
- Balanced complexity

**Cons:**
- More setup than Option 1
- Learning curve for Turborepo

---

## Decision Outcome

**Chosen option:** Turborepo with 2 Next.js Applications + Shared Packages

### Architecture Overview

```
agency/
├── apps/
│   ├── website/          # PUBLIC: Marketing + Survey Forms
│   └── cms/              # ADMIN: Management Panel
│
└── packages/
    ├── ui/               # Shared UI components (shadcn/ui)
    ├── database/         # Supabase types and queries
    └── validators/       # Zod validation schemas
```

---

## Architecture Patterns

### 1. Application Separation Pattern

**Principle:** Separate by authentication boundary, not by feature

**Website App (`apps/website/`):**
- **Purpose:** Public-facing, no authentication required
- **Users:** Prospective clients, survey respondents
- **Routes:**
  - `/` - Marketing homepage
  - `/pricing` - Pricing information
  - `/o-nas` - About page
  - `/kontakt` - Contact page
  - `/survey/[token]` - Client survey form + calendar booking
- **No middleware:** All routes publicly accessible
- **State:** React Hook Form for forms, no TanStack Query needed

**CMS App (`apps/cms/`):**
- **Purpose:** Admin panel for law firms
- **Users:** Lawyers, law firm staff
- **Routes:**
  - `/login` - Authentication
  - `/admin` - Dashboard
  - `/admin/surveys` - Survey management
  - `/admin/responses` - Client submissions
  - `/admin/calendar` - Calendar management
  - `/admin/settings` - Settings
- **Middleware:** Protects ALL routes except `/login`
- **State:** TanStack Query for data fetching and caching

**Rationale:**
- Survey forms are public (sent via email) → belong with website
- Admin features require authentication → separate app with middleware
- Clear mental model: "Can anyone access this?" → Website vs CMS

---

### 2. Folder Structure Pattern (ADR-005 Inspired)

**Principle:** Routing in `app/`, business logic in `features/`

```typescript
// ❌ BAD: Business logic mixed with routing
app/admin/surveys/page.tsx:
  - Fetches data
  - Renders UI
  - Handles mutations
  - Validation logic

// ✅ GOOD: Clear separation
app/admin/surveys/page.tsx:
  - Imports SurveyList component
  - Minimal routing logic only

features/surveys/components/SurveyList.tsx:
  - Contains business logic
  - Data fetching
  - UI rendering

features/surveys/queries.ts:
  - Database queries
  - Supabase calls

features/surveys/actions.ts:
  - Server Actions
  - Mutations

features/surveys/validations.ts:
  - Zod schemas
  - Validation logic
```

**Folder Structure Template:**

```
apps/{app-name}/
├── app/                    # ROUTING ONLY
│   ├── (group)/           # Route groups for layouts
│   ├── [dynamic]/         # Dynamic routes
│   └── api/               # API routes
│
├── features/              # BUSINESS LOGIC (ADR-005)
│   └── {feature}/
│       ├── components/    # Feature-specific components
│       ├── actions.ts     # Server Actions
│       ├── queries.ts     # Data fetching
│       ├── validations.ts # Zod schemas
│       └── types.ts       # TypeScript types
│
├── components/            # SHARED UI COMPONENTS
│   ├── layout/           # Navbar, Footer, Sidebar
│   ├── shared/           # Reusable UI components
│   └── providers/        # React Context providers
│
└── lib/                  # UTILITIES
    ├── supabase/         # Supabase clients
    ├── utils/            # Helper functions
    └── {service}/        # External service integrations
```

**Benefits:**
- **Clear responsibility:** app/ = routing, features/ = logic
- **Testable:** Business logic isolated from Next.js
- **Reusable:** Features can be extracted to packages if needed
- **Discoverable:** Find logic by feature, not by route

---

### 3. Shared Code Pattern

**Principle:** Share via packages, not copy-paste

**When to create a shared package:**
- ✅ Used in 2+ apps
- ✅ Has clear API boundary
- ✅ Changes infrequently
- ✅ Needs version control (future)

**Our Shared Packages:**

**@agency/ui**
```typescript
// Purpose: UI components used in both apps
// Examples:
- Button, Input, Form (shadcn/ui)
- SurveyForm component (used in CMS preview + Website client form)
- CalendarBooking component (shared logic)

// Usage:
import { Button, SurveyForm } from '@agency/ui'
```

**@agency/database**
```typescript
// Purpose: Single source of truth for DB types
// Auto-generated from Supabase schema

// Usage:
import type { Database, Tables } from '@agency/database'
type Survey = Tables<'surveys'>
```

**@agency/validators**
```typescript
// Purpose: Shared validation logic
// Examples:
- surveySchema (validates survey structure)
- Used in: CMS (when creating), Website (when submitting), n8n (webhooks)

// Usage:
import { surveySchema } from '@agency/validators'
```

**Anti-pattern:**
```typescript
// ❌ Don't create @agency/admin (too app-specific)
// ❌ Don't create @agency/utils (too generic)
// ✅ Keep app-specific logic in apps/{app}/features/
```

---

### 4. State Management Pattern

**Principle:** Use the right tool for the job

**State Management Hierarchy:**
- ✅ **TanStack Query** for server state (CMS only)
- ✅ **Zustand** for client state when React Context is too complex
- ✅ **React Context** for simple global state (theme, i18n)
- ✅ **URL params** for filter state (search, pagination)
- ❌ **No Redux** (too heavy, unnecessary for our use case)

**CMS App (Complex Data Fetching):**
```typescript
// ✅ TanStack Query for SERVER state:
- Surveys list (cache, refetch, optimistic updates)
- Responses list (pagination, filtering)
- Dashboard stats (background refetch)

// Example:
const { data: surveys } = useQuery({
  queryKey: ['surveys', filters],
  queryFn: () => getSurveys(filters),
  staleTime: 1000 * 60 * 5, // 5 min cache
})

// ✅ Zustand for CLIENT state (when needed):
- Survey Builder UI state (selected question, drag state)
- Multi-step form progress
- Sidebar collapse/expand state
- Any complex local state that multiple components need

// Example (Survey Builder):
import { create } from 'zustand'

interface SurveyBuilderStore {
  selectedQuestionId: string | null
  setSelectedQuestion: (id: string | null) => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
}

export const useSurveyBuilder = create<SurveyBuilderStore>((set) => ({
  selectedQuestionId: null,
  setSelectedQuestion: (id) => set({ selectedQuestionId: id }),
  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),
}))
```

**Website App (Simple Forms):**
```typescript
// ✅ React Hook Form for:
- Survey form submission (one-time submit)
- Contact form (no server state needed)

// Example:
const { handleSubmit } = useForm()
const onSubmit = async (data) => {
  await fetch('/api/survey/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
```

**When to use Zustand:**
- ✅ Survey Builder (selected questions, drag state, preview mode)
- ✅ Complex forms with multi-step wizards
- ✅ UI state shared across many components
- ✅ State that needs to persist during navigation
- ❌ Simple component state (use useState)
- ❌ Server state (use TanStack Query)
- ❌ Form state (use React Hook Form)

**Installation (when needed):**
```bash
# Add to apps/cms/package.json
npm install zustand --workspace=@legal-mind/cms
```

**Rationale:**
- Zustand is lightweight (1kb) and has excellent DevTools
- Simpler API than Context + useReducer for complex state
- Better performance than Context (no re-render cascades)
- Perfect for Survey Builder drag-drop UI state
- TanStack Query handles server state → Zustand for client state
- Website forms are simple → React Hook Form sufficient

---

### 5. Database Access Pattern

**Principle:** RLS first, Service Role only when necessary

**Multi-Tenant Isolation via RLS:**
```typescript
// ✅ Browser/Server: Use anon key (respects RLS)
const supabase = createClient() // Uses NEXT_PUBLIC_SUPABASE_ANON_KEY

const { data } = await supabase
  .from('surveys')
  .select('*')
// Automatically filtered by user's tenant_id via RLS policy

// ❌ Don't use service_role for normal queries
// Only use for:
// - Admin operations (delete tenant)
// - Bypassing RLS intentionally
// - Background jobs
```

**Type-Safe Queries:**
```typescript
// ✅ Always use Database type from @agency/database
import type { Database } from '@agency/database'

const supabase = createClient<Database>()

// TypeScript knows about all tables, columns, relationships
const { data } = await supabase
  .from('surveys') // ✓ Autocomplete
  .select('id, title, created_by(full_name)') // ✓ Type-safe joins
```

**Query Organization:**
```typescript
// ✅ Encapsulate queries in features/
features/surveys/queries.ts:
export async function getSurveys() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('*')

  if (error) throw error
  return data
}

// Usage in components:
const { data } = useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys,
})
```

---

### 6. Type Safety Pattern

**Principle:** Generate, don't write

**Database Types (Auto-generated):**
```bash
# After schema changes:
supabase gen types typescript --linked > packages/database/src/types.ts

# Or use npm script:
npm run db:types
```

**Form Validation (Zod schemas):**
```typescript
// packages/validators/src/survey.ts
export const surveySchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(questionSchema),
})

export type Survey = z.infer<typeof surveySchema>

// Use in React Hook Form:
const form = useForm<Survey>({
  resolver: zodResolver(surveySchema)
})
```

**Benefits:**
- Single source of truth (database schema)
- Compile-time safety
- Autocomplete in IDE
- Refactoring safety

---

### 7. Component Organization Pattern

**Principle:** Colocation by feature, not by type

```typescript
// ❌ BAD: Organize by component type
components/
├── buttons/
│   ├── PrimaryButton.tsx
│   └── SecondaryButton.tsx
├── forms/
│   ├── SurveyForm.tsx
│   └── LoginForm.tsx
└── cards/
    └── SurveyCard.tsx

// ✅ GOOD: Organize by feature
features/
├── surveys/
│   └── components/
│       ├── SurveyForm.tsx
│       ├── SurveyCard.tsx
│       └── SurveyBuilder.tsx
│
└── auth/
    └── components/
        └── LoginForm.tsx

// Shared primitives go in packages/ui
packages/ui/src/components/
├── button.tsx         # Generic Button (from shadcn/ui)
├── input.tsx          # Generic Input
└── form.tsx           # Generic Form wrapper
```

**Rationale:**
- **Colocation:** Related code stays together
- **Discovery:** Find all survey code in one place
- **Extraction:** Easy to move feature to separate package later
- **Clarity:** No guessing "where does this belong?"

---

### 8. Import Alias Pattern

**Principle:** Consistent, predictable imports

**Alias Configuration:**

```typescript
// All apps use:
"@/*" // Maps to app root

// Examples:
import { createClient } from '@/lib/supabase/client'
import { SurveyList } from '@/features/surveys/components/SurveyList'
import { Navbar } from '@/components/layout/Navbar'

// Shared packages:
import { Button } from '@agency/ui'
import type { Database } from '@agency/database'
import { surveySchema } from '@agency/validators'
```

**Rules:**
- `@/` for same-app imports (features, components, lib)
- `@agency/*` for cross-app imports (shared packages)
- Relative imports `./` only within same folder
- No `../../../` (use aliases instead)

---

### 9. Environment Variables Pattern

**Principle:** Explicit, documented, secure

**Structure:**
```bash
# .env.local.example (committed)
NEXT_PUBLIC_SUPABASE_URL=your-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here

# .env.local (NOT committed, in .gitignore)
NEXT_PUBLIC_SUPABASE_URL=https://zsrpdslhnuwmzewwoexr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Naming Convention:**
- `NEXT_PUBLIC_*` - Exposed to browser (safe)
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only (secret)
- `GOOGLE_CLIENT_SECRET` - Server-only (secret)

**Documentation:**
- Every app has `.env.local.example`
- Comments explain where to get each value
- Secrets clearly marked "KEEP SECRET"

---

### 10. API Routes Pattern

**Principle:** Minimal API routes, prefer Server Actions

**When to use API routes:**
- ✅ Webhooks (n8n, Google Calendar)
- ✅ External integrations
- ✅ Public endpoints (survey submission)

**When to use Server Actions:**
- ✅ Form submissions (authenticated)
- ✅ CRUD operations
- ✅ Internal mutations

**Example:**

```typescript
// ✅ Server Action (preferred for CMS)
'use server'
export async function createSurvey(data: Survey) {
  const supabase = await createClient()
  return await supabase.from('surveys').insert(data)
}

// ✅ API Route (for webhooks)
app/api/webhooks/n8n/route.ts:
export async function POST(req: Request) {
  const payload = await req.json()
  // Process webhook
}
```

---

## Implementation Details

### Monorepo Configuration

**turbo.json:**
```json
{
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

**Key Points:**
- Use `tasks` (not `pipeline` - Turborepo 2.0)
- `dependsOn: ["^build"]` builds packages before apps
- Persistent dev servers
- Cache build outputs

---

### Package Structure

**Template for each package:**

```
packages/{package-name}/
├── package.json
│   ├── name: "@agency/{package-name}"
│   ├── main: "./src/index.ts"
│   └── dependencies: { ... }
│
├── tsconfig.json
│   ├── extends: "../../tsconfig.json"
│   └── include: ["src/**/*"]
│
└── src/
    ├── index.ts        # Public API exports
    └── ...             # Implementation
```

**Rules:**
- Package name: `@agency/{name}` (scoped)
- Main entry: `./src/index.ts` (not dist/)
- Version: `*` in app dependencies (monorepo link)
- Private: `"private": true` (not published to npm)

---

### Feature Structure (ADR-005 Pattern)

**Template for each feature:**

```
features/{feature-name}/
├── components/
│   ├── {Feature}List.tsx
│   ├── {Feature}Form.tsx
│   └── {Feature}Detail.tsx
│
├── actions.ts         # Server Actions
├── queries.ts         # Data fetching (Supabase)
├── validations.ts     # Zod schemas
├── types.ts           # TypeScript interfaces
└── __tests__/         # Tests
    └── {feature}.test.ts
```

**Example (Surveys feature):**

```
features/surveys/
├── components/
│   ├── SurveyList.tsx      # List all surveys
│   ├── SurveyBuilder.tsx   # Create/edit UI
│   └── SurveyPreview.tsx   # Preview mode
│
├── actions.ts
│   ├── createSurvey()      # Server Action
│   ├── updateSurvey()      # Server Action
│   └── deleteSurvey()      # Server Action
│
├── queries.ts
│   ├── getSurveys()        # Fetch list
│   ├── getSurvey(id)       # Fetch single
│   └── getSurveyByToken()  # Public access
│
├── validations.ts
│   └── surveySchema        # Zod schema
│
└── types.ts
    ├── Survey              # Inferred from Zod
    ├── Question            # Question interface
    └── SurveyStatus        # Status enum
```

---

### Database Schema Pattern

**Principle:** Multi-tenant first, secure by default

**Table Naming:**
- Plural: `tenants`, `users`, `surveys` (not `tenant`, `user`, `survey`)
- Snake_case: `survey_links`, `ai_qualification`
- Descriptive: `appointments` (not `bookings` or `events`)

**Required Columns (All Tables):**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()  -- with trigger
```

**Multi-Tenant Pattern:**
```sql
-- Every tenant-owned table has:
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE

-- RLS Policy:
CREATE POLICY "Users can view own tenant"
  ON {table} FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**Audit Pattern:**
```sql
-- Track who created/modified
created_by UUID NOT NULL REFERENCES users(id)
updated_at TIMESTAMPTZ  -- Auto-updated via trigger
```

---

### Authentication Pattern

**Principle:** Middleware for routes, RLS for data

**CMS Middleware:**
```typescript
// Protects ALL routes except login
export async function middleware(request: NextRequest) {
  const { user } = await supabase.auth.getUser()

  if (!user && !isPublicRoute) {
    return redirect('/login')
  }

  return response
}
```

**User Session:**
```typescript
// Server Components (recommended):
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// Client Components (when needed):
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**User-Tenant Relationship:**
```typescript
// Always fetch user's tenant context
const { data: userData } = await supabase
  .from('users')
  .select('tenant_id, role, full_name')
  .eq('id', user.id)
  .single()

// RLS automatically filters by tenant_id
const { data: surveys } = await supabase
  .from('surveys')
  .select('*') // Only sees own tenant's surveys
```

---

## Migration Path

### When to Split Further (3 Apps)

**Trigger:** If any of these occur:
- Website traffic >> CMS traffic (need separate scaling)
- Survey forms need different domain (survey.legalmind.pl)
- Team > 5 developers (need more isolation)

**How to split:**
```bash
# Create new survey app
cp -r apps/website apps/survey

# Keep only survey routes in survey app
# Remove (marketing) routes

# Update deployments
# website: legalmind.pl
# survey: survey.legalmind.pl
# cms: app.legalmind.pl
```

---

## Consequences

### Positive

✅ **Clear boundaries:** PUBLIC vs ADMIN separation
✅ **Type safety:** End-to-end TypeScript from DB to UI
✅ **Code reuse:** Shared packages prevent duplication
✅ **Independent deployment:** Website and CMS deploy separately
✅ **Team-ready:** Structure supports 2-3 developers
✅ **Scalable:** Easy to add mobile app or API server later
✅ **Testable:** Features isolated and unit-testable

### Negative

❌ **Initial complexity:** More setup than single app
❌ **Learning curve:** Team must learn Turborepo + patterns
❌ **Build times:** Slightly slower than single app (but cached)
❌ **Configuration overhead:** 2 apps = 2 configs

### Neutral

⚖️ **Bundle size:** Slightly larger due to some duplication, but route-based splitting helps
⚖️ **Monorepo tools:** Requires Turborepo knowledge
⚖️ **Deployment:** 2 Vercel projects (but automated)

---

## Examples and Templates

### Creating a New Feature

```bash
# 1. Decide which app it belongs to
# PUBLIC (no auth) → apps/website
# ADMIN (auth required) → apps/cms

# 2. Create feature folder
mkdir -p apps/cms/features/new-feature/{components,__tests__}

# 3. Create files
touch apps/cms/features/new-feature/{actions,queries,validations,types}.ts

# 4. Add route
mkdir -p apps/cms/app/admin/new-feature
touch apps/cms/app/admin/new-feature/page.tsx

# 5. Import in page
import { NewFeatureList } from '@/features/new-feature/components/NewFeatureList'
```

### Creating a New Shared Component

```bash
# 1. Add to packages/ui
cd packages/ui/src/components
npx shadcn@latest add {component-name}

# 2. Export from index.ts
echo "export * from './components/{component-name}'" >> src/index.ts

# 3. Use in apps
import { ComponentName } from '@agency/ui'
```

### Adding a New Database Table

```bash
# 1. Create migration
supabase migration new add_{table_name}

# 2. Write SQL
CREATE TABLE {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

# 3. Push migration
supabase db push

# 4. Regenerate types
npm run db:types

# 5. Use in code with type safety
const { data } = await supabase.from('{table_name}').select('*')
```

---

## Reference Implementation

### File: `apps/cms/features/surveys/components/SurveyList.tsx`

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'
import { Button } from '@agency/ui'
import Link from 'next/link'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Surveys</h2>
        <Link href="/admin/surveys/new">
          <Button>Create Survey</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {surveys?.map((survey) => (
          <div key={survey.id} className="p-4 border rounded">
            <h3 className="font-semibold">{survey.title}</h3>
            <p className="text-sm text-gray-500">{survey.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### File: `apps/cms/features/surveys/queries.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

export async function getSurveys() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getSurvey(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('*, created_by(full_name)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
```

### File: `apps/cms/app/admin/surveys/page.tsx`

```typescript
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return (
    <div>
      <SurveyList />
    </div>
  )
}
```

---

## Validation and Quality

### TypeScript Strict Mode
- Enabled across all packages and apps
- No `any` types without explicit justification
- Strict null checks enforced

### Linting
- ESLint with Next.js recommended rules
- Prettier for code formatting
- Pre-commit hooks (future)

### Testing Strategy (Future)
```
features/{feature}/__tests__/
├── components/
│   └── {Component}.test.tsx    # Unit tests
├── queries.test.ts              # Integration tests
└── actions.test.ts              # E2E tests
```

---

## Related ADRs

- [ARCHIVED-001: Monorepo Structure](./ARCHIVED-001-monorepo-structure.md) - Historical reference from Multi-tenant CMS project
- [ARCHIVED-005: App vs Features Separation](./ARCHIVED-005-app-vs-features-separation.md) - Pattern now in ADR-006 Section 2, from Multi-tenant CMS project
- [ADR-007: N8n Background Processing](./007-n8n-background-processing.md) - AI workflow automation

---

## Notes

### Differences from Multi-Tenant CMS Project

Legal-Mind is simpler:
- **2 apps** (not 3+) - Website + CMS (not multiple tenant frontends)
- **No plugin system** - Straightforward SaaS
- **Simpler state** - TanStack Query only in CMS (not everywhere)
- **Single product** - One offering (not multi-product platform)

### Future Considerations

When adding:
- **Mobile app** → Create `apps/mobile`, reuse `packages/*`
- **Public API** → Create `apps/api`, reuse `packages/database`
- **Lex integration** → Add `features/lex-search/` in CMS
- **White-label** → Requires architecture rethink (not planned)

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  LEGAL-MIND ARCHITECTURE CHEAT SHEET                │
├─────────────────────────────────────────────────────┤
│  APPS                                               │
│  ├─ website/  → Public (no auth)                    │
│  └─ cms/      → Admin (auth required)               │
│                                                      │
│  PACKAGES                                           │
│  ├─ ui/         → Components (shadcn/ui)            │
│  ├─ database/   → Supabase types (auto-generated)   │
│  └─ validators/ → Zod schemas (shared validation)   │
│                                                      │
│  FOLDER PATTERN (inside apps)                       │
│  ├─ app/        → Routes (minimal logic)            │
│  ├─ features/   → Business logic (most code here)   │
│  ├─ components/ → Shared UI (layout, primitives)    │
│  └─ lib/        → Utils (supabase, helpers)         │
│                                                      │
│  STATE MANAGEMENT                                   │
│  ├─ Server     → TanStack Query (API data)          │
│  ├─ Client     → Zustand (UI state, lightweight)    │
│  └─ Forms      → React Hook Form (validation)       │
│                                                      │
│  DATABASE                                           │
│  ├─ Access     → RLS policies (multi-tenant)        │
│  ├─ Types      → Auto-generated (npm run db:types)  │
│  └─ Migrations → SQL files (supabase db push)       │
│                                                      │
│  IMPORTS                                            │
│  ├─ Same app   → @/features/...                     │
│  └─ Packages   → @agency/ui                         │
└─────────────────────────────────────────────────────┘
```

---

## Decision Review

**Review Date:** 2025-06-05 (6 months from now)
**Review Criteria:**
- Team size (still solo or grown?)
- Traffic patterns (website vs cms ratio)
- Pain points (what's slowing us down?)
- New requirements (mobile app, API, etc.)

**Possible changes:**
- Split website into website + survey (if traffic demands)
- Merge apps if team stays solo (simplify)
- Extract more packages (if mobile app added)

---

**Status:** ✅ Implemented and Validated
**Last Updated:** 2025-12-05
**Next Review:** 2025-06-05
