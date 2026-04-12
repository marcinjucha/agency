# apps/cms/ - CMS Admin Panel

Admin panel for service providers. Authenticated application managing surveys, intake pipeline, appointments, blog, landing pages, email templates, media library, shop products, and site settings.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **State Management:** TanStack Query (server state)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui from @agency/ui
- **Auth:** Supabase Auth + Middleware
- **Database:** Supabase (RLS-protected queries)

## Folder Structure

```
apps/cms/
├── app/                      # Next.js App Router (ROUTING ONLY)
│   ├── layout.tsx           # Root layout with TanStack Query
│   ├── providers.tsx        # QueryClientProvider
│   ├── globals.css          # Tailwind + shadcn/ui theme
│   │
│   ├── login/               # Authentication
│   │   └── page.tsx         # Login form (public)
│   │
│   ├── admin/               # Protected routes (requires auth)
│   │   ├── layout.tsx       # Admin layout with Sidebar
│   │   ├── page.tsx         # Dashboard
│   │   ├── appointments/    # Appointment management
│   │   ├── blog/            # Blog posts
│   │   ├── email-templates/ # Email template editor
│   │   ├── intake/          # Unified intake hub
│   │   ├── landing-page/    # Landing page editor
│   │   ├── legal-pages/     # Legal pages editor
│   │   ├── media/           # Media library
│   │   ├── responses/       # Response list + detail
│   │   ├── settings/        # Settings
│   │   ├── shop/            # Shop (products + categories)
│   │   └── surveys/         # Survey management
│   │
│   └── api/                 # API Routes
│       ├── auth/            # Auth callbacks
│       ├── calendar/        # Google Calendar
│       ├── email-templates/ # Email template rendering
│       ├── marketplace/     # OAuth callbacks (OLX, Allegro)
│       ├── responses/       # Response API
│       ├── surveys/         # Survey CRUD
│       ├── upload/          # S3 file upload
│       └── workflows/       # Workflow trigger (POST to n8n Orchestrator)
│
├── features/                # BUSINESS LOGIC (ADR-005 pattern)
│   ├── appointments/        # Appointment management (Google Calendar sync)
│   ├── blog/                # Blog with Tiptap WYSIWYG, S3 images, SEO, ISR
│   ├── calendar/            # Calendar booking UI + settings
│   ├── editor/              # Shared Tiptap editor base (used by blog, shop, legal-pages)
│   ├── email/               # Email template editor + live preview
│   ├── intake/              # Unified intake hub — @dnd-kit kanban, split view
│   ├── landing/             # Landing page block editor + live preview
│   ├── legal-pages/         # Legal pages (regulamin, polityka prywatności) with shared Tiptap
│   ├── media/               # Media library — S3 upload, 6 types, folder tree, DnD, InsertMediaModal
│   ├── responses/           # Response list + detail view
│   ├── shop-categories/     # Shop category CRUD (inline editing, combobox with create)
│   ├── shop-marketplace/    # Marketplace integration (OLX + Allegro adapters, OAuth)
│   ├── shop-products/       # Shop product editor (Tiptap, media gallery, SEO, layout selector)
│   ├── site-settings/       # Site settings (org-level config, SEO defaults, keywords)
│   ├── surveys/             # Survey builder + link management
│   ├── workflows/           # Workflow engine — visual builder (ReactFlow), templates, execution
│   └── CLAUDE.md            # Features pattern documentation
│
├── components/              # SHARED UI COMPONENTS
│   ├── admin/
│   │   └── Sidebar.tsx      # Sidebar navigation
│   ├── shared/              # Reusable components
│   └── providers/           # React Context (future)
│
├── lib/                     # UTILITIES
│   ├── auth.ts              # getUserWithTenant() — shared auth helper
│   ├── messages.ts          # ~700+ Polish strings, nested by feature
│   ├── query-keys.ts        # Centralized TanStack Query key factories
│   ├── routes.ts            # All admin routes as constants
│   ├── s3.ts                # S3 presigned URL generation
│   ├── video-utils.ts       # Video embed URL parsing (YouTube, Vimeo, etc.)
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client (TanStack Query)
│   │   └── server.ts        # Server Supabase client (Server Components, Actions)
│   ├── n8n/                 # n8n webhook helpers
│   └── utils/
│       ├── slug.ts          # Polish slug generation (shared by blog + shop)
│       ├── status.ts        # Status helper utilities
│       └── media-proxy.ts   # createMediaProxyEditor for InsertMediaModal integration
│
├── hooks/                   # Custom React hooks (future)
│
├── middleware.ts            # Route protection (redirects to /login)
├── next.config.ts           # Next.js configuration
├── vitest.config.ts         # Vitest test configuration
├── vitest.setup.ts          # Test setup (mocks: Supabase, next/navigation, next/headers)
├── tailwind.config.ts       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies (@agency/cms)
```

