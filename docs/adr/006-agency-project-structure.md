# ADR-006: Agency Project Structure and Architecture Patterns

**Status:** Accepted (revised)
**Original Date:** 2025-12-05
**Last Revision:** 2026-05-15 — TanStack Start migration, 4-app monorepo, embeds former ADR-005 (app vs features) and supersedes ARCHIVED-001 (monorepo).
**Context:** Halo Efekt — multi-tenant business automation platform (Turborepo monorepo)
**Deciders:** Marcin Jucha

---

## Why this ADR was revised

Two architectural shifts since the original (Dec 2025) made large parts of the document misleading rather than wrong:

1. **Framework migration (2026-04-15):** Next.js → **TanStack Start v1.167 + Vite 8**. Eliminated Server Actions, Server Components, Next.js middleware, `next.config.ts`, `transpilePackages`. Replaced by `createServerFn`, server routes (`server.handlers`), `createMiddleware`, isomorphic execution model.
2. **Monorepo growth:** 2 apps → **4 apps** (CMS + Website + 2 shop frontends), 3 packages → **5 packages** (+ email, calendar).

The decisions about *boundaries* (PUBLIC vs ADMIN, app/ vs features/, RLS-first, type-safe DB, shared packages) all survived. The decisions about *Next.js-specific mechanics* did not. This revision keeps the former and rewrites the latter.

ADR-005 (app vs features) is folded into Section 2 below. ADR-001 (Turborepo) is folded into Section 1. ADR-007 (n8n standalone "Survey Analysis" workflow) is superseded by [ADR-008: Workflow Engine](./008-workflow-engine-architecture.md).

---

## Context and Problem Statement

Halo Efekt needs an architecture that supports:

- Multi-tenant SaaS (currently single tenant: Halo Efekt, but tenant model designed for >1 since day one)
- Multiple user-facing frontends sharing one backend (admin CMS + marketing website + per-client shop frontends)
- Shared business logic, types, and UI components across apps
- Solo → small-team developer scaling (1 → 2–3 developers)
- Background AI/automation processing without blocking user requests
- Type safety end-to-end (DB schema → server function → React component)

---

## Decision Outcome

**Turborepo monorepo, multiple TanStack Start applications, shared packages, Supabase as the single source of truth for cross-app data.**

### Current shape (2026-05-15)

```
legal-mind/
├── apps/
│   ├── cms/                # ADMIN: management panel (auth required)
│   ├── website/            # PUBLIC: marketing + survey/booking forms
│   └── shop/
│       ├── jacek/          # PUBLIC: per-client shop frontend
│       └── oleg/           # PUBLIC: per-client shop frontend
│
├── packages/
│   ├── ui/                 # shadcn/ui primitives, shared components, Tiptap editor
│   ├── database/           # Supabase types (auto-generated) + tenant helpers
│   ├── validators/         # Zod schemas shared across apps + n8n
│   ├── email/              # Email block editor model + EmailRenderer (HTML compile)
│   └── calendar/           # Google Calendar OAuth + booking helpers
│
├── supabase/               # Migrations, RLS policies (single DB for all apps)
├── n8n-workflows/          # Workflow JSONs (workflow engine + step handlers)
└── infra/n8n-vps/          # VPS infrastructure (symlink)
```

**Apps communicate via Supabase only — never direct HTTP between apps.** CMS reads/writes via authenticated client; public apps via anonymous client; n8n via service role.

---

## Architecture Patterns

### 1. Monorepo: Turborepo + pnpm workspaces

**Why Turborepo:** task pipeline caching, `dependsOn: ["^build"]` for package→app ordering, per-app filtering (`turbo run dev --filter=@agency/cms`). pnpm workspaces handle package linking with strict isolation.

**Key configuration:**

```jsonc
// turbo.json
{
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".output/**", "dist/**"] }
  }
}
```

**Rules:**

- Package name: `@agency/{name}` (scoped, private)
- App name: `@agency/{app-name}` (e.g. `@agency/cms`, `@agency/shop-jacek`)
- Main entry of packages: `./src/index.ts` (source, not dist) — TanStack Start consumes TS directly
- Version of internal deps: `*` or `workspace:*` (monorepo link)

