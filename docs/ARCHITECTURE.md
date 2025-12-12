# Legal-Mind Architecture

> **Status:** Approved
> **Last Updated:** 2025-01-22
> **Architecture:** Full Turborepo with 2 Next.js Applications

---

## Executive Summary

Legal-Mind is a SaaS platform for law firms that combines AI-powered client intake forms with automated calendar booking. The system uses a Turborepo monorepo structure with two separate Next.js applications and shared packages for maximum code reuse and independent deployments.

### Key Architectural Decisions

✅ **2 Next.js Applications**
- `apps/website` - Public landing page + client survey forms
- `apps/cms` - Admin panel for law firm management

✅ **3 Shared Packages**
- `@legal-mind/ui` - shadcn/ui component library
- `@legal-mind/database` - Supabase types and queries
- `@legal-mind/validators` - Zod validation schemas

✅ **Technology Stack**
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS
- **State Management:** TanStack Query (CMS only), React Hook Form
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Automation:** n8n for workflows + OpenAI for qualification
- **Calendar:** Google Calendar API
- **Deployment:** Vercel (2 separate projects)

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEGAL-MIND SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│   apps/website       │       │     apps/cms         │
│   (legalmind.pl)     │       │ (app.legalmind.pl)   │
├──────────────────────┤       ├──────────────────────┤
│ - Landing Page       │       │ - Login              │
│ - Pricing            │       │ - Dashboard          │
│ - About              │       │ - Survey Builder     │
│ - Survey Forms       │       │ - Responses List     │
│ - Calendar Booking   │       │ - Calendar Management│
└───────┬──────────────┘       └──────────┬───────────┘
        │                                  │
        └─────────────┬────────────────────┘
                      │
            ┌─────────▼──────────┐
            │  Shared Packages   │
            ├────────────────────┤
            │ @legal-mind/ui     │
            │ @legal-mind/database│
            │ @legal-mind/validators│
            └─────────┬──────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌───▼────┐   ┌───▼────┐
   │Supabase │   │  n8n   │   │Google  │
   │(Postgres│   │(Workflows)│ │Calendar│
   │  + Auth)│   │  + AI  │   │  API   │
   └─────────┘   └────────┘   └────────┘
```

---

## Project Structure

```
legal-mind/
├── turbo.json                      # Turborepo pipeline config
├── package.json                    # Root workspace
│
├── apps/
│   ├── website/                    # PUBLIC app (no auth required)
│   │   ├── app/
│   │   │   ├── (marketing)/       # Landing page routes
│   │   │   │   ├── page.tsx       # Homepage
│   │   │   │   ├── pricing/
│   │   │   │   └── o-nas/
│   │   │   │
│   │   │   └── survey/[token]/    # Client survey form
│   │   │       └── page.tsx       # Dynamic form + calendar
│   │   │
│   │   ├── features/
│   │   │   ├── marketing/         # Landing page components
│   │   │   └── survey/            # Survey form logic
│   │   │
│   │   └── components/
│   │       └── layout/            # Navbar, Footer
│   │
│   └── cms/                        # ADMIN app (auth required)
│       ├── app/
│       │   ├── login/             # Auth page
│       │   └── admin/             # Protected routes
│       │       ├── surveys/       # Create/manage surveys
│       │       ├── responses/     # View client responses
│       │       └── calendar/      # Manage availability
│       │
│       ├── features/              # ADR-005 pattern
│       │   ├── surveys/
│       │   ├── responses/
│       │   ├── calendar/
│       │   └── auth/
│       │
│       ├── middleware.ts          # Protect /admin routes
│       └── app/providers.tsx      # TanStack Query setup
│
├── packages/
│   ├── ui/                        # Shared shadcn/ui components
│   │   └── src/components/
│   │       ├── button.tsx
│   │       ├── form.tsx
│   │       └── calendar.tsx
│   │
│   ├── database/                  # Supabase types
│   │   └── src/
│   │       ├── types.ts           # Generated from DB
│   │       └── queries/
│   │
│   └── validators/                # Zod schemas
│       └── src/
│           ├── survey.ts
│           └── calendar.ts
│
├── supabase/
│   └── migrations/
│       └── 20250101000001_initial_schema.sql
│
└── docs/
    ├── ARCHITECTURE.md            # This file
    └── deployment.md
