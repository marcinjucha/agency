# Legal-Mind: Project Roadmap & Implementation Status

> **📌 NOTE FOR AI ASSISTANTS:**
>
> **This is the MAIN DOCUMENT for understanding this project.** Read this file first to get complete context about:
> - What we're building (Vision & Goals)
> - How it works (Architecture)
> - What's already done (Phase 1: ✅ Complete)
> - What needs to be built next (Phase 2-6 with checklists)
> - Current priorities (Next Steps section)
>
> **When helping with this project:**
> 1. Read this file to understand full context
> 2. Check "Current Status Summary" to see what's done
> 3. Look at "Next Steps" to understand priorities
> 4. Follow patterns in "Development Guidelines"
> 5. **UPDATE DOCUMENTATION:** After completing tasks:
>    - Change `[ ]` to `[x]` in this file (PROJECT_ROADMAP.md) for completed items
>    - Update "Current Status Summary" section with new progress percentages
>    - Update "Recent Milestones" section with what was accomplished
>    - Update "Last Updated" date at the top of this file
> 6. **COMMIT FREQUENTLY:** After each logical step (file created, feature working, bug fixed), create a git commit with a concise message (2-5 sentences max). Use conventional commit format: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
>
> **Other useful docs:**
> - `ARCHITECTURE.md` - Technical details and system design
> - `adr/006-legal-mind-project-structure.md` - Code organization patterns
> - `archive/IMPLEMENTATION_STATUS.md` - Historical progress log (archived)

> **Last Updated:** 2025-12-09
> **Current Phase:** Phase 1 Complete ✅ | Phase 2 Ready 📋
> **Progress:** 100% Phase 1 (17/17 tasks) | 0% Phase 2

---

## 🎯 Vision & Product Goals

### What We're Building

**Legal-Mind** is a SaaS platform for law firms in Poland that streamlines client intake through:

1. **Smart Intake Forms** - Lawyers create custom surveys and send unique links to clients
2. **Calendar Integration** - Clients can book appointments after filling forms
3. **AI Qualification** - Automatic analysis and qualification of client responses
4. **Multi-Tenant CMS** - Admin panel for law firms to manage surveys, responses, and appointments

### Key Features (MVP)

- ✅ **Custom Surveys** - Drag-drop builder with 7 question types
- ✅ **Survey Links** - Generate shareable links with tokens, expiration, submission limits
- 🚧 **Client Forms** - Dynamic form rendering from survey JSON
- 🚧 **Calendar Booking** - Google Calendar integration for appointment scheduling
- 📋 **Response Management** - View, qualify, and manage client responses
- 📋 **AI Analysis** - Automatic qualification and summarization (via n8n)
- 🔮 **Notifications** - Email/SMS confirmations
- 🔮 **Future: Lex Integration** - Legal case law search

### Target Users

- **Primary:** Small-medium law firms in Poland (1-10 lawyers)
- **Secondary:** Solo practitioners, legal consultants
- **Business Model:** SaaS subscription (multi-tenant architecture)

### Success Metrics

- Time to deploy: 10-12 weeks to production-ready MVP
- Cost: €50-150/month operational costs
- Architecture: Scalable to 100+ law firms on single instance

---

## 🏗️ Architecture Overview

### Tech Stack Decisions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Monorepo** | Turborepo 2.0 | Code sharing, independent deployments |
| **Frontend** | Next.js 16 + React 19 | App Router, Server Actions, SSR |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Component library, design system |
| **State Management** | TanStack Query v5 | Server state caching (CMS only) |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Database** | Supabase (PostgreSQL 17) | Multi-tenant RLS, Auth, Realtime |
| **Authentication** | Supabase Auth | Email/password, session management |
| **Calendar** | Google Calendar API | Free, popular in Poland |
| **Workflows** | n8n (self-hosted) | AI orchestration, webhooks |
| **AI** | OpenAI GPT-4 + Claude | Qualification, summarization |
| **Deployment** | Vercel (2 projects) | Zero-config, automatic deploys |

### Application Structure

```
legal-mind/
├── apps/
│   ├── website/         # PUBLIC app (port 3000)
│   │   └── Next.js 16   # Landing page + survey forms
│   │
│   └── cms/             # ADMIN app (port 3001)
│       └── Next.js 16   # Law firm management panel
│
├── packages/
│   ├── ui/              # Shared shadcn/ui components
│   ├── database/        # Supabase types (auto-generated)
│   └── validators/      # Zod schemas
│
└── supabase/
    └── migrations/      # Database schema
```

