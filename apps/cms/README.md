# Halo Efekt - CMS App

Admin panel for law firms to manage surveys, responses, and appointments.

## URLs

- **Development:** http://localhost:3001
- **Production:** https://halo-efekt-cms.vercel.app (or custom domain)

## Features

- ✅ Authentication (Supabase Auth)
- ✅ Dashboard with stats
- ✅ Survey management (list, create)
- 🚧 Survey Builder (in progress)
- 🚧 Responses list with AI qualification
- 🚧 Calendar management
- 🚧 Google Calendar integration

## Development

```bash
# From monorepo root
npm run dev:cms

# Or directly
cd apps/cms
npm run dev
```

## Build

```bash
# From monorepo root
npm run build:cms

# Or with Turbo
npx turbo run build --filter=@agency/cms
```

## Environment Variables

See `.env.local.example` for all required variables.

**Critical variables:**
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin access (KEEP SECRET!)
- `GOOGLE_CLIENT_SECRET` - OAuth secret (KEEP SECRET!)
- `OPENAI_API_KEY` - AI API access (KEEP SECRET!)

## Authentication

### First User Setup

Before you can login, you need to create a user in Supabase:

1. Go to Supabase Dashboard → Authentication → Users
2. Create new user with email/password
3. Go to SQL Editor and run:
   ```sql
   -- Create tenant
   INSERT INTO tenants (name, email) VALUES ('My Firm', 'admin@firm.com');

   -- Link user to tenant (use IDs from above)
   INSERT INTO users (id, tenant_id, email, full_name, role)
   VALUES ('[auth-user-id]', '[tenant-id]', 'admin@firm.com', 'Admin', 'owner');
   ```

### Middleware Protection

All routes except `/login` are protected by middleware.
Unauthenticated users are redirected to `/login`.

## Deployment

Deployed automatically via Vercel when pushing to `main` branch.

Manual deployment:
```bash
vercel --cwd apps/cms --prod
```

See `/docs/DEPLOYMENT.md` for full instructions.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **State Management:** TanStack Query (server state)
- **Forms:** React Hook Form + Zod
- **UI:** shadcn/ui components from @agency/ui
- **Database:** Supabase (PostgreSQL + Auth)
- **Auth:** Supabase Auth with middleware
- **Styling:** Tailwind CSS

## Routes

```
/login                    - Authentication page
/admin                    - Dashboard (protected)
/admin/surveys            - Survey list (protected)
/admin/surveys/new        - Create survey (protected)
/admin/surveys/[id]       - Edit survey (protected, coming soon)
/admin/responses          - Responses list (protected, coming soon)
/admin/calendar           - Calendar (protected, coming soon)
/admin/settings           - Settings (protected, coming soon)
```
