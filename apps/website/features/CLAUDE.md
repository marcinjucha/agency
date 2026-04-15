# features/ - Business Logic (Website)

Business logic for the public website, separated from routing (same ADR-005 pattern as CMS).

## Structure

```
features/
├── blog/            # Blog server fns + components
├── calendar/        # Booking logic, slot calculator, types
├── legal/           # Legal page server fns + components
├── marketing/       # Landing page server fns + components
├── site-settings/   # Site settings server fns
└── survey/          # Survey form + server fns + calendar booking
```

## The Weird Parts

### `createServiceClient()` from `lib/supabase/service.ts`

All server functions use `createServiceClient()` (service role, no cookies).

**Why:** TanStack `createServerFn` runs server-only without a cookie context. Service role is safe because website only reads public data (`is_published` RLS) or writes submissions (tenant_id comes from survey row, not user input).

### Server Functions in `features/*/server.ts` (Not queries.ts)

Each feature exposes data-fetching via `createServerFn` in a `server.ts` file (NOT a Next.js-style `queries.ts`). Routes call these from their `loader` function, and components read data via `Route.useLoaderData()`.

```typescript
// features/blog/server.ts
export const getPublishedBlogPostsFn = createServerFn().handler(async () => {
  const supabase = createServiceClient()
  const { data } = await supabase.from('blog_posts').select('...')
  return data
})

// app/routes/blog/index.tsx
export const Route = createFileRoute('/blog/')({
  loader: async () => ({ posts: await getPublishedBlogPostsFn() }),
})
```

### Survey Submission via createServerFn (Not API Route)

`features/survey/server.ts` contains `submitSurveyFn` called from the survey route's `onSubmit` handler.

**Why:** TanStack `createServerFn` replaces Next.js API routes for server-side mutations. Uses `createServiceClient()` (service role) — no cookies needed for anonymous respondents.

### CalendarBooking Sub-Component Architecture

`CalendarBooking` orchestrates 4 sub-components:
- `DateSlotPicker` — owns slot-fetch state, accepts `surveyId` prop for linking booking to survey
- `TimeSlotsGrid` — renders available time slots for selected date
- `BookingForm` — collects client name/email, submits booking
- `BookingSuccess` — confirmation screen

**Why:** Original monolithic component was 400+ lines mixing date selection, slot fetching, form state, and confirmation UI. Split for testability and readability.

### Booking Flow Trigger Point

Booking flow lives in `features/calendar/booking.ts`. This is the integration point for `booking_confirmed` workflow engine trigger.

**Why:** `booking.ts` contains the booking creation logic that fires the workflow trigger after successful appointment creation. Workflow trigger call (POST to CMS `/api/workflows/trigger`) lives here.