### Key Architectural Decisions

**ADR-001:** Monorepo Structure
- Rationale: Code reuse, shared types, independent deploys
- Pattern: Turborepo with npm workspaces

**ADR-005:** App vs Features Separation
- Rationale: Clean routing, testable business logic
- Pattern: `app/` for routing only, `features/` for logic

**ADR-006:** Component Organization
- Rationale: Feature-first structure, colocation
- Pattern: `features/{feature}/components/` not `components/shared/`

**Multi-Tenancy:** Row Level Security (RLS)
- Every table has `tenant_id` column
- Supabase RLS policies auto-filter by authenticated user's tenant
- JWT token contains `tenant_id` claim

### Data Flow

```
1. Lawyer (CMS) → Creates survey → Generates link with token
2. Client (Website) → Receives email → Opens link `/survey/{token}`
3. Client fills form → Submits → Saves to `responses` table
4. n8n webhook triggered → AI analyzes → Updates `ai_qualification`
5. Client sees calendar → Books appointment → Creates Google Calendar event
6. Lawyer (CMS) → Views response → Sees AI qualification → Manages lead
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              PRODUCTION STACK                    │
└─────────────────────────────────────────────────┘

Vercel (Frontend)                  Supabase Cloud (Database)
├─ legal-mind-website.vercel.app   ├─ PostgreSQL 17
│  (Website App)                   ├─ Auth
│                                  ├─ Row Level Security
└─ legal-mind-cms.vercel.app       └─ Realtime subscriptions
   (CMS App)
                   │
                   ├── Google Calendar API
                   │   (OAuth, events CRUD)
                   │
                   └── n8n (Hetzner VPS)
                       ├─ Workflow automation
                       ├─ AI orchestration (OpenAI + Claude)
                       └─ Email/SMS notifications
```

**Costs:**
- Vercel: $0 (Hobby tier, 2 projects)
- Supabase: $0 (Free tier: 500MB DB, 50K MAU)
- Hetzner VPS: ~€5-20/month (n8n self-hosted)
- AI Usage: ~€30-50/month (depending on volume)
- **Total: ~€50-100/month**

---

## 📅 Implementation Phases

### Phase 1: Foundation & CMS Core ✅ COMPLETE

**Timeline:** Weeks 1-3 (Completed Dec 9, 2025)
**Status:** ✅ 100% Complete

#### Infrastructure ✅
- [x] Turborepo monorepo initialized
- [x] Root package.json with workspaces
- [x] turbo.json pipeline configuration
- [x] TypeScript strict mode
- [x] Prettier code formatting
- [x] Git repository (23 commits)
- [x] Vercel deployment (2 projects)

#### Applications ✅
- [x] Website app (@legal-mind/website) - Next.js 16
- [x] CMS app (@legal-mind/cms) - Next.js 16 + TanStack Query
- [x] Both apps build successfully
- [x] Both apps deployed to Vercel
- [x] Environment variables configured
- [x] Tailwind CSS 4 + shadcn/ui theme system

#### Shared Packages ✅
- [x] @legal-mind/ui - shadcn/ui components (Button, Input, Label, Card)
- [x] @legal-mind/database - Supabase types (973 lines, auto-generated)
- [x] @legal-mind/validators - Zod schemas (survey validation)

#### Database ✅
- [x] Supabase Cloud project: zsrpdslhnuwmzewwoexr.supabase.co
- [x] 6 tables: tenants, users, surveys, survey_links, responses, appointments
- [x] Row Level Security (RLS) policies
- [x] Indexes for performance (10 total)
- [x] TypeScript types generated and synced
- [x] Migration: 20250105000001_initial_schema.sql

#### Authentication ✅
- [x] Supabase Auth integration (email/password)
- [x] Login page with shadcn/ui styling
- [x] Middleware protecting /admin routes
- [x] Session management with cookies
- [x] Logout functionality
- [x] Error handling with user feedback

#### CMS Features ✅
- [x] Admin layout with sidebar navigation
- [x] Dashboard with real-time stats (surveys, responses, appointments)
- [x] Survey List page (TanStack Query with caching)
- [x] Create Survey page (Server Actions)
- [x] Survey Builder (edit questions, 7 question types)
- [x] Question management (add, edit, delete)
- [x] Question types: text, textarea, email, tel, select, radio, checkbox
- [x] **Survey Link Generation** (Completed Dec 9, 2025)
  - Generate unique links with crypto.randomUUID() tokens
  - Optional client email, expiration date, max submissions
  - Copy to clipboard with visual feedback
  - Delete links with confirmation
  - List all links with metadata
  - Unlimited submissions by default (max_submissions: null)
  - Real-time updates via TanStack Query