```

---

## Data Flow: Survey Submission

```
1. LAWYER (CMS)
   └─> Creates survey with questions
   └─> Generates unique link with token
   └─> Sends email to client

2. CLIENT (Website)
   └─> Clicks link: legalmind.pl/survey/{token}
   └─> Fills out form (validated with Zod)
   └─> Submits answers

3. n8n WORKFLOW
   └─> Receives webhook from Supabase
   └─> Sends answers to OpenAI
   └─> Gets qualification result
   └─> Updates Supabase response table

4. CLIENT (Website)
   └─> Sees available calendar slots
   └─> Selects date/time
   └─> Books appointment

5. SYSTEM
   └─> Creates Google Calendar event
   └─> Sends confirmation email to client
   └─> Sends notification to lawyer

6. LAWYER (CMS)
   └─> Sees new response in dashboard
   └─> Reviews AI qualification
   └─> Prepares for meeting
```

---

## Cross-Cutting Concerns & Dependencies

### Shared Packages

Both `apps/website` and `apps/cms` depend on 3 shared packages:

**@legal-mind/ui** - React components
- Imported from: `packages/ui/src/components/`
- Usage: Button, Card, Input, Form, Dialog, etc.
- Built with: shadcn/ui + Tailwind CSS
- Impact: UI changes affect BOTH apps

**@legal-mind/database** - Supabase types
- Location: `packages/database/src/types.ts`
- Auto-generated from: `npm run db:types` (reads live Supabase schema)
- Usage: `import type { Tables } from '@legal-mind/database'`
- Impact: Database schema change → regenerate types → affects BOTH apps
- When to update: After migrations with `npm run db:types`

**@legal-mind/validators** - Zod schemas
- Location: `packages/validators/src/`
- Used by: CMS (survey creation), Website (form submission)
- Impact: Adding new question type → update validators → affects BOTH apps

### Change Impact Map

**Database Schema Change**
```
1. supabase/migrations/YYYY_new_field.sql (write migration)
2. npm run db:types (regenerate types)
   ↓
3. packages/database/src/types.ts (auto-updated)
   ↓
4. apps/cms/features/surveys/actions.ts (must update to handle new field)
5. apps/cms/features/surveys/components/SurveyBuilder.tsx (add new field to UI)
   ↓
6. apps/website/features/survey/queries.ts (field now available in responses)
7. apps/website/features/survey/components/SurveyForm.tsx (render new field if needed)

Testing: CMS create → Website display (end-to-end)
```

**UI Component Change**
```
1. packages/ui/src/components/button.tsx (modify component)
   ↓
2. Rebuild: npm run build:ui
   ↓
3. apps/cms automatically gets update (depends on @legal-mind/ui)
4. apps/website automatically gets update (depends on @legal-mind/ui)

Both apps affected → test in both
```

**Question Type Addition**
```
1. packages/validators/src/survey.ts (add new type to schema)
   ↓
2. apps/cms/features/surveys/components/SurveyBuilder.tsx (add UI option)
3. apps/cms/features/surveys/ (update relevant actions/components)
   ↓
4. apps/website/features/survey/validation.ts (add validation for new type)
5. apps/website/features/survey/components/QuestionField.tsx (render new type)

