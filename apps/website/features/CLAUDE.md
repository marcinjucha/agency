# features/ - Business Logic (Website)

Business logic for the public website, separated from routing (same ADR-005 pattern as CMS).

## Structure

```
features/
├── blog/            # Blog listing + post pages
├── calendar/        # Booking logic, slot calculator, types
├── legal/           # Legal page queries (regulamin, polityka prywatnosci)
├── marketing/       # Landing page components (Hero, sections)
├── site-settings/   # Site settings queries (org name, logo, SEO)
└── survey/          # Survey form + submission + calendar booking
```

## The Weird Parts

### `createAnonClient()` Instead of `createClient()`

All server queries use `createAnonClient()` from `lib/supabase/anon-server.ts` (service role, no cookies).

**Why:** `createClient()` from `server.ts` calls `cookies()` which fails at ISR build time. Website pages use ISR (static generation with revalidation), so server queries run at build time when there is no request context. Service role is safe because website only reads public data (`is_published` RLS) or writes submissions (tenant_id comes from survey row, not user input).

### `cache()` for Request Deduplication (Not TanStack Query)

Server queries in `features/*/queries.ts` wrap functions with React `cache()`:

```typescript
import { cache } from 'react'
export const getSiteSettings = cache(async (tenantId: string) => { ... })
```

**Why:** TanStack Query is CMS-only (client-side state management). Website server components need deduplication when multiple components call the same query during a single render pass. React `cache()` deduplicates within a single request.

### Survey Submission via API Route (Not Server Action)

`features/survey/submit.ts` is called from `app/api/survey/submit/route.ts`, not a Server Action.

**Why:** Server Actions require cookies context (Supabase auth). Anonymous survey respondents have no auth session. API route uses `createAnonClient()` (service role) which does not depend on cookies.

### CalendarBooking Sub-Component Architecture

`CalendarBooking` (133L) orchestrates 4 sub-components:
- `DateSlotPicker` — owns slot-fetch state, accepts `surveyId` prop for linking booking to survey
- `TimeSlotsGrid` — renders available time slots for selected date
- `BookingForm` — collects client name/email, submits booking
- `BookingSuccess` — confirmation screen

**Why:** Original monolithic component was 400+ lines mixing date selection, slot fetching, form state, and confirmation UI. Split for testability and readability.

### Booking Flow Trigger Point

Booking flow lives in `features/calendar/booking.ts` (NOT `features/calendar/actions.ts`). This is the integration point for `booking_confirmed` workflow engine trigger.

**Why:** `booking.ts` contains the booking creation logic that fires the workflow trigger after successful appointment creation. Workflow trigger call (POST to CMS `/api/workflows/trigger`) lives here, not in the API route.