**Key Files Created:**
- `apps/cms/features/surveys/actions.ts` - Server Actions (create, update, delete, generateLink)
- `apps/cms/features/surveys/queries.ts` - Data fetching (getSurveys, getSurveyLinks)
- `apps/cms/features/surveys/components/SurveyBuilder.tsx` - Main editor
- `apps/cms/features/surveys/components/SurveyList.tsx` - List view
- `apps/cms/features/surveys/components/SurveyLinks.tsx` - Link management (NEW)
- `apps/cms/components/admin/Sidebar.tsx` - Navigation
- `apps/cms/app/providers.tsx` - TanStack Query setup
- `apps/cms/middleware.ts` - Route protection

**Deliverables:**
✅ CMS app fully functional with survey management
✅ Lawyers can create surveys and generate shareable links
✅ Multi-tenant isolation working via RLS
✅ Deployed to production (Vercel)

---

### Phase 2: Client Survey Form 🚧 IN PROGRESS

**Timeline:** Week 4 (Current)
**Status:** 🚧 0% Complete (Next priority)

#### Website Survey Form
- [ ] Dynamic form rendering from survey JSON
  - Read survey by token from `survey_links` table
  - Render questions based on type (text, textarea, email, etc.)
  - Handle conditional fields (if needed)

- [ ] Form validation
  - Client-side validation with Zod
  - Required field checking
  - Type-specific validation (email format, phone format)

- [ ] Form submission
  - Submit to `/api/survey/submit` endpoint
  - Save response to `responses` table
  - Trigger n8n webhook for AI analysis

- [ ] Success page
  - Thank you message
  - Next steps (calendar booking preview)

#### API Routes
- [ ] `/api/survey/submit` - Handle form submission
- [ ] `/api/survey/validate` - Pre-submission validation
- [ ] Error handling and user feedback

**Key Files to Create:**
- `apps/website/features/survey/components/SurveyForm.tsx`
- `apps/website/features/survey/components/QuestionRenderer.tsx`
- `apps/website/features/survey/actions.ts`
- `apps/website/app/survey/[token]/page.tsx`
- `apps/website/app/survey/[token]/success/page.tsx`
- `apps/website/app/api/survey/submit/route.ts`

**Dependencies:**
- React Hook Form (already installed)
- Zod validation (already installed)
- Survey validation schema from @legal-mind/validators

**Acceptance Criteria:**
- [ ] Client can open survey link and see form
- [ ] All 7 question types render correctly
- [ ] Form validates on client side
- [ ] Successful submission saves to database
- [ ] Success page shows after submission
- [ ] Error messages display for validation failures

---

### Phase 3: Calendar Integration 📋 TODO

**Timeline:** Week 5
**Status:** 📋 Not Started

#### Google Calendar OAuth
- [ ] OAuth 2.0 flow for lawyers
- [ ] Store refresh tokens in `users` table
- [ ] Token refresh logic
- [ ] Revoke/reconnect functionality

#### Available Slots API
- [ ] Fetch lawyer's calendar events
- [ ] Calculate available time slots
- [ ] Respect working hours (9 AM - 5 PM)
- [ ] Buffer time between appointments (15 min)
- [ ] API endpoint: `/api/calendar/slots`

#### Booking Flow
- [ ] Calendar component (date picker + time slots)
- [ ] Prevent double-booking (check conflicts)
- [ ] Create Google Calendar event
- [ ] Save to `appointments` table
- [ ] Link appointment to response

#### Notifications
- [ ] Email confirmation to client
- [ ] Email notification to lawyer
- [ ] Calendar invite attached
- [ ] SMS confirmation (optional via Twilio)

**Key Files to Create:**
- `apps/cms/lib/google-calendar/oauth.ts`
- `apps/cms/lib/google-calendar/events.ts`
- `apps/website/features/survey/components/CalendarBooking.tsx`
- `apps/website/app/api/calendar/slots/route.ts`
- `apps/website/app/api/calendar/book/route.ts`

