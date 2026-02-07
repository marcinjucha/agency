---
name: architecture-decisions
description: Architecture decisions for AI Agency monorepo. Use when understanding project structure, app separation, or cross-cutting concerns.
---

# Architecture Decisions

## Purpose

Key architectural decisions and patterns for AI Agency monorepo.

---

## 2 Apps Architecture

**apps/website** - Public (no auth required)
- Landing page, pricing, marketing
- Client survey forms (`/survey/[token]`)
- Calendar booking

**apps/cms** - Admin (auth required)
- Login, dashboard
- Survey builder
- Response management
- Calendar management

**Why separate apps:**
- Independent deployments (CMS change doesn't rebuild website)
- Different security requirements
- Different performance characteristics
- Ready for subdomain split (`app.agency.com`)

---

## 3 Shared Packages

| Package | Purpose | Impact |
|---------|---------|--------|
| `@agency/ui` | shadcn/ui components | UI changes affect both apps |
| `@agency/database` | Supabase types | Schema change → `npm run db:types` → both apps |
| `@agency/validators` | Zod schemas | Validation changes affect both apps |

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

See: [@resources/app-features-separation.md](./resources/app-features-separation.md) for full ADR-005.

---

## ADR-005 Quick Reference

**Rule:** `app/` = routing only, `features/` = business logic.

```
apps/cms/
├── app/admin/surveys/
│   └── page.tsx              # 10 lines - just imports component
│
└── features/surveys/
    ├── components/
    │   └── SurveyList.tsx    # 80 lines - component logic
    ├── actions.ts            # Server Actions
    ├── queries.ts            # Data fetching
    └── types.ts              # TypeScript types
```

**Route Page Pattern:**
```typescript
// apps/cms/app/admin/surveys/page.tsx
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

## CMS ↔ Website Communication

**No direct API calls** - Communication through Supabase only.

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

## Background Processing: N8n vs Next.js API Routes

**Decision:** Use n8n for survey AI analysis (not Next.js API route).

**Why n8n:**
- AI takes 5-8s → Vercel timeout risk (10s hobby, 60s pro)
- User needs instant confirmation → fire-and-forget pattern
- Retry logic built-in → handles network failures
- Visual debugging → execution history + node outputs
- Separate deployment → n8n crashes don't affect website

**Why NOT Next.js API route:**
- Blocks user request for 5-8s (bad UX)
- No built-in retry (manual implementation)
- Vercel function duration cost (per-second billing)

**Pattern:**
```
Website API (200ms response)
  ↓ fire-and-forget webhook
N8n Workflow (5-8s background)
  ↓ Claude API → Supabase
CMS reads ai_qualification
```

**When to use n8n:**
- ✅ AI processing (>2s execution)
- ✅ External APIs with retry needed
- ✅ Background jobs (email, scheduled tasks)

**When to use Next.js API route:**
- ✅ Fast operations (<1s)
- ✅ Immediate response needed
- ✅ Simple CRUD with Supabase

---

See: [@resources/monorepo-structure.md](./resources/monorepo-structure.md) for full ADR-001.
