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
├── features/                # BUSINESS LOGIC (ADR-006 §3 pattern)
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

## Folder Patterns (ADR-006 §3)

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

## Permissions & Authorization

**Through-line: in this codebase a permission key is never self-enforcing.** Three independent layers — the route map (`ROUTE_PERMISSION_MAP`), RLS, and the handler-level `hasPermission` check — each enforce separately, and each has been found silently open at least once. Adding a key, or granting it, does not by itself protect or unlock anything.

### Why granting a permission does not do what you think

- **`ROUTE_PERMISSION_MAP` only gates UI navigation (sidebar + `beforeLoad`); it does NOT protect `createServerFn` endpoints** (2026-07-11, theme CRUD shipped with the `design.themes` route mapping but no server gate → any authed tenant member could HTTP-invoke create/update/delete regardless of role; caught by security validation). HOW TO APPLY: a gated feature needs its OWN server-side check inside every `createServerFn` handler (`requireAuthContextFull()` + `hasPermission(key, permissions)`, mirror the venture `gated()` helper), independent of the route map. Adding the permission key to `ROUTE_PERMISSION_MAP` is not enough.

- **`users.role` coarse tier and granular RBAC permission keys are two INDEPENDENT authz axes — venture client create/delete gate on the COARSE column, NOT a permission key** (2026-07-14). `so_clients` INSERT/DELETE (handler `isUnscopedActor` + RLS) require `users.role ∈ (owner,admin)` OR `is_super_admin`, NOT the `venture.clients` key. The `users.role` column is written ONLY by the user editor's "Dostęp do klientów" toggle (`clientAccessToRole`: all→admin, selected→member) — NOT by the role's permission checkboxes. So a custom role with EVERY checkbox ticked but `users.role='member'` still gets "Brak uprawnień" on client create. Self-editing your own tier is blocked by the role-rank guard (SEC-3). HOW TO APPLY: to let someone create venture clients, set their user "Dostęp do klientów" = "Wszyscy klienci" (→ `users.role=admin`); granting permission keys is NOT enough. Scoped members (selected clients) still get full CRUD on ASSIGNED clients — only create/delete of the client ENTITY is unscoped-only.

- **RLS on `so_bonuses` is tenant/client-scoped, NEVER permission-scoped — the app-layer `hasPermission` gate is the ONLY one** (2026-08-25). Each `so_bonuses` handler gates on `PERM.bonuses` (`bonus_funnel.bonuses`) individually, so a handler that writes bonuses as a SIDE EFFECT of a campaign operation (the campaign duplicate) needs an EXPLICIT `hasPermission(PERM.bonuses, …)` check ALONGSIDE `gated(PERM.campaigns, …)` — otherwise a role holding `campaigns` but not `bonuses` creates bonuses through a side door. Make it UNCONDITIONAL, not "only when the source has bonuses": data-dependent authorization is harder to test and explain, and the parent `bonus_funnel` key satisfies both by prefix match anyway.

### Grantable CMS Permission Plumbing (making a `system.*` key real)

- **A `PermissionKey` can EXIST in PERMISSION_GROUPS yet be completely INERT — a key is not self-enforcing** (2026-07-11, docforge-licenses). `system.docforge_licenses` existed but only gated sidebar-link visibility; real access was enforced two layers below (RLS + handler `isSuperAdmin` checks) that never READ the key, so granting it did nothing. HOW TO APPLY: before assuming a permission key "works", grep whether any RLS policy / handler guard actually reads it — membership in PERMISSION_GROUPS ≠ enforcement.

- **RLS read-gate and code write-gate must admit the IDENTICAL user set — verify parity explicitly** (2026-07-11). Writes use the service client (RLS bypassed → handler `hasPermission` is the only gate); reads use the RLS-aware client (RLS policy is the only gate). Diverging logic → user can read but not write (or vice-versa). For RLS on GLOBAL tables (no tenant_id, e.g. `docforge_licenses`/`docforge_activations`), mirror `is_super_admin()` with a `current_user_has_permission(text)` SECURITY-DEFINER SQL helper (`LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public`): `is_super_admin() OR users.role IN ('owner','admin') OR EXISTS(user_roles→role_permissions matching key OR its parent group)`. Recursion-safe because DEFINER bypasses RLS on the queried tables and it's never used in a policy on its own source tables. CAVEAT: the SQL helper uses `split_part(key,'.',1)` → matches only a ONE-level parent; app-layer `hasPermission` uses `startsWith` (any ancestor). Identical only for ≤2-segment keys — keep keys shallow or the two gates diverge.