**External Setup Required:**
- [ ] Google Cloud project
- [ ] Enable Google Calendar API
- [ ] Create OAuth 2.0 credentials
- [ ] Add redirect URIs to Google Console
- [ ] Set environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

**Acceptance Criteria:**
- [ ] Lawyer can connect Google Calendar in CMS settings
- [ ] Client sees available time slots after form submission
- [ ] Booking creates event in Google Calendar
- [ ] No double-booking possible
- [ ] Both parties receive confirmation emails

---

### Phase 4: Response Management 📋 TODO

**Timeline:** Week 6
**Status:** 📋 Not Started

#### CMS Responses List
- [ ] List all responses for tenant
- [ ] Filter by survey, status, date range
- [ ] Search by client email/name
- [ ] Status badges (new, qualified, disqualified, contacted)
- [ ] Pagination (100 per page)
- [ ] Click to view detail

#### Response Detail View
- [ ] Display all question-answer pairs
- [ ] Show AI qualification results
- [ ] Show linked appointment (if booked)
- [ ] Actions: change status, add notes, mark as contacted
- [ ] Timeline of interactions

#### AI Qualification Display
- [ ] Display AI analysis from n8n workflow
- [ ] Qualification score (0-100)
- [ ] Case type classification
- [ ] Urgency level
- [ ] Key information extracted
- [ ] Suggested next steps

#### Response Actions
- [ ] Update status (new → qualified/disqualified → contacted)
- [ ] Add internal notes
- [ ] Export to PDF
- [ ] Send follow-up email