Both apps affected → test CMS create → Website render
```

### CMS ↔ Website Communication

**No Direct API calls** - Communication happens ONLY through Supabase database

**Workflow:**
```
Phase 1: CMS (Lawyer)
├─ apps/cms/features/surveys/actions.ts → createSurvey()
├─ Inserts to surveys table (tenant_id = lawyer's tenant)
└─ Generates survey_links with unique token

Phase 2: Website (Client)
├─ apps/website/app/survey/[token]/page.tsx
├─ Reads survey via token using RLS policy (anon access allowed)
└─ apps/website/features/survey/queries.ts → getSurveyByToken()

Phase 3: Client Submission
├─ apps/website/features/survey/actions.ts → submitSurveyResponse()
├─ Inserts to responses table with tenant_id from surveys
├─ Calls increment_submission_count() database function
└─ n8n webhook triggered (on responses insert)

Phase 4: CMS (Lawyer) Reviews
├─ apps/cms/features/responses/queries.ts → getResponses()
├─ RLS policy filters: tenant_id = lawyer's tenant
└─ Only sees responses from their own tenant
```

**Database as Communication Layer:**
- All data sharing through Supabase tables
- RLS policies enforce access control:
  - `anon` role: Can read surveys (if active link exists), INSERT responses
  - `authenticated` role: Can read/write their tenant's data only
  - CMS middleware ensures only authenticated requests to admin routes
- No authentication token needed for client forms (uses anon key)

### Deployment Independence

**Each app deploys separately to Vercel:**
```
apps/website → legal-mind-website.vercel.app
(Vercel Project #1)

apps/cms → legal-mind-cms.vercel.app
(Vercel Project #2)

packages/* → shared code (auto-transpiled in both builds)
```

**Benefit:** Changes to CMS don't trigger website rebuild, and vice versa
**Trade-off:** Shared package updates require rebuilding both apps

---

## Database Schema

### Core Tables

**tenants** - Law firms
```sql
- id (uuid, primary key)
- name (text)
- email (text, unique)
- subscription_status (enum: trial, active, cancelled)
```

**users** - Lawyers within firms
```sql
- id (uuid, primary key)
- tenant_id (uuid → tenants.id)
- email (text, unique)
- full_name (text)
- role (enum: owner, admin, member)
- google_calendar_token (jsonb)
```

**surveys** - Survey templates
```sql
- id (uuid, primary key)
- tenant_id (uuid → tenants.id)
- created_by (uuid → users.id)
- title (text)
- questions (jsonb)
- status (enum: draft, active, archived)
```

**survey_links** - Unique client links
```sql
- id (uuid, primary key)
- survey_id (uuid → surveys.id)
- token (text, unique)
- client_email (text)
- max_submissions (int)
```

**responses** - Client submissions
```sql
- id (uuid, primary key)
- survey_link_id (uuid → survey_links.id)
- tenant_id (uuid → tenants.id)
- answers (jsonb)
- ai_qualification (jsonb)
- status (enum: new, qualified, disqualified)
```

**appointments** - Booked meetings
```sql
- id (uuid, primary key)
- response_id (uuid → responses.id)
- tenant_id (uuid → tenants.id)
- lawyer_id (uuid → users.id)
- client_name (text)
- start_time (timestamptz)
- end_time (timestamptz)
- google_calendar_event_id (text)
- status (enum: scheduled, completed, cancelled)
```

### Security: Row Level Security (RLS)

All tables use RLS policies to enforce multi-tenant isolation:
- Users can only access data from their own tenant
- Survey links are publicly accessible (for client forms)
- Auth handled by Supabase Auth

---

## Deployment Strategy

### Current (MVP)

**Single Domain:**
- `legalmind.pl` → Website app (marketing + surveys)
- Admin accessed at: `legalmind.pl/admin` (redirects to CMS)

**Infrastructure:**
- Vercel Project #1: `legal-mind-website`
  - Build Command: `turbo run build --filter=@legal-mind/website`
  - Root Directory: `apps/website`

- Vercel Project #2: `legal-mind-cms`
  - Build Command: `turbo run build --filter=@legal-mind/cms`
  - Root Directory: `apps/cms`

### Future (Scale)

**Multiple Subdomains:**
- `legalmind.pl` → Website app (marketing only)
- `app.legalmind.pl` → CMS app (admin panel)
- Survey forms remain on main domain: `legalmind.pl/survey/{token}`

**Migration:** Simply configure DNS in Vercel Dashboard - no code changes needed!

---

## Technology Decisions

### Why 2 Apps Instead of 1?

**Benefits:**
- ✅ Clear separation: PUBLIC vs ADMIN
- ✅ Independent deployments
- ✅ Different performance characteristics
- ✅ Different security requirements (auth only in CMS)
- ✅ Ready for subdomain split (future)

**Website App:**
- Optimized for public traffic (SEO, performance)
- No authentication required
- Static pages + dynamic survey forms

**CMS App:**
- Protected by middleware (all routes require auth)
- TanStack Query for data fetching
- Complex UI (form builder, dashboards)

### Why TanStack Query (only in CMS)?

**CMS Needs:**
- Frequent data fetching (surveys, responses, appointments)
- Cache management (reduce API calls)
- Optimistic updates (better UX)
- Background refetching (real-time feel)

**Website Doesn't Need:**
- Survey form = one-time submission (React Hook Form sufficient)
- Landing pages = static content (no data fetching)

### Why Shared Packages?

**@legal-mind/ui**
- Survey form components used in both apps:
  - CMS: Preview mode
  - Website: Actual client form
- Consistent design system

**@legal-mind/database**
- Single source of truth for DB types
- Generated from Supabase schema
- Used by both apps

**@legal-mind/validators**
- Survey validation logic shared:
  - CMS: Validates before saving
  - Website: Validates on submit
  - n8n: Validates in webhooks

---

## Development Workflow

### Local Development

```bash
# Start all apps
npm run dev

# Website: http://localhost:3000
# CMS: http://localhost:3001

# Start Supabase locally
supabase start

# Run n8n (Docker)
docker run -p 5678:5678 n8nio/n8n
```

### Building

```bash
# Build all apps (Turborepo caching)
npm run build

# Build specific app
turbo build --filter=@legal-mind/website
turbo build --filter=@legal-mind/cms
```

### Testing

```bash
# Run all tests
npm run test

# Lint
npm run lint
```

---

## Security Considerations

### Authentication
- Supabase Auth with email/password
- Google OAuth for lawyers (future: auto-sync calendar)
- JWT tokens in HTTP-only cookies

### Authorization
- RLS policies enforce tenant isolation
- Middleware protects all `/admin` routes
- API routes validate user's tenant_id

### Data Protection
- All Supabase queries filtered by tenant_id
- Survey tokens are UUID v4 (unpredictable)
- Environment variables for secrets (never committed)

---

## Scalability Considerations

### Current Capacity
- **Users:** 100-1000 law firms
- **Responses:** 10,000-100,000 per month
- **Appointments:** 5,000-10,000 per month

### Scaling Strategy

**Horizontal:**
- Vercel auto-scales (serverless)
- Supabase connection pooling

**Database:**
- Indexes on frequently queried fields
- JSONB for flexible survey data
- Partitioning by tenant_id (future)

**Caching:**
- TanStack Query (client-side)
- Vercel Edge Cache (static pages)
- Supabase PostgREST cache

---

## Monitoring & Observability

### Metrics to Track
- Survey completion rate
- Response time (API routes)
- Calendar booking success rate
- AI qualification accuracy

### Tools
- Vercel Analytics (built-in)
- Supabase Dashboard (DB metrics)
- Sentry (error tracking - future)
- PostHog (product analytics - future)

---

## Future Enhancements

### Phase 2 (Months 3-6)
- Mobile app (React Native)
  - Reuses `@legal-mind/ui`, `@legal-mind/database`, `@legal-mind/validators`
- Lex integration (Polish legal database)
- Advanced AI features (document parsing)

### Phase 3 (Months 6-12)
- White-label solution
- Multi-language support
- Lex integration (legal search)
- Advanced analytics dashboard

---

## ADR References

This architecture follows patterns established in:
- [ADR-001: Monorepo Structure](../adr/001-monorepo-structure.md) - Turborepo setup
- [ADR-005: App vs Features Separation](../adr/005-app-vs-features-separation.md) - Folder structure

---

## Getting Started

See the full implementation plan at:
`/Users/marcinjucha/.claude/plans/wise-growing-meadow.md`

**Next Steps:**
1. Initialize Turborepo structure
2. Create 2 Next.js apps
3. Setup shared packages
4. Initialize Supabase
5. Implement features (see plan for details)

---

**Questions?** Contact the team or refer to the detailed implementation plan.
