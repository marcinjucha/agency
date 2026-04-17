# apps/cms/ - CMS Admin Panel

Admin panel for service providers. Authenticated application managing surveys, intake pipeline, appointments, blog, landing pages, email templates, media library, shop products, and site settings.

## Tech Stack

- **Framework:** TanStack Start v1.167 + Vite 8 (port 3001)
- **State Management:** TanStack Query (server state)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui from @agency/ui
- **Auth:** Supabase Auth + `beforeLoad` route guards
- **Database:** Supabase (RLS-protected queries via `createServerFn`)

## Folder Structure

```
apps/cms/
├── app/                      # TanStack Start entry points + routes
│   ├── client.tsx           # Client entry (createStartHandler)
│   ├── router.tsx           # Router factory + RouterContext type
│   ├── ssr.tsx              # SSR entry (createStartHandler)
│   ├── routeTree.gen.ts     # Auto-generated route tree (do not edit)
│   ├── globals.css          # Tailwind + shadcn/ui theme
│   │
│   └── routes/              # File-based routing
│       ├── __root.tsx       # Root layout (html/body, auth beforeLoad, Sentry)
│       ├── index.tsx        # Redirect to /admin
│       ├── login.tsx        # Login page (public)
│       ├── admin.tsx        # Admin layout (auth guard, Sidebar, QueryClientProvider)
│       ├── admin/           # Protected routes
│       │   ├── index.tsx    # Dashboard
│       │   ├── blog/        # Blog posts (index, new, $postId)
│       │   ├── email-templates/ # Email template editor
│       │   ├── intake/      # Unified intake hub
│       │   ├── landing-page/# Landing page editor
│       │   ├── legal-pages/ # Legal pages editor
│       │   ├── media/       # Media library
│       │   ├── responses/   # Response list + detail
│       │   ├── settings/    # Site settings
│       │   ├── shop/        # Shop (products + categories + marketplace)
│       │   ├── surveys/     # Survey management
│       │   ├── workflows/   # Workflow builder
│       │   ├── roles/       # Role management
│       │   ├── users/       # User management
│       │   ├── tenants/     # Tenant management
│       │   └── docforge/    # DocForge license management
│       │
│       └── api/             # Server routes (external webhooks only)
│           ├── auth/        # OAuth callbacks
│           ├── marketplace/ # OAuth callbacks (OLX, Allegro)
│           └── workflows/   # Workflow trigger (POST to n8n Orchestrator)
│
├── features/                # BUSINESS LOGIC (ADR-005 pattern)
│   ├── appointments/        # Appointment management (Google Calendar sync)
│   ├── blog/                # Blog with Tiptap WYSIWYG, S3 images, SEO, ISR
│   ├── calendar/            # Calendar booking UI + settings
│   ├── editor/              # Shared Tiptap editor base (used by blog, shop, legal-pages)
│   ├── email/               # Email template editor + live preview
│   ├── intake/              # Unified intake hub — @dnd-kit kanban, split view
│   ├── landing/             # Landing page block editor + live preview
│   ├── legal-pages/         # Legal pages (regulamin, polityka prywatnosci) with shared Tiptap
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
│   │   └── SidebarV2.tsx    # Sidebar navigation
│   ├── shared/              # Reusable components
│   └── providers/           # React Context
│
├── contexts/                # React Context providers (permissions, etc.)
│
├── lib/                     # UTILITIES
│   ├── auth.ts              # getUserWithTenant() — shared auth helper (legacy, still used by some features)
│   ├── head.ts              # buildCmsHead() — shared <head> builder for routes
│   ├── messages.ts          # ~700+ Polish strings, nested by feature
│   ├── query-keys.ts        # Centralized TanStack Query key factories
│   ├── routes.ts            # All admin routes as constants
│   ├── s3.ts                # S3 presigned URL generation
│   ├── server-auth.ts       # requireAuthContext() + requireAuthContextFull() — neverthrow ResultAsync
│   ├── video-utils.ts       # Video embed URL parsing (YouTube, Vimeo, etc.)
│   ├── server-fns/          # Shared server functions (auth, admin-layout)
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client (TanStack Query queryFn fallback)
│   │   ├── server-start.ts  # Server Supabase client (cookies from request — used in all server fns)
│   │   └── service.ts       # Service role client (bypass RLS)
│   ├── n8n/                 # n8n webhook helpers
│   └── utils/
│       ├── slug.ts          # Polish slug generation (shared by blog + shop)
│       ├── status.ts        # Status helper utilities
│       └── media-proxy.ts   # createMediaProxyEditor for InsertMediaModal integration
│
├── hooks/                   # Custom React hooks
│
├── vite.config.ts           # Vite 8 + TanStack Start config (includes nitro() for Vercel)
├── vitest.config.ts         # Vitest test configuration
├── vitest.setup.ts          # Test setup (mocks: Supabase, @tanstack/react-router)
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies (@agency/cms)
```

