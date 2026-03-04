---
name: architecture
description: Use when understanding monorepo structure, app/features separation (ADR-005), import rules, CMS↔Website communication, or deciding between N8n and Next.js API routes. Core architectural decisions for AI Agency project.
---

# Architecture

## 2 Apps

**apps/website** - Public (no auth)
- Landing page, pricing, marketing
- Client survey forms (`/survey/[token]`)
- Calendar booking

**apps/cms** - Admin (auth required)
- Login, dashboard, survey builder, response management, calendar management

**Why separate:** Independent deployments (CMS change doesn't rebuild website), different security requirements, ready for subdomain split (`app.agency.com`).

---

## 3 Shared Packages

| Package | Purpose | Impact |
|---------|---------|--------|
| `@agency/ui` | shadcn/ui components | UI changes affect both apps |
| `@agency/database` | Supabase types | Schema change → `npm run db:types` → both apps |
| `@agency/validators` | Zod schemas | Validation changes affect both apps |

**Shared Package Rule:** Create when used by 2+ apps NOW — not speculatively.

---

## Import Rules (ADR-005)

**Allowed:**
- `app/` → `features/` (routes import business logic)
- `features/` → `lib/`, `packages/`, other `features/`
- `lib/` → `packages/`

**Forbidden:**
- `features/` → `app/` (business logic can't depend on routes)
- `lib/` → `features/` (utilities can't depend on features)
- `packages/` → `apps/` (shared code can't depend on specific apps)

**Why:** Enforces layered architecture, enables code reuse, prevents circular dependencies.

See: `@resources/app-features-separation.md` for full ADR-005 with structure examples.

---

## CMS ↔ Website Communication

**No direct API calls** — communication through Supabase only.

```
Phase 1: CMS (Lawyer)
├─ Creates survey → surveys table
└─ Generates link → survey_links table

Phase 2: Website (Client)
├─ Reads survey via token (RLS: anon access)
└─ Submits response → responses table

Phase 3: CMS (Lawyer)
├─ Reads responses (RLS: tenant filter)
└─ Only sees own tenant's data
```

---

## N8n vs Next.js API Routes

**Use N8n for:** AI ops (>2s), external APIs needing retry, background jobs (email, scheduled tasks).
**Use Next.js API routes for:** Fast ops (<2s), immediate response needed, simple CRUD with Supabase.

**Why N8n for AI:** AI takes 5-8s → Vercel timeout risk (10s hobby, 60s pro). Fire-and-forget pattern gives user instant confirmation. Retry built-in, separate deployment (n8n crash doesn't affect website).

**Pattern:**
```
Website API (200ms response)
  ↓ fire-and-forget webhook
N8n Workflow (5-8s background)
  ↓ Claude API → Supabase
CMS reads ai_qualification
```

---

## Change Impact Map

| Change | Impact | Action |
|--------|--------|--------|
| Database schema | Both apps | `supabase/migrations/` → `npm run db:types` → verify both apps |
| UI component | Both apps | `packages/ui/` → test in both apps |
| Validator | Both apps | `packages/validators/` → update CMS + Website features |
| CMS feature | CMS only | `apps/cms/features/` → test CMS |
| Website feature | Website only | `apps/website/features/` → test Website |

---

## Resources

- `@resources/app-features-separation.md` - Full ADR-005 with directory structure, rules, and route page pattern
- `@resources/monorepo-structure.md` - Full monorepo structure (ADR-001), Turborepo config, deployment
