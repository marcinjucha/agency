# apps/website/ - Public Website

Public-facing marketing website and client survey forms.

## Purpose

Public application for:
- Marketing agency services
- Client survey form submission (via unique token links)
- Calendar appointment booking
- No authentication required

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui from @agency/ui
- **Database:** Supabase (public access via RLS)
- **State:** No complex state management needed (simple forms)

## Folder Structure

```
apps/website/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage redirect
│   ├── not-found.tsx        # 404 page
│   ├── robots.ts            # Robots.txt generation
│   ├── sitemap.ts           # Sitemap generation
│   │
│   ├── (marketing)/         # Route group - marketing pages
│   │   ├── layout.tsx       # Marketing layout (Navbar, Footer)
│   │   ├── page.tsx         # Homepage (landing page)
│   │   └── ...
│   │
│   ├── blog/                # Public blog
│   ├── survey/              # Client survey forms
│   │   └── [token]/page.tsx # Survey form + Calendar booking
│   ├── regulamin/           # Terms of service
│   ├── polityka-prywatnosci/# Privacy policy
│   │
│   └── api/                 # Public API routes
│       ├── survey/submit/   # Form submission (service role)
│       └── calendar/
│           ├── slots/       # Available slots
│           └── book/        # Book appointment
│
├── features/                # Business logic (see features/CLAUDE.md)
│   ├── blog/               # Blog queries + components
│   ├── calendar/           # Booking logic, slot calculator
│   ├── legal/              # Legal page queries + components
│   ├── marketing/          # Landing page components
│   ├── site-settings/      # Site settings queries
│   └── survey/             # Survey form + submission + booking flow
│
└── lib/                     # Utilities
    ├── messages.ts          # Polish strings
    ├── plausible.ts         # Plausible analytics
    ├── routes.ts            # Route constants
    ├── layout-defaults.ts   # Layout configuration
    ├── supabase/
    │   ├── anon-server.ts   # createAnonClient() — service role for submissions
    │   ├── client.ts        # Browser Supabase client
    │   └── server.ts        # Server Supabase client (cookies-based)
    └── utils/               # Helper functions
```

## Key Concepts

### No Authentication
This app is completely public. No login, no middleware, no protected routes.

### Survey Flow
1. Client receives email with link: `agency.com/survey/abc123`
2. Clicks link → opens survey form
3. Fills out form → submits
4. Sees calendar → books appointment
5. Gets confirmation

### Route Groups
`(marketing)/` is a route group that doesn't affect URL structure:
- File: `app/(marketing)/pricing/page.tsx`
- URL: `/pricing` (not `/marketing/pricing`)
- Purpose: Shared layout (Navbar + Footer)

### Internal Links: `<Link>` not `<a>`
Always use Next.js `<Link>` for same-domain routes (`/survey/[uuid]`, `/blog/[slug]`). Plain `<a>` only for external URLs.
**Why:** CtaLink used `<a>` for `/survey/...` — caused full page reload instead of client-side navigation.

## Database Access

**`createAnonClient()` for all server queries** — NOT `createClient()` from server.ts. **Why:** `createClient()` uses `cookies()` which fails at ISR build time. `createAnonClient()` (in `lib/supabase/anon-server.ts`) creates a service role client without cookies. Safe because website only reads public data (RLS on `is_published`) or writes submissions (tenant_id from survey, not user input).

**`cache()` wrapper for request deduplication** — Server queries in `features/*/queries.ts` wrap functions with React `cache()`. Prevents duplicate DB calls when multiple server components call the same query during a single render pass. NOT TanStack Query (that is CMS-only).

## State Management

**No TanStack Query** — TanStack Query is CMS-only. Website uses `cache()` from React for request deduplication in server components.

**React Hook Form** for survey forms.

## Routes

```
/                          - Homepage (landing page from CMS)
/blog                      - Blog listing
/blog/[slug]               - Blog post
/survey/[token]            - Client survey form + calendar booking
/regulamin                 - Terms of service
/polityka-prywatnosci      - Privacy policy
```

## Survey + Booking Flow

Survey submission uses API Route (not Server Action). **Why:** API route runs with service role key server-side, safe for anonymous submissions. Server Actions require cookies context which anonymous users don't have.

**CalendarBooking** split into sub-components: `DateSlotPicker` (owns slot-fetch state, accepts `surveyId` prop), `BookingForm`, `TimeSlotsGrid`, `BookingSuccess`. **Why:** Original monolithic component was 400+ lines mixing 4 concerns.

## Development

```bash
# Start website only
npm run dev:website
# Visit: http://localhost:3000

# Build website only
npm run build:website
```

## Deployment

Auto-deploys to: https://agency-website.vercel.app

**Environment Variables (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for createAnonClient submissions)
- `N8N_WEBHOOK_URL`
- `CMS_BASE_URL` (points to CMS for workflow trigger API, e.g. https://cms.haloefekt.pl)

## Related Files

- `.env.local` - Environment variables (local dev)
- `.env.local.example` - Template for env vars
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS config