## Folder Patterns (ADR-005)

### app/routes/ - Routing Only
```typescript
// app/routes/admin/blog/index.tsx — minimal route
import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { BlogPostList } from '@/features/blog/components/BlogPostList'

export const Route = createFileRoute('/admin/blog/')({
  head: () => buildCmsHead(messages.nav.blog),
  component: BlogListPage,
})
function BlogListPage() { return <BlogPostList /> }
```

### features/ - Business Logic
```typescript
// features/surveys/components/SurveyList.tsx
import { useQuery } from '@tanstack/react-query'
import { getSurveysFn } from '../server'

export function SurveyList() {
  const { data } = useQuery({
    queryKey: surveyKeys.list(),
    queryFn: () => getSurveysFn()
  })
  // ... component logic
}
```

### features/{name}/server.ts - Server Functions
```typescript
// features/surveys/server.ts
import { createServerFn } from '@tanstack/start'
import { requireAuthContext } from '@/lib/server-auth'

export const getSurveysFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    return requireAuthContext()
      .andThen(({ supabase, tenantId }) =>
        // ... query logic
      )
      .match(data => data, error => { throw new Error(error) })
  })
```

### components/ - Shared UI
Only components used across multiple features (e.g., Sidebar, Header).
Feature-specific components go in `features/{feature}/components/`.

## State Management — Pattern A

**CMS uses Pattern A:** `createServerFn` directly as `queryFn` in `useQuery`. No browser client needed for data fetching.

**Server State (TanStack Query + server fns):**
- Components own their data fetching via `useQuery` with server fn as queryFn
- No loader prefetch needed (auth-required app, no SEO)
- Server fns handle auth via request cookies automatically

**Client State (useState/Zustand):**
- Use for: UI state, form state, local preferences
- Example: Survey builder selected question, sidebar collapsed

**Forms (React Hook Form):**
- Use for: All forms with validation

**Why Pattern A:** CMS is fully auth-gated with no public/SEO pages. Components calling `useQuery({ queryFn: () => myServerFn() })` is simpler than loader-based prefetch. Server fns have auth context from request cookies.

## Authentication

**Route guards via `beforeLoad`:**
- `__root.tsx`: Calls `getAuthContextFn()` — sets `context.auth` for all routes
- `admin.tsx`: Checks `context.auth` — redirects to `/login` if unauthenticated

**`lib/server-auth.ts`:** neverthrow-based auth context for server fns:
- `requireAuthContext()` — returns `ResultAsync<AuthContext, string>` (userId, tenantId, supabase client)
- `requireAuthContextFull()` — returns `ResultAsync<AuthContextFull, string>` (adds isSuperAdmin, roleName, permissions)
- Usage in server fns: `requireAuthContext().andThen(({ supabase, tenantId }) => ...)`

**Session:** Stored in HTTP-only cookies via Supabase Auth

**Logout:** Sidebar → Logout button → `logoutFn()` server fn → `queryClient.clear()` → redirect to `/login`

## Database Access

**All data fetching through `createServerFn`** — server fns use `createServerClient()` from `lib/supabase/server-start.ts` which reads cookies from the request (RLS-aware).

**Auth pipeline in server fns:**
```typescript
requireAuthContext().andThen(({ supabase, tenantId }) =>
  ResultAsync.fromPromise(
    supabase.from('table').select('*').eq('tenant_id', tenantId),
    () => 'queryFailed'
  )
)
```

**Service Role (use sparingly):**
Only for admin operations that bypass RLS. Use `createServiceClient()` from `lib/supabase/service.ts`.

## Gotchas

- **`messages.nav.xxx` is the correct key (NOT `messages.navigation.xxx`)** — Agent hallucinated `messages.navigation` as the section key. Always grep `messages.ts` before referencing any key. **WHY:** CMS-specific key structure; no way to infer from convention.

