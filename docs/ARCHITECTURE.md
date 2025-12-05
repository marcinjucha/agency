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