### 2. Application separation: by authentication boundary

**Principle:** Separate apps by *who can access them*, not by feature.

| App | Audience | Auth | Routing example |
|---|---|---|---|
| `apps/cms/` | Admin staff | Required (middleware) | `/admin/surveys`, `/admin/calendar`, `/admin/email-templates` |
| `apps/website/` | Public visitors | None | `/`, `/survey/[token]`, `/o-nas` |
| `apps/shop/jacek/` | Public visitors | None | Per-client product catalog |
| `apps/shop/oleg/` | Public visitors | None | Per-client product catalog |

**Rationale:**

- Survey forms are public (sent via email) → live with website
- Admin features need auth + caching → CMS with TanStack Query + middleware
- Per-client shops have distinct branding/domains → separate apps, shared shop features in `apps/cms/features/shop-*/`

**When to add a new app:** new audience boundary (e.g. mobile, public API). When *not* to add: new feature for an existing audience — extend existing app's `features/`.

### 3. App/features separation (formerly ADR-005)

**Principle:** Routing lives in `app/`; business logic lives in `features/`.

**Forbidden imports:**

- ❌ `features/X` → `app/...` (features must not depend on routes)
- ❌ `packages/*` → `apps/*` (packages must not depend on apps)
- ❌ `lib/` → `features/...` (lib is for cross-feature utilities; feature-specific helpers stay in the feature)

**Allowed imports:**

- ✅ `app/...` → `features/X`
- ✅ `features/X` → `features/Y` (cross-feature is fine; create shared module if it grows)
- ✅ `app/`, `features/`, `lib/` → `@agency/*` packages
- ✅ `features/X` → `lib/` (utilities), `@/components/...` (shared UI primitives)

**Folder template (inside each app):**

```
apps/{app-name}/
├── app/                    # ROUTING ONLY — thin route files, <20 lines ideal
│   ├── __root.tsx          # TanStack Start root layout
│   ├── index.tsx           # / route
│   ├── admin/              # nested routes
│   └── api/                # server routes (server.handlers)
│
├── features/               # BUSINESS LOGIC
│   └── {feature}/
│       ├── components/     # Feature-specific React components
│       ├── server.ts       # createServerFn handlers (server-only)
│       ├── handlers.server.ts  # Implementations marked .server.ts (stripped on client)
│       ├── queries.ts      # Supabase reads (callable from RSC-like contexts)
│       ├── validation.ts   # Zod schemas (often re-exported from @agency/validators)
│       └── types.ts        # TypeScript types
│
├── components/             # SHARED UI (layout, providers)
└── lib/                    # CROSS-FEATURE UTILITIES (supabase clients, helpers)
```

**Naming convention:**

- Server-only code → `*.server.ts` suffix (TanStack Start strips per-import-statement, see Section 5)
- `queries.ts` for read functions; `server.ts` for `createServerFn` handlers
- `validation.ts` (singular) — Zod schemas; legacy code uses `validations.ts`, new code uses singular

### 4. Shared packages

**Principle:** Share via packages when (a) used in 2+ apps, (b) has a clear API boundary, (c) changes infrequently.

| Package | Purpose | Consumers |
|---|---|---|
| `@agency/ui` | shadcn/ui primitives, shared components (Tiptap editor, NodeViews, design tokens) | All apps |
| `@agency/database` | Supabase generated types, tenant helpers, type guards | All apps + n8n |
| `@agency/validators` | Zod schemas for surveys, bookings, workflows | All apps + n8n |
| `@agency/email` | Block-based email model, `EmailRenderer`, `BLOCK_REGISTRY` | CMS (editor) + n8n (renderer) |
| `@agency/calendar` | Google Calendar OAuth + booking helpers | CMS + Website |

**Anti-pattern:**

- ❌ `@agency/utils` (too generic — leads to dumping ground)
- ❌ `@agency/cms-shared` (app-specific — keep inside `apps/cms/features/`)

### 5. TanStack Start server/client boundary

**Principle:** Server-only code MUST sit behind a `.server.ts` import that the bundler strips on the client.

**Critical mechanics:**