- **`admin.tsx` (no underscore) for `/admin/*` routes** — Underscore prefix (`_admin.tsx`) creates a pathless layout (no URL segment). Use `admin.tsx` which adds `/admin/` segment. **WHY:** TanStack routing convention; CMS decision to use segment-based layout is project-specific.

- **Supabase mock arrays: count ALL `.from()` calls in neverthrow pipeline** — Each `.from()` invocation consumes one mock array entry. Mismatch between mock count and actual call count causes silent false-positive tests.

- **Cross-reference to skills for TanStack patterns** — Don't duplicate generic TanStack patterns here. Use: `tanstack-setup` (vite config), `tanstack-routing` (route conventions), `tanstack-server` (createServerFn, middleware). **WHY:** Skills are the source of truth for framework patterns.

- **All `createServerFn` must use `{ method: 'POST' }`** — Default GET serializes data in URL params causing 431 on large payloads. Apply to ALL server fns. **WHY:** Prevents subtle size-dependent failures.

- **`@tiptap/html` requires `happy-dom` for Vite SSR** — Without it, any route importing `generateHTML` crashes with 500 on SSR. Root cause invisible — error happens before handler.

- **Server fn returning null → undefined in TanStack Query** — null serializes as undefined through TanStack Start RPC, triggering "Query data cannot be undefined". Fix: return empty object or wrap in Result.

- **`createServerFn` returns undefined on 500, doesn't throw** — TanStack Start RPC doesn't propagate server errors. Always null-check server fn results before accessing properties.

- **`useState` with async `prefetchQuery` = empty on first render** — `prefetchQuery` is non-blocking. `useState` initializer reads cache synchronously and gets `undefined`. Fix: use `useSuspenseQuery` or `useQuery` directly.

- **generatePresignedUrlFn had no auth check** — Server functions for S3 presigned URLs must include `requireAuthContext()` check. **WHY:** Without it, unauthenticated requests can generate upload URLs.

- **Tiptap `useEditor` ignores content prop changes** — Only reads `content` on creation. Fix: `useEffect` with `editor.commands.setContent()` when RHF `reset()` updates content.

- **JSON.stringify(content) before server fn breaks Zod validation** — If component stringifies Tiptap JSON before passing to server fn, but Zod expects object, validation fails silently. Pass objects as-is.

- **TanStack Router flat file dots = parent-child nesting** — `survey.$token.success.tsx` is a CHILD of `survey.$token.tsx`. Child renders inside parent's `<Outlet />`. Fix: split into layout + index.

- **`npm install` after removing deps can downgrade unrelated packages** — Removing `next` and running `npm install` changed lockfile and downgraded TanStack Start. Fix: `rm -rf node_modules` + `npm ci` with lockfile from git.

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
   touch features/new-feature/{server,queries,types}.ts
   ```

2. **Add route:**
   ```bash
   mkdir -p app/routes/admin/new-feature
   touch app/routes/admin/new-feature/index.tsx
   ```

3. **Create server function** in `features/new-feature/server.ts`:
   ```typescript
   import { createServerFn } from '@tanstack/start'
   import { requireAuthContext } from '@/lib/server-auth'

   export const getItemsFn = createServerFn({ method: 'POST' })
     .handler(async () => {
       return requireAuthContext()
         .andThen(({ supabase, tenantId }) => /* query */)
         .match(data => data, error => { throw new Error(error) })
     })
   ```

4. **Create route** in `app/routes/admin/new-feature/index.tsx`:
   ```typescript
   import { createFileRoute } from '@tanstack/react-router'
   import { NewFeatureList } from '@/features/new-feature/components/NewFeatureList'
   export const Route = createFileRoute('/admin/new-feature/')({
     component: NewFeatureList,
   })
   ```

**All server logic uses `createServerFn({ method: 'POST' })`** in `features/{name}/server.ts`. API routes (`app/routes/api/`) only for external webhooks (OAuth callbacks, n8n triggers).

## UI Design Patterns

**Save behavior by impact level:**
- **High-impact changes** (workflow editor, survey builder, landing page editor) → explicit Save/Publish button. Accidental changes can break live features.
- **Low-impact fields** (internal notes, Kanban reorder) → autosave with debounce (1s) + status indicator (saving/saved/error).

**Rich interactive UIs preferred:** When feature complexity warrants it, use professional interactive libraries (reactflow for workflow builder, @dnd-kit for Kanban) over simple form-based config. User values perceived professionalism of UI.

**Editor layout:** All editors (blog, shop, landing, survey, email) use `max-w-[1400px] mx-auto` centered grid. Prose-heavy editors (blog, shop product, legal pages) cap the editor column at `max-w-4xl` (896px) so authors see the same line breaks that render publicly. Sidebar 420px.

**CollapsibleCard:** Sidebar cards use `CollapsibleCard` from `@agency/ui`. SEO defaults closed, Settings/Images default open. Independent collapsible (multiple open simultaneously), NOT accordion.

**Cover image:** Always via InsertMediaModal (Media Library picker), never file upload input. InsertMediaModal lives in `features/media/components/`.

**Inline editing over Dialog:** Simple CRUD entities (categories) use inline row editing, not Dialog popups. Dialog is for complex multi-field forms only.

**Combobox with inline create:** Entity selectors (category dropdown) use Popover+Command combobox with search + "+ Nowa kategoria" inline creation. User doesn't need to leave current editor.

**View persistence:** List/grid view toggles persist to localStorage to survive navigation.

**No EmptyState on fixed-option pages:** Pages that always show all N options regardless of state (marketplace connections, calendar settings, email config) should NOT use EmptyState. Card grids with connected/not-connected states already communicate state visually. **Why:** EmptyState is for dynamic lists where empty = nothing to show. Fixed-option pages always render all options — adding EmptyState on top is redundant noise.

## Development

```bash
# Start CMS
npm run dev          # Vite dev server on port 3001
# Visit: http://localhost:3001