## Folder Patterns (ADR-005)

### app/ - Routing Only
```typescript
// Minimal logic, imports from features/
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return <SurveyList />
}
```

### features/ - Business Logic
```typescript
// features/surveys/components/SurveyList.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys
  })
  // ... component logic
}
```

### components/ - Shared UI
Only components used across multiple features (e.g., Sidebar, Header).
Feature-specific components go in `features/{feature}/components/`.

## State Management

**Server State (TanStack Query):**
- Use for: API calls, database queries, cached data
- Example: Survey list, dashboard stats, responses

**Client State (useState/Zustand):**
- Use for: UI state, form state, local preferences
- Example: Survey builder selected question, sidebar collapsed

**Forms (React Hook Form):**
- Use for: All forms with validation
- Example: Login, create survey, edit survey

## Authentication

**Middleware:** Protects all `/admin` routes
- Unauthenticated users → redirect to `/login`
- Authenticated users → can access `/admin/*`

**Session:** Stored in HTTP-only cookies via Supabase Auth

**Logout:** Sidebar → Logout button → `supabase.auth.signOut()`

## Database Access

**Always use RLS-protected queries:**
```typescript
const supabase = createClient() // Uses anon key (respects RLS)
const { data } = await supabase.from('surveys').select('*')
// Automatically filtered by user's tenant_id
```

**getUserWithTenant() helper** — All CMS actions needing tenant_id import `getUserWithTenant` from `@/lib/auth.ts`. Returns `{ supabase, userId, tenantId }` or `{ error }` with `isAuthError()` type guard. **Why:** Eliminates duplicated tenant_id fetch across 4+ feature actions files.

**API routes must check auth** — All CMS API routes (except OAuth callbacks) must call `supabase.auth.getUser()` and return 401 if unauthenticated. Pattern: same as `app/api/upload/route.ts`. **Why:** API routes bypass middleware auth — unauthenticated requests silently succeed without explicit check.

**Service Role (use sparingly):**
Only for admin operations that bypass RLS.

## Routes

```
/login                       - Login page (public)
/admin                       - Dashboard
/admin/surveys               - Survey list
/admin/surveys/new           - Create survey
/admin/surveys/[id]          - Edit survey (builder + links)
/admin/responses             - Response list
/admin/responses/[id]        - Response detail
/admin/intake                - Unified intake hub (kanban + split view)
/admin/appointments          - Appointment management
/admin/blog                  - Blog post list
/admin/blog/new              - Create blog post
/admin/blog/[id]             - Edit blog post (Tiptap + SEO)
/admin/landing-page          - Landing page block editor
/admin/email-templates       - Email template list
/admin/email-templates/[type]- Email template editor + preview
/admin/media                 - Media library
/admin/legal-pages           - Legal pages editor
/admin/settings              - Site settings
/admin/shop/products         - Shop product list (grid/list toggle, 3 filters)
/admin/shop/products/new     - Create product
/admin/shop/products/[id]    - Edit product (Tiptap, media, SEO)
/admin/shop/categories       - Category management (inline CRUD)
/admin/shop/marketplace      - Marketplace connections (OLX, Allegro)
/admin/workflows             - Workflow list (gallery/table toggle)
/admin/workflows/[id]        - Workflow canvas editor (ReactFlow)
```

## Adding New Features

1. **Create feature folder:**
   ```bash
   mkdir -p features/new-feature/{components,__tests__}
   touch features/new-feature/{actions,queries,types}.ts
   ```