- **`PermissionPicker.tsx` HARDCODES which keys render under each display card — it does NOT auto-render every key from PERMISSION_GROUPS** (2026-07-11). A brand-new `system.*` key is INVISIBLE in the role editor until added to a card's `children` array, AND needs a label in `messages.ts` `permissions[key]` (else falls back to the raw key string). Static validators + build all PASS while the checkbox is simply absent — only caught by opening the role editor in the browser.

- **The SidebarV2 `menuGroups` group is INDEPENDENT of the permission-key namespace** (2026-07-11). A `system.*` key's nav item can sit under the "Management" sidebar group while the role editor lists it under "System" → inconsistent UX. Keep the sidebar group aligned with the key's namespace. Per-item nav visibility is gated by ROUTE_PERMISSION_MAP, NOT the group's `requiredPermissions` (that only gates whole-group visibility).

- **`seedDefaultRoles` grants EVERY ALL_PERMISSION_KEYS entry to each NEW tenant's Admin role — adding a key to PERMISSION_GROUPS auto-flows to new tenants; only EXISTING Admin roles need a backfill migration** (2026-07-11). Consequence under a cross-tenant (Branch A) design: every tenant admin auto-gets the key → cross-tenant visibility. Fine for single-operator Halo Efekt; revisit when a 2nd real tenant onboards.

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

- **Dangling `routes.*` constants pointing to non-existent routes silently 404** — When adding any `routes.*` constant, verify either (a) the corresponding route file exists at the named path OR (b) the constant is consumed by something other than `fetch()`. No compile-time error, no runtime crash on import — fails only when invoked. **WHY:** `/api/upload` route NEVER existed but `routes.api.upload` constant pointed at it for entire feature history (pre-T-110). Primary upload (MediaUploadZone) calls `generatePresignedUrlFn` directly, bypassing the broken indirection — so the dangling constant didn't crash, it just silently 404'd whenever something tried to use it.

- **`pages` stores the same content in TWO columns at once (`blocks` = Tiptap JSON, `html_body` = rendered HTML) — writing only one of them desyncs the record, and the panel overwrites `html_body` from the stale `blocks` on the first edit** — so legal/page content CANNOT be inserted by script, SQL, or REST; it has to go in through the logged-in panel, which re-renders both columns together. **WHY:** 2026-09-17, loading Kacper's regulamin + privacy policy — a direct HTML write looks correct in the public view until someone opens the record in the CMS, at which point the old `blocks` silently wins.

- **Markdown destined for the CMS editor must be written WITHOUT line wrapping, and WITHOUT tables** — one paragraph = one line, one list item = one line, blank line only between blocks; hard wraps survive the paste and show up as breaks inside the rendered paragraph. Tables are worse: `baseExtensions` in `features/editor/` is StarterKit + link, image, underline, text-align, highlight — **no table extension**, so a pasted markdown table falls apart. **WHY:** 2026-09-17 — the regulamin was wrapped at ~95 chars and the breaks landed in the published text; the privacy policy had two tables that had to be rewritten as lists BEFORE pasting. Applies to any document that ends in the WYSIWYG editor rather than in git.

- **`pages.title` is the operator's RECORD name, not a reader-facing heading — consumers must supply their own heading** — records named e.g. "Przystań Inwestorów Regulamin" doubled the brand on the public page, because the consuming route already appends it in `<title>` and rendered it again in `<h1>` right under the logo. Fix: hardcode the heading in the route (`const TITLE`), take only the body from the CMS. **WHY:** 2026-09-17. General rule for this seam: pull from the CMS what changes without a deploy (content), not panel metadata.

