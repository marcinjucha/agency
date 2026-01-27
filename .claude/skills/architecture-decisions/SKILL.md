---
name: architecture-decisions
description: Architecture decisions for Legal-Mind monorepo. Use when understanding project structure, app separation, or cross-cutting concerns.
---

# Architecture Decisions

**Purpose:** Key architectural decisions and patterns for Legal-Mind monorepo.

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
- Ready for subdomain split (`app.legalmind.pl`)

---

## 3 Shared Packages

| Package | Purpose | Impact |
|---------|---------|--------|
| `@legal-mind/ui` | shadcn/ui components | UI changes affect both apps |
| `@legal-mind/database` | Supabase types | Schema change → `npm run db:types` → both apps |
| `@legal-mind/validators` | Zod schemas | Validation changes affect both apps |

---

## Import Rules

```
┌─────────────┐
│   app/      │  ← Routes (imports from features/)
├─────────────┤
│  features/  │  ← Business logic (imports from lib/ + packages/)
├─────────────┤
│   lib/      │  ← Utilities (imports from packages/)
├─────────────┤
│  packages/  │  ← Shared code (no app-specific imports)
└─────────────┘
```

**Allowed:**
- `app/` → `features/`
- `features/` → `lib/`, `packages/`, other `features/`
- `lib/` → `packages/`

**Forbidden:**
- `features/` → `app/`
- `lib/` → `features/`
- `packages/` → `apps/`

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

### Database Schema Change

```
1. supabase/migrations/YYYY_new_field.sql
2. npm run db:types
   ↓
3. packages/database/src/types.ts (auto-updated)
   ↓
4. apps/cms/ + apps/website/ (both affected)
```

### UI Component Change

```
1. packages/ui/src/components/button.tsx
   ↓
2. Both apps automatically get update
   ↓
3. Test in both apps
```

### New Question Type

```
1. packages/validators/src/survey.ts
   ↓
2. apps/cms/features/surveys/ (add UI)
   ↓
3. apps/website/features/survey/ (render)
   ↓
4. Test: CMS create → Website render
```

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

## Turborepo Commands

```bash
# Start all apps
npm run dev
# Website: http://localhost:3000
# CMS: http://localhost:3001

# Build specific app
turbo build --filter=@legal-mind/website
turbo build --filter=@legal-mind/cms

# Regenerate database types
npm run db:types
```

See: [@resources/monorepo-structure.md](./resources/monorepo-structure.md) for full ADR-001.