# Build CMS
npm run build        # Vite build (outputs .output/ via nitro)

# Run tests
npm run test --workspace=apps/cms        # Single run
npm run test:watch --workspace=apps/cms  # Watch mode (TDD)

# Test locally
# 1. Create user in Supabase
# 2. Run seed_first_user.sql
# 3. Login at http://localhost:3001/login
```

### React Compiler

React Compiler enabled via `babel-plugin-react-compiler` in `vite.config.ts`.

**Impact:** Auto-memoizes — remove manual `useCallback`/`useMemo` when touching files (Boy Scout Rule). Don't wrap new handlers in `useCallback` by default. Only add manual memoization if profiling shows need.

## Testing (TDD)

**Testable files** (TDD Red-Green-Refactor): `server.ts`, `queries.ts`, `hooks/*.ts`, `utils/*.ts`
**Not tested**: `components/`, `validation.ts` (Zod declarative), `types.ts`
**Test location**: `features/{name}/__tests__/{file}.test.ts`
**Style**: Integration — mock Supabase client, test server fn / query behavior.

**vitest.setup.ts mocks:** `@tanstack/react-router` (useNavigate, useSearch, useLocation, Link) + Supabase browser client. No Next.js mocks needed.

## Deployment

Auto-deploys to Vercel on push to `main`:
- URL: https://agency-cms.vercel.app
- Build Command: `npx turbo run build --filter=@agency/cms`
- Output: `.output/` (Vercel serverless via `nitro()` vite plugin)
- `nitro()` in vite.config.ts is **required** for Vercel deployment — without it, Vercel can't generate serverless functions and all SSR routes 404.

## Environment Variables

Required in Vercel Dashboard:
- `VITE_SUPABASE_URL` (client-side, exposed to browser via `import.meta.env`)
- `VITE_SUPABASE_ANON_KEY` (client-side, exposed to browser)
- `SUPABASE_SERVICE_ROLE_KEY` (server only — `process.env.*` inside createServerFn)
- `N8N_WEBHOOK_URL` (server only — survey analysis webhook)
- `N8N_WORKFLOW_ORCHESTRATOR_URL` (server only — n8n Orchestrator webhook)
- `ORCHESTRATOR_WEBHOOK_SECRET` (server only — Bearer token for CMS -> n8n auth)
- `HOST_URL` (server only)

See `.env.local.example` for full list.

## Related Files

- `app/routes/__root.tsx` - Root layout + auth beforeLoad
- `app/routes/admin.tsx` - Admin layout with QueryClientProvider + auth guard
- `app/globals.css` - shadcn/ui theme with CSS variables
- `vite.config.ts` - Vite 8 + TanStack Start + nitro config