- **Public `pages` reads must use `limit(1)`, NOT `maybeSingle()`** — `pages` has `UNIQUE(tenant_id, slug)`, not a globally unique `slug`, and the public endpoints query WITHOUT a tenant (an external consumer doesn't know `TENANT_ID`). Two tenants sharing a slug therefore makes `maybeSingle()` throw and turns a correct result into a 500. **WHY:** 2026-09-17, `GET /api/venture/legal/:slug` (anon, read-only) built for the venture landing on the VPS. Slugs are brand-prefixed (`przystan-inwestorow-regulamin`) so a collision means a naming mistake, not genuine ambiguity worth a 500. The condition is the missing tenant filter — with a tenant in the query, `maybeSingle()` is still correct.

- **`createMediaProxyEditor` bridge enables `InsertMediaModal` reuse without a Tiptap `Editor` instance** — When an `Editor`-typed prop appears to block reuse of a media-related UI component, grep for `createMediaProxyEditor` (`apps/cms/lib/utils/media-proxy.ts`) BEFORE designing a parallel media picker. Reuse the bridge. **WHY:** `InsertMediaModal` was originally typed to require a real Tiptap `Editor` instance — but several CMS flows (cover image picker, block-editor media slot) needed the same modal without a live editor. The `createMediaProxyEditor` helper synthesises just enough of the `Editor` surface for the modal.

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

**⌘S / Ctrl+S keyboard shortcut — default on every explicit-save editor.** Any component with an explicit Save button (form-based or block-based) should also bind `⌘S`/`Ctrl+S` via `window.addEventListener('keydown', ...)` + `e.preventDefault()`, calling the same save handler as the button (never a `publishOverride` variant — the shortcut preserves current publish state, it doesn't toggle it). Pattern established in `WorkflowEditor.tsx` + `EmailTemplateEditor.tsx`; rolled out to campaign/blog/shop-product/landing/legal-page/survey editors (2026-07-09, user request — "wszędzie gdzie masz edycję/zapis"). New editors should include this from the start rather than as a follow-up.

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

**Run cms vitest from `apps/cms`, not the monorepo root** — the `@/` path alias lives in `apps/cms/vitest.config.ts`. Always `(cd apps/cms && npx vitest run features/<x>)`. **WHY:** a raw `npx vitest run features/<x>` from the repo ROOT fails to resolve `@/...` imports, so that test file silently FAILS TO LOAD while the run still reports the remaining tests as "passed" — the count silently drops (e.g. 70→49) and it looks like a regression that isn't one. (The `npm run test --workspace=apps/cms` script above is safe — the workspace flag runs vitest inside `apps/cms`; only raw root-level `npx vitest` is the trap.)

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
- `BEEHIIV_API_KEY` (server only — venture bonus funnel ESP; single global Bearer key, `features/venture/esp/beehiiv.server.ts`)
- (Tally lead-ingest webhook signature is verified with a PER-CAMPAIGN secret `so_campaigns.tally_webhook_secret` set in the CMS campaign editor — `POST /api/venture/leads/$slug`. No global `TALLY_WEBHOOK_SECRET` env var.)
- `RESEND_API_KEY` (server only — venture transactional bonus email; beehiiv free has no Automations, so CMS sends the bonus mail; added iter 3)
- `RESEND_FROM_EMAIL` (server only — verified sender address for the venture transactional bonus email; `features/venture/mail/resend.server.ts`; added iter 3)
- `VENTURE_LANDING_ORIGIN` (server only — CORS allowed origin echoed by the PUBLIC `GET /api/venture/campaigns/:slug` read endpoint; the venture landing lives on a different origin (VPS) than this CMS (Vercel). Optional — falls back to `*` when unset, acceptable because the payload is public non-credentialed metadata (brand + bonus links); added iter 4)

See `.env.local.example` for full list.

## Related Files

- `app/routes/__root.tsx` - Root layout + auth beforeLoad
- `app/routes/admin.tsx` - Admin layout with QueryClientProvider + auth guard
- `app/globals.css` - shadcn/ui theme with CSS variables
- `vite.config.ts` - Vite 8 + TanStack Start + nitro config