- TanStack Start strips `.server.ts` imports **per import statement, not transitively**. A barrel re-export from `.server.ts` defeats stripping.
- 5+ named imports from a single `*.server.ts` file + runtime re-exports → use **dynamic `await import('./handlers.server')`** inside the `createServerFn` handler lambda, with async wrapper functions for runtime re-exports. Type-only re-exports stay top-level.
- Cross-feature `from '@/features/Y/server'` imports propagate transitively — if feature X crashes with `node:async_hooks` on client, also check feature X's components importing Y.

**Decision tree for new feature `server.ts`:**

| Situation | Pattern |
|---|---|
| Direct leaf, 1–4 imports from `.server.ts` | Top-level import OK |
| 5+ named imports from `.server.ts` barrel | Dynamic `await import(...)` inside handler lambda |
| `export { x } from 'foo.server'` (runtime re-export) | Async wrapper function |
| Type-only re-export | Top-level OK |

**Server function pattern:**

```typescript
// features/email/server.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const updateTemplate = createServerFn({ method: 'POST' })
  .validator(templateSchema)
  .handler(async ({ data }) => {
    // Server-only — dynamic import keeps client bundle clean
    const { saveTemplate } = await import('./handlers.server')
    return saveTemplate(data)
  })
```

**Server routes (webhooks, public APIs):**

```typescript
// app/api/webhooks/n8n.ts
import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/api/webhooks/n8n').methods({
  POST: async ({ request }) => { /* ... */ },
})
```

**Reference:** `tanstack-server` skill has the full pattern catalog.

### 6. State management

**Principle:** Right tool for the job. No one-size-fits-all store.

| State type | Tool | Where |
|---|---|---|
| Server data (cache, refetch, optimistic) | TanStack Query | **CMS only** (public apps avoid query caches) |
| Form state | React Hook Form + Zod resolver | All apps |
| Complex client UI state | `useState` / Zustand if shared across many components | CMS (Workflow Builder, Email Block Editor) |
| URL state (filters, pagination, panel open) | TanStack Router search params (`useSearch`, `useNavigate`) | All apps |
| Theme, i18n | React Context | All apps |

**Hard rule:** TanStack Query lives in CMS only. Public apps (website, shop) use server-loaded data via TanStack Router loaders and React Hook Form for submission. Putting a query cache in a public app inflates the client bundle for one-shot pages.

**URL writes for transient panel state must use `replace: true`** — `push` pollutes history (e.g. `?execution=<id>` updates on row click should replace, not push).

**React Compiler enabled (all apps):** `babel-plugin-react-compiler` in each app's `vite.config.ts`. Auto-memoizes — **don't** add `useCallback`/`useMemo` to new code. Boy Scout Rule: remove manual memoization when touching files. The cleanup must be **whole-file**, not partial (partial removal creates inconsistency).

### 7. Database access

**Principle:** RLS first. Service role only when intentional.

| Client | When | Where |
|---|---|---|
| Browser anon (`createBrowserClient`) | Public reads (RLS enforced) | Public apps, CMS client components |
| Server anon (`createServerClient`) | Authenticated reads (RLS sees `auth.uid()`) | CMS server functions/routes |
| Service role | Background jobs, cross-tenant ops, super admin | n8n, CMS admin-only flows |

**Type safety:** All clients typed with `Database` from `@agency/database`. Types auto-generated via `pnpm db:types` (regenerates `packages/database/src/types.ts` from local Supabase).

**Query organization:** Encapsulate inside `features/{feature}/queries.ts` (reads) and `features/{feature}/server.ts` (writes via `createServerFn`). Never inline Supabase in components.

**Multi-tenant RLS pattern:** every tenant-owned table has `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` + policy `USING (tenant_id = current_user_tenant_id())`. The `current_user_tenant_id()` SQL function is the canonical guard — never write `tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())` directly because it triggers RLS infinite recursion.

**Global tables (cross-tenant):** super admin guard via `is_super_admin()` SQL function. Pattern in `ag-database-patterns` skill.

### 8. Type safety: generate, don't write