**Key Files to Create:**
- `apps/cms/features/responses/components/ResponseList.tsx`
- `apps/cms/features/responses/components/ResponseDetail.tsx`
- `apps/cms/features/responses/queries.ts`
- `apps/cms/features/responses/actions.ts`
- `apps/cms/app/admin/responses/page.tsx`
- `apps/cms/app/admin/responses/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Lawyer can see all client responses
- [ ] Filtering and search work correctly
- [ ] Response detail shows all information
- [ ] AI qualification displayed if available
- [ ] Status updates save correctly
- [ ] Export to PDF works

---

### Phase 5: n8n Workflows & AI Analysis 🔮 FUTURE

**Timeline:** Week 7-8
**Status:** 🔮 Future Phase

#### n8n Infrastructure
- [ ] Hetzner VPS setup (CX21, €5.83/month)
- [ ] Docker + Docker Compose install
- [ ] n8n installation and configuration
- [ ] Reverse proxy (Nginx) setup
- [ ] SSL certificate (Let's Encrypt)
- [ ] Firewall rules (UFW)

#### AI Analysis Workflow
- [ ] Webhook trigger on form submission
- [ ] OpenAI GPT-4 integration for quick analysis
- [ ] Claude integration for detailed summaries
- [ ] Store AI results in `responses.ai_qualification` (JSONB)
- [ ] Error handling and retry logic
- [ ] Slack/email alerts on failures

#### Email Notifications
- [ ] SMTP setup (SendGrid or AWS SES)
- [ ] Email templates (form confirmation, booking confirmation)
- [ ] Personalized content
- [ ] Unsubscribe links

#### Monitoring
- [ ] n8n execution logs
- [ ] Error tracking
- [ ] Performance metrics
- [ ] Cost monitoring (AI usage)

**Key Components:**
- n8n workflow: "Form Submission → AI Analysis"
- n8n workflow: "Booking Confirmation → Emails"
- n8n workflow: "Daily Summary → Lawyer Digest"

**Acceptance Criteria:**
- [ ] Form submissions automatically trigger AI analysis
- [ ] AI results saved to database within 30 seconds
- [ ] Emails sent reliably
- [ ] Error notifications work
- [ ] Monitoring dashboard accessible

---

### Phase 6: Marketing & Polish 🔮 FUTURE

**Timeline:** Week 9-10
**Status:** 🔮 Future Phase

#### Website Marketing Pages
- [ ] Homepage with hero, features, pricing
- [ ] Pricing page with plans
- [ ] About page (o-nas)
- [ ] Contact page (kontakt)
- [ ] Terms of Service
- [ ] Privacy Policy

#### CMS Polish
- [ ] Dashboard analytics (charts with recharts)
- [ ] Settings page
  - [ ] Law firm profile
  - [ ] User management
  - [ ] Google Calendar connection
  - [ ] Notification preferences
- [ ] Onboarding flow for new law firms

#### Production Readiness
- [ ] Error tracking (Sentry)
- [ ] Analytics (Vercel Analytics or Plausible)
- [ ] Performance monitoring
- [ ] E2E tests (Playwright)
- [ ] Load testing
- [ ] Security audit

**Acceptance Criteria:**
- [ ] Marketing site looks professional
- [ ] All legal pages present
- [ ] CMS has all essential settings
- [ ] Monitoring and alerting in place
- [ ] No critical bugs or security issues

---

## 📊 Current Status Summary

**Last Updated:** December 9, 2025
**Git Commits:** 27 total
**Git Branch:** main
**Remote:** gitlab.com/friendly-coders/legal-mind

### Progress Breakdown

| Phase | Status | Progress | Key Milestone |
|-------|--------|----------|---------------|
| Phase 1: Foundation | ✅ Complete | 100% | All features working + deployed |
| Phase 2: Survey Form | 🚧 Starting | 0% | Next priority |
| Phase 3: Calendar | 📋 Planned | 0% | Week 5 |
| Phase 4: Responses | 📋 Planned | 0% | Week 6 |
| Phase 5: n8n/AI | 🔮 Future | 0% | Week 7-8 |
| Phase 6: Polish | 🔮 Future | 0% | Week 9-10 |

**Overall MVP Progress:** 100% Phase 1 + 0% Phase 2-6 = **17% Total MVP**

### Recent Milestones

**December 9, 2025:** Phase 1 Complete! ✅
- **Survey Link Generation** - Generate, copy, delete links with full UI
- **RLS Fix** - Resolved infinite recursion with `current_user_tenant_id()` function
- **Migration Cleanup** - Consolidated 5 migrations into single clean schema
- **Documentation** - PROJECT_ROADMAP.md as single source of truth
- **Next.js 15 Fix** - Await params Promise in dynamic routes
- **End-to-End Testing** - All Phase 1 features verified working

**December 6, 2025:** Survey Builder Complete ✅
- Question management (add, edit, delete)
- 7 question types supported
- Options editor for multi-choice
- Real-time preview

**December 5, 2025:** Authentication Complete ✅
- Login page with Supabase Auth
- Middleware protecting admin routes
- Session management

### Build Status

**Local Build:** ✅ Passing
```bash
npm run build
✓ @legal-mind/website - ~6s
✓ @legal-mind/cms - ~6s
```

**Vercel Deployment:** ✅ Live
- Website: https://legal-mind-website.vercel.app
- CMS: https://legal-mind-cms.vercel.app

**Database:** ✅ Live
- Supabase: https://zsrpdslhnuwmzewwoexr.supabase.co
- 6 tables with RLS policies active

---

## 🎯 Next Steps (Priority Order)

### Immediate (This Week)

1. **Test Survey Link Generation Locally**
   ```bash
   npm run dev:cms
   # Open http://localhost:3001/admin/surveys/[id]
   # Generate link, copy to clipboard, verify format
   ```

2. **Deploy to Production**
   - Push to GitLab (auto-deploys to Vercel)
   - Add `NEXT_PUBLIC_WEBSITE_URL` to Vercel Dashboard
   - Test link generation in production
   - Verify copy-to-clipboard works

3. **Start Phase 2: Survey Form**
   - Read plan in PROJECT_ROADMAP.md (this file)
   - Create `apps/website/features/survey/components/SurveyForm.tsx`
   - Implement dynamic question rendering
   - Add form validation with Zod

### Short Term (Next 2 Weeks)

4. **Complete Survey Form** (Phase 2)
   - Form submission API
   - Success page
   - Error handling
   - Test end-to-end flow

5. **Google Calendar Setup** (Phase 3)
   - Create Google Cloud project
   - Enable Calendar API
   - Implement OAuth flow
   - Test calendar integration

6. **Response Management UI** (Phase 4)
   - List all responses
   - Detail view
   - Status management
   - Basic filtering

### Medium Term (Next Month)

7. **n8n Infrastructure** (Phase 5)
   - Provision Hetzner VPS
   - Install n8n with Docker
   - Create AI analysis workflow
   - Test webhook integration

8. **Marketing Pages** (Phase 6)
   - Homepage design
   - Pricing page
   - Legal pages

---

## 🔗 Related Documentation

### Primary Documents
- **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** - This document (what to build)
- **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** - Code examples (how to build)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed technical architecture
- **[IMPLEMENTATION_STATUS.md](./archive/IMPLEMENTATION_STATUS.md)** - Historical progress log (archived)

### Architecture Decision Records (ADRs)
- **[adr/001-monorepo-structure.md](./adr/001-monorepo-structure.md)** - Why Turborepo
- **[adr/005-app-vs-features-separation.md](./adr/005-app-vs-features-separation.md)** - Code organization
- **[adr/006-legal-mind-project-structure.md](./adr/006-legal-mind-project-structure.md)** - Project-specific patterns

### Guides (To Be Created)
- `guides/getting-started.md` - Quick start for new developers
- `guides/development.md` - Local setup and commands
- `guides/deployment.md` - Vercel deployment guide

### Historical Documents (Archive)
- `archive/architecture-implementation-plan.md` - Original detailed plan (1385 lines)
- `archive/recommendation-for-mvp.md` - Early MVP recommendations
- `archive/sas-product-discussion.md` - Initial product discussions

---

## 📝 Development Guidelines

### When Adding New Features

1. **Read this roadmap first** - Understand what's been built and what's planned
2. **Check current phase** - Are you working on the right priority?
3. **Follow existing patterns** - Use Server Actions, TanStack Query, ADR patterns
4. **Update documentation** - Update IMPLEMENTATION_STATUS.md after completing tasks
5. **Commit with context** - Reference this roadmap in commit messages

### For AI Assistants

When helping with this project:
1. **Read PROJECT_ROADMAP.md** (this file) for full context
2. **Read CODE_PATTERNS.md** for concrete code examples (HOW to implement)
3. **Check current phase** status to understand what's done
4. **Follow ADR patterns** in `adr/` directory
5. **Reference ARCHITECTURE.md** for technical details
6. **Update docs** after making changes

### Code Organization Patterns

**Server Actions (Mutations):**
```typescript
// apps/cms/features/{feature}/actions.ts
'use server'
export async function createThing(data) {
  const supabase = await createClient()
  // ... mutation logic
  revalidatePath('/admin/things')
  return { success: true }
}
```

**Queries (Data Fetching):**
```typescript
// apps/cms/features/{feature}/queries.ts
export async function getThings(): Promise<Tables<'things'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('things').select('*')
  if (error) throw error
  return data || []
}
```

**Components:**
```typescript
// apps/cms/features/{feature}/components/ThingList.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { getThings } from '../queries'

