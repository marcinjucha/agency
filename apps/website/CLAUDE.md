# apps/website/ - Public Website

Public-facing marketing website and client survey forms.

## Purpose

Public application for:
- Marketing law firm services
- Client survey form submission (via unique token links)
- Calendar appointment booking
- No authentication required

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui from @legal-mind/ui
- **Database:** Supabase (public access via RLS)
- **State:** No complex state management needed (simple forms)

## Folder Structure

```
apps/website/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage (default Next.js template, TODO)
│   │
│   ├── (marketing)/         # Route group - marketing pages
│   │   ├── layout.tsx       # Marketing layout (Navbar, Footer)
│   │   ├── page.tsx         # Homepage (TODO)
│   │   ├── pricing/         # Pricing page (TODO)
│   │   ├── o-nas/           # About page (TODO)
│   │   └── kontakt/         # Contact page (TODO)
│   │
│   ├── survey/              # Client survey forms
│   │   └── [token]/
│   │       ├── page.tsx     # Survey form + Calendar (TODO)
│   │       └── success/     # Thank you page (TODO)
│   │
│   └── api/                 # Public API routes
│       ├── survey/
│       │   └── submit/      # Form submission (TODO)
│       └── calendar/
│           └── slots/       # Available slots (TODO)
│
├── features/                # Business logic
│   ├── survey/              # Survey form logic (TODO)
│   │   ├── components/      # SurveyForm, CalendarBooking
│   │   ├── actions.ts       # Form submission
│   │   └── queries.ts       # Fetch survey by token
│   │
│   └── marketing/           # Marketing components (TODO)
│       └── components/      # Hero, Features, Pricing
│
├── components/              # Shared UI components
│   ├── layout/              # Navbar, Footer (TODO)
│   └── shared/              # Reusable UI
│
└── lib/                     # Utilities
    ├── supabase/
    │   ├── client.ts        # Browser Supabase client
    │   └── server.ts        # Server Supabase client
    └── utils/               # Helper functions
```

## Key Concepts

### No Authentication
This app is completely public. No login, no middleware, no protected routes.

### Survey Flow
1. Client receives email with link: `legalmind.pl/survey/abc123`
2. Clicks link → opens survey form
3. Fills out form → submits
4. Sees calendar → books appointment
5. Gets confirmation

### Route Groups
`(marketing)/` is a route group that doesn't affect URL structure:
- File: `app/(marketing)/pricing/page.tsx`
- URL: `/pricing` (not `/marketing/pricing`)
- Purpose: Shared layout (Navbar + Footer)

## Database Access

**Public access via RLS:**
```typescript
// Fetch survey by token (allowed by RLS policy)
const { data: survey } = await supabase
  .from('surveys')
  .select('*')
  .eq('token', token)

// Submit response (allowed by RLS policy)
await supabase.from('responses').insert({
  survey_link_id: linkId,
  answers: formData,
  tenant_id: survey.tenant_id
})
```

**No auth checks needed** - RLS policies handle security.

## State Management

**No TanStack Query** - simple forms don't need it.

**React Hook Form:**
```typescript
const { handleSubmit } = useForm()
const onSubmit = async (data) => {
  await fetch('/api/survey/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
```

## Routes (Planned)

```
/                        - Homepage (marketing)
/pricing                 - Pricing page
/o-nas                   - About us
/kontakt                 - Contact
/survey/[token]          - Client survey form (dynamic)
/survey/[token]/success  - Thank you page
```

## Adding Marketing Pages

1. **Create page:**
   ```bash
   touch app/(marketing)/pricing/page.tsx
   ```

2. **Create feature components:**
   ```bash
   mkdir -p features/marketing/components
   touch features/marketing/components/Pricing.tsx
   ```

3. **Import in page:**
   ```typescript
   import { Pricing } from '@/features/marketing/components/Pricing'

   export default function PricingPage() {
     return <Pricing />
   }
   ```

## Adding Survey Form

1. **Create component:**
   ```bash
   mkdir -p features/survey/components
   touch features/survey/components/SurveyForm.tsx
   ```

2. **Create page:**
   ```typescript
   // app/survey/[token]/page.tsx
   import { getSurveyByToken } from '@/features/survey/queries'
   import { SurveyForm } from '@/features/survey/components/SurveyForm'

   export default async function SurveyPage({ params }) {
     const survey = await getSurveyByToken(params.token)
     return <SurveyForm survey={survey} />
   }
   ```

## Development

```bash
# Start website only
npm run dev:website
# Visit: http://localhost:3000

# Build website only
npm run build:website
```

## Deployment

Auto-deploys to: https://legal-mind-website.vercel.app

**Environment Variables (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `N8N_WEBHOOK_URL`
- `HOST_URL`

## Related Files

- `.env.local` - Environment variables (local dev)
- `.env.local.example` - Template for env vars
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS config