2. **Add route:**
   ```bash
   mkdir -p app/admin/new-feature
   touch app/admin/new-feature/page.tsx
   ```

3. **Import in route:**
   ```typescript
   import { NewFeatureList } from '@/features/new-feature/components/NewFeatureList'
   ```

## UI Design Patterns

**Save behavior by impact level:**
- **High-impact changes** (workflow editor, survey builder, landing page editor) → explicit Save/Publish button. Accidental changes can break live features.
- **Low-impact fields** (internal notes, Kanban reorder) → autosave with debounce (1s) + status indicator (saving/saved/error).

**Rich interactive UIs preferred:** When feature complexity warrants it, use professional interactive libraries (reactflow for workflow builder, @dnd-kit for Kanban) over simple form-based config. User values perceived professionalism of UI.

**Editor layout:** All editors (blog, shop, landing, survey, email) use `max-w-[1400px] mx-auto` centered grid. Blog prose additionally capped at `max-w-[700px]` (matches public website rendering). Sidebar 420px.

**CollapsibleCard:** Sidebar cards use `CollapsibleCard` from `@agency/ui`. SEO defaults closed, Settings/Images default open. Independent collapsible (multiple open simultaneously), NOT accordion.

**Cover image:** Always via InsertMediaModal (Media Library picker), never file upload input. InsertMediaModal lives in `features/media/components/`.

**Inline editing over Dialog:** Simple CRUD entities (categories) use inline row editing, not Dialog popups. Dialog is for complex multi-field forms only.

**Combobox with inline create:** Entity selectors (category dropdown) use Popover+Command combobox with search + "+ Nowa kategoria" inline creation. User doesn't need to leave current editor.

**View persistence:** List/grid view toggles persist to localStorage to survive navigation.

**No EmptyState on fixed-option pages:** Pages that always show all N options regardless of state (marketplace connections, calendar settings, email config) should NOT use EmptyState. Card grids with connected/not-connected states already communicate state visually. **Why:** EmptyState is for dynamic lists where empty = nothing to show. Fixed-option pages always render all options — adding EmptyState on top is redundant noise.

## Development

```bash
# Start CMS only
npm run dev:cms
# Visit: http://localhost:3001

# Build CMS only
npm run build:cms

# Run tests
npm run test --workspace=apps/cms        # Single run
npm run test:watch --workspace=apps/cms  # Watch mode (TDD)

# Test locally
# 1. Create user in Supabase
# 2. Run seed_first_user.sql
# 3. Login at http://localhost:3001/login
```

### React Compiler

React Compiler enabled via `reactCompiler: true` in all 4 `next.config.ts` files (cms, website, jacek, kolega). Next.js 16.2.3 + React 19.2.5 (2026-04-10).

**Impact:** Auto-memoizes — remove manual `useCallback`/`useMemo` when touching files (Boy Scout Rule). Don't wrap new handlers in `useCallback` by default. Only add manual memoization if profiling shows need.

## Testing (TDD)

**Testable files** (TDD Red-Green-Refactor): `actions.ts`, `queries.ts`, `queries.server.ts`, `hooks/*.ts`, `utils/*.ts`
**Not tested**: `components/`, `validation.ts` (Zod declarative), `types.ts`
**Test location**: `features/{name}/__tests__/{file}.test.ts`
**Style**: Integration — mock Supabase client, test action/query behavior. See `ag-dev-workflow` skill for full TDD patterns.

## Deployment

Auto-deploys to Vercel on push to `main`:
- URL: https://agency-cms.vercel.app
- Build Command: `npx turbo run build --filter=@agency/cms`
- Output: `apps/cms/.next`

## Environment Variables

Required in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` (browser + server)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser + server)
- `SUPABASE_SERVICE_ROLE_KEY` (server only, secret!)
- `N8N_WEBHOOK_URL` (server only — survey analysis webhook)
- `N8N_WORKFLOW_ORCHESTRATOR_URL` (server only — workflow execution, replaces N8N_WORKFLOW_EXECUTOR_URL)
- `HOST_URL` (server only)

See `.env.local.example` for full list.

## Related Files

- `middleware.ts` - Route protection logic
- `app/providers.tsx` - TanStack Query setup
- `app/globals.css` - shadcn/ui theme with CSS variables