export function ThingList() {
  const { data } = useQuery({
    queryKey: ['things'],
    queryFn: getThings
  })
  // ...
}
```

---

## 🎓 Key Learnings & Decisions

### Why Turborepo?
- Code sharing between apps (UI components, types, validators)
- Independent deployments (website vs cms)
- Caching for faster builds
- Easy to add more apps later (mobile, admin v2, etc.)

### Why Two Apps?
- **Security:** Public website doesn't have admin code in bundle
- **Performance:** Each app optimized for its use case
- **Scalability:** Can scale independently based on traffic
- **Deployment:** Website changes don't require CMS rebuild

### Why Supabase?
- PostgreSQL with great TypeScript support
- Row Level Security for multi-tenancy (no middleware needed)
- Built-in auth (email/password, OAuth)
- Realtime subscriptions (future feature)
- Free tier sufficient for MVP

### Why TanStack Query Only in CMS?
- **CMS:** Complex data fetching, caching, mutations (lawyer uses frequently)
- **Website:** Simple one-time form submission (client visits once)
- Smaller bundle size for website app

### Why shadcn/ui?
- Copy-paste components (not npm package dependency)
- Full control over styling
- Tailwind CSS based
- TypeScript + accessibility built-in
- Easy to customize

---

## 🚀 Success Criteria for MVP

### Technical
- [ ] Both apps build without errors
- [ ] All tests passing (when implemented)
- [ ] No TypeScript errors
- [ ] Lighthouse score > 90 for website
- [ ] Zero critical security vulnerabilities

### Functional
- [ ] Lawyer can create survey in < 5 minutes
- [ ] Client can fill form in < 10 minutes
- [ ] Booking takes < 2 minutes
- [ ] AI analysis completes in < 30 seconds
- [ ] Response to booking confirmation < 1 minute

### Business
- [ ] First paying customer onboarded
- [ ] 95% uptime
- [ ] < 1 critical bug per week
- [ ] Support response time < 24 hours

---

**Document Version:** 1.0
**Maintained By:** Development Team
**Review Frequency:** After each phase completion

*For questions or clarifications, see related documentation or contact project maintainer.*
