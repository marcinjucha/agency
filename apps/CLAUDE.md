# apps/ - Applications Directory

This directory contains the two Next.js applications that make up AI Agency.

## Structure

```
apps/
├── website/     # Public-facing application
└── cms/         # Admin panel application
```

## Applications

### apps/website/
**Purpose:** Public marketing website and client survey forms

**Users:** Prospective clients, survey respondents (anonymous)

**Key Features:**
- Marketing pages (homepage, pricing, about, contact)
- Dynamic survey forms (`/survey/[token]`)
- Calendar booking interface
- No authentication required

**Port:** 3000 (development)
**URL:** https://agency-website.vercel.app (production)

**When to add code here:**
- Public-facing pages (anyone can access)
- Client survey form components
- Marketing content
- Landing pages

### apps/cms/
**Purpose:** Admin panel for service providers

**Users:** Service providers, staff (authenticated)

**Key Features:**
- Authentication (login/logout)
- Survey builder and management
- Client responses with AI qualification
- Calendar management
- Dashboard analytics

**Port:** 3001 (development)
**URL:** https://agency-cms.vercel.app (production)

**When to add code here:**
- Admin-only features
- Protected routes requiring authentication
- Survey management tools
- Response analysis
- Internal dashboards

## Separation Principle

**Rule:** Separate by authentication boundary, not by feature

- If it requires login → `apps/cms/`
- If it's public → `apps/website/`

## Shared Code

Don't duplicate code between apps. Use:
- `packages/ui/` for shared components
- `packages/database/` for shared types
- `packages/validators/` for shared validation

## Centralized Messages (i18n-ready)

**Files:** `apps/cms/lib/messages.ts` (~250 strings) + `apps/website/lib/messages.ts` (~50 strings)
**Pattern:** `messages` (static `as const` object, nested by feature) + `templates` (dynamic functions with params)
**Usage:** `import { messages } from '@/lib/messages'` → `messages.surveys.createFailed`
**Per-app files** (not shared package) — CMS and website have almost entirely different string sets.
**i18n path:** Replace `messages.key` with `t('key')` + move object to `messages/pl.json` when adding next-intl.

**Rules:**
- All user-facing strings must go through `messages.ts`
- `console.error` stays English (developer-facing)
- Date formatting uses `pl-PL` locale

**WHY:** Prevents recurring EN/PL inconsistency discovered in 2026-03-26 audit. Single source of truth per app for all UI strings. (2026-03-26)

## Development

```bash
# Start both apps
npm run dev

# Start individually
npm run dev:website
npm run dev:cms
```

## Deployment

Each app deploys independently to Vercel:
- Changes to `apps/website/` → redeploys website only
- Changes to `apps/cms/` → redeploys CMS only
- Changes to `packages/` → redeploys both (transpiled)

## Related Documentation

- [ADR-006: Project Structure](../docs/adr/006-agency-project-structure.md)
- [Architecture Overview](../docs/ARCHITECTURE.md)