- **DB types:** `pnpm db:types` → `packages/database/src/types.ts` (Supabase CLI generates from live schema).
- **Validation:** Zod schemas in `@agency/validators` are the source of truth. Inferred types (`z.infer<typeof X>`) feed React Hook Form (`useForm<T>`) and `createServerFn().validator(X)`.
- **Domain types:** Derived from `as const` objects (RBAC `PermissionKey`, workflow step types). Validate at DB boundary with a validator function. Never pass plain `string` where a domain type exists.

### 9. Error handling: `neverthrow` + `remeda`

**Principle:** Functional error handling. New code uses `Result<T, E>`, not `try/catch`.

```typescript
import { ResultAsync, ok, err } from 'neverthrow'
import { pipe } from 'remeda'

const saveTemplate = (input: TemplateInput): ResultAsync<Template, DbError> =>
  validate(input)
    .asyncAndThen(insertRow)
    .map(toTemplate)
```

**Boundary rule:** wrap unsafe code (Supabase, fetch, `JSON.parse`) at the boundary with `ResultAsync.fromPromise` / `Result.fromThrowable`. Internal functions return `Result` directly. Final consumer (route handler, server function) does `.match({ ok: ..., err: ... })`.

**Boy Scout:** when touching a file with `try/catch`, migrate to `Result`. Don't proactively refactor untouched files.

### 10. Routing: TanStack Router file-based

- Route conventions: `__root.tsx`, `index.tsx`, `$param.tsx`, `[.ext].tsx` for raw extensions
- `createFileRoute(...).options({ loader, head, headers, validateSearch, loaderDeps })`
- ISR via `Cache-Control` headers + `staleTime` on TanStack Query (CMS)
- Images via `@unpic/react` (handles `<img>` sizing for Vite)
- 404 via `notFound()` + `notFoundComponent` on routes

**Reference:** `tanstack-routing` skill.

### 11. Middleware

**Principle:** TanStack Start middleware via `createMiddleware`. Global middleware registered in `start.ts`.

```typescript
// apps/cms/start.ts
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware], // every request
  functionMiddleware: [tenantMiddleware], // every createServerFn
}))
```

**Auth middleware:** redirects unauthenticated users to `/login`. Pattern: read Supabase session cookie, attach `user` + `tenant_id` to context, forward.

### 12. Background processing

See **[ADR-008: Workflow Engine](./008-workflow-engine-architecture.md)** for the current architecture.

Short summary: long-running operations (>2s), AI calls, scheduled jobs, retries, and any cross-step orchestration go through the **workflow engine** (n8n + step handlers). Fast CRUD (<2s) stays in `createServerFn` / server routes.

---

## What we don't do

- ❌ **Server Actions** — Next.js feature; we're on TanStack Start. Use `createServerFn`.
- ❌ **Server Components / RSC** — Same reason. Use server functions + client components.
- ❌ **Direct HTTP between apps** — CMS and website never call each other's APIs. Communication via Supabase rows or n8n webhooks only.
- ❌ **Redux** — too heavy. TanStack Query + Zustand + URL state cover the use cases.
- ❌ **`@agency/utils`** — generic dumping-ground packages. Utilities live in `lib/` of the consuming app or in a domain-specific package.
- ❌ **`useCallback`/`useMemo` in new code** — React Compiler memoizes automatically. Manual memo only when profiler proves a hot path needs it.
- ❌ **`fetch()` in n8n Code nodes** — sandbox blocks fetch/SDK. Use native `https` module.

---

## Quick Reference

