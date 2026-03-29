# apps/cms/ - CMS Admin Panel

Admin panel for service providers to manage surveys, responses, and appointments.

## Purpose

Authenticated application for service providers to:
- Create and manage client intake surveys
- View and analyze client responses
- Manage appointments and calendar
- Access dashboard analytics

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
│   │   ├── surveys/         # Survey management
│   │   ├── responses/       # Response viewing
│   │   ├── calendar/        # Calendar management
│   │   └── settings/        # Settings
│   │
│   └── api/                 # API Routes
│       ├── auth/            # Auth callbacks
│       ├── surveys/         # Survey CRUD
│       └── calendar/        # Google Calendar
│
├── features/                # BUSINESS LOGIC (ADR-005 pattern)
│   ├── surveys/
│   │   ├── components/      # SurveyList, SurveyBuilder
│   │   ├── actions.ts       # Server Actions (create, update, delete)
│   │   ├── queries.ts       # Data fetching (getSurveys, getSurvey)
│   │   ├── validations.ts   # Zod schemas (future)
│   │   └── types.ts         # TypeScript types (future)
│   │
│   ├── responses/           # Response management (TODO)
│   ├── calendar/            # Calendar integration (TODO)
│   └── auth/                # Auth helpers (TODO)
│
├── components/              # SHARED UI COMPONENTS
│   ├── admin/
│   │   └── Sidebar.tsx      # Sidebar navigation
│   ├── shared/              # Reusable components
│   └── providers/           # React Context (future)
│
├── lib/                     # UTILITIES
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts        # Server Supabase client
│   ├── google-calendar/     # Google Calendar API (TODO)
│   ├── n8n/                 # n8n webhooks (TODO)
│   └── utils/               # Helper functions
│
├── hooks/                   # Custom React hooks (future)
│
├── middleware.ts            # Route protection (redirects to /login)
├── next.config.ts           # Next.js configuration
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
/                        - Default Next.js page (TODO: redirect to /admin or /login)
/login                   - Login page (public)
/admin                   - Dashboard (protected)
/admin/surveys           - Survey list (protected)
/admin/surveys/new       - Create survey (protected)
/admin/surveys/[id]      - Edit survey (protected)
/admin/responses         - Response list (protected, TODO)
/admin/calendar          - Calendar (protected, TODO)
/admin/settings          - Settings (protected, TODO)
```

## Adding New Features

1. **Create feature folder:**
   ```bash
   mkdir -p features/new-feature/components
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

## Development

```bash
# Start CMS only
npm run dev:cms
# Visit: http://localhost:3001

# Build CMS only
npm run build:cms

# Test locally
# 1. Create user in Supabase
# 2. Run seed_first_user.sql
# 3. Login at http://localhost:3001/login
```

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
- `N8N_WEBHOOK_URL` (server only)
- `HOST_URL` (server only)

See `.env.local.example` for full list.

## Related Files

- `middleware.ts` - Route protection logic
- `app/providers.tsx` - TanStack Query setup
- `app/globals.css` - shadcn/ui theme with CSS variables