```
┌─────────────────────────────────────────────────────┐
│  HALO EFEKT ARCHITECTURE CHEAT SHEET                │
├─────────────────────────────────────────────────────┤
│  APPS                                               │
│  ├─ cms/         → Admin (auth required)            │
│  ├─ website/     → Marketing + survey/booking       │
│  └─ shop/        → Per-client shop frontends        │
│                                                      │
│  PACKAGES                                           │
│  ├─ ui/          → shadcn/ui + shared components    │
│  ├─ database/    → Supabase types (auto-generated)  │
│  ├─ validators/  → Zod schemas (shared)             │
│  ├─ email/       → Block editor + EmailRenderer     │
│  └─ calendar/    → Google Calendar OAuth/booking    │
│                                                      │
│  FOLDER PATTERN (inside apps)                       │
│  ├─ app/         → Routes (thin, <20 lines)         │
│  ├─ features/    → Business logic                   │
│  │   ├─ server.ts          createServerFn handlers  │
│  │   ├─ handlers.server.ts server-stripped impl     │
│  │   ├─ queries.ts         Supabase reads           │
│  │   └─ validation.ts      Zod                      │
│  ├─ components/  → Shared UI                        │
│  └─ lib/         → Cross-feature utils              │
│                                                      │
│  STATE                                              │
│  ├─ Server      → TanStack Query (CMS only)         │
│  ├─ Forms       → React Hook Form + Zod             │
│  ├─ URL         → TanStack Router search params     │
│  └─ Client UI   → useState / Zustand if shared      │
│                                                      │
│  DB ACCESS                                          │
│  ├─ Anon        → Browser/Server (RLS enforced)     │
│  ├─ Service role → n8n, super admin flows           │
│  └─ Types       → pnpm db:types                     │
│                                                      │
│  ERRORS                                             │
│  ├─ Boundary    → ResultAsync.fromPromise           │
│  ├─ Internal    → Result<T, E>                      │
│  └─ Consumer    → .match({ ok, err })               │
│                                                      │
│  IMPORTS                                            │
│  ├─ Same app    → @/features/...                    │
│  └─ Packages    → @agency/...                       │
└─────────────────────────────────────────────────────┘
```

---

## Consequences

### Positive

- ✅ Clear PUBLIC vs ADMIN boundaries; per-client shop split without app duplication for shared CMS features
- ✅ Type safety end-to-end (DB → server function → form → component)
- ✅ Code reuse via 5 shared packages; n8n consumes same Zod schemas as the apps
- ✅ Independent deployments per app (Vercel projects)
- ✅ React Compiler removes manual memoization burden

### Negative

- ⚠️ TanStack Start `.server.ts` strip is fragile (per-statement, not transitive) — barrel imports and runtime re-exports must use dynamic import workaround
- ⚠️ Cross-worktree Supabase CLI quirks (container name keyed off main checkout dir) — see `memory.md` "Worktree Gotchas"
- ⚠️ 4 apps × per-env config = more places to keep `.env.local` in sync (gitignored, must symlink from main into worktrees)

### Neutral

- ⚖️ Single Supabase DB across all apps — strong tenant isolation via RLS, but no per-app DB independence
- ⚖️ Shared `node_modules` (pnpm + Turborepo) between main checkout and worktrees — lockfile changes affect both

---

## Migration history

- **2025-12-05** — Original ADR-006: Next.js, 2 apps, 3 packages, Server Actions
- **2026-02-06** — Renamed project halo-efekt → agency (internal); kept "Halo Efekt" as product name
- **2026-04-15** — Migrated apps/shop/jacek + apps/shop/oleg to TanStack Start + Vite 8; later CMS + website followed
- **2026-04-27** — Standalone "Survey Response AI Analysis" n8n workflow replaced by workflow engine (`ai_action` step). See [ADR-008](./008-workflow-engine-architecture.md).
- **2026-05-15** — This revision: rewritten under TanStack Start, ADR-005 + ADR-001 folded in, ADR-007 superseded.

---

## Related ADRs

- [ADR-008: Workflow Engine Architecture](./008-workflow-engine-architecture.md) — n8n Orchestrator + step handlers, replaces the standalone AI workflow from former ADR-007

## Related skills (canonical for day-to-day decisions)

- `ag-architecture` — monorepo + import rules + N8n vs server route decision tree
- `ag-database-patterns` — RLS, client selection, tenant helpers
- `ag-coding-practices` — neverthrow/remeda, earned abstractions, SOLID by actor
- `tanstack-server` — `createServerFn`, `.server.ts` strip rules, middleware
- `tanstack-routing` — file-based routing, search params, loaders
- `tanstack-setup` — vite.config.ts, entry points, fonts

---

**Last Updated:** 2026-05-15
**Next Review:** When 5th app added, or when TanStack Start v2 migration is on the roadmap.
