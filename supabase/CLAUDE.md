# supabase/ - Database Configuration

This directory contains Supabase configuration and database migrations.

## Purpose

- Define database schema via SQL migrations
- Configure local Supabase instance
- Document database setup and usage

## Structure

```
supabase/
├── config.toml                           # Local Supabase config
├── migrations/                           # 36 migration files (as of 2026-04-03)
│   ├── 20250105000001_initial_schema.sql # Initial schema
│   └── ...                               # See migrations/ for full list
├── seed_first_user.sql                   # User creation guide
└── README.md                             # Setup instructions
```

## Database Schema

### Tables (27 total)

**tenants** - Organizations/firms (multi-tenant root)
- Each organization = 1 tenant
- Has many users, surveys, responses, appointments

**users** - Users within tenants, linked to auth.users
- Belongs to one tenant
- Has role: owner, admin, member

**surveys** - Survey templates with JSONB questions
- Has status: draft, active, archived
- Belongs to tenant (RLS enforced)

**survey_links** - Unique client links with UUID token
- Tracks submission count (current_submissions, max_submissions)
- Can expire

**responses** - Client submissions with JSONB answers
- AI qualification results as JSONB (ai_qualification)
- Has status: new, qualified, disqualified, contacted
- Belongs to tenant (RLS enforced)

**appointments** - Scheduled meetings, Google Calendar sync
- Links to response (optional)
- Has start/end time, google_calendar_event_id
- Has status: scheduled, completed, cancelled

**blog_posts** - Blog articles with Tiptap JSONB content + pre-rendered html_body
- S3 images, SEO fields, scheduled publishing

**landing_pages** - Marketing page blocks (JSONB), 7 block types
- ISR revalidation for public website

**pages** - Legal/static pages (regulamin, polityka prywatnosci)
- Tiptap JSONB content

**email_configs** - Per-tenant email provider config (Resend)
- api_key stored as plain TEXT (no encryption). n8n reads directly.

**email_templates** - Per-tenant email templates
- JSONB blocks + pre-rendered html_body, UNIQUE(tenant_id, type)

**media_items** - Media library items (S3)
- 6 types: image, video, youtube, vimeo, instagram, tiktok
- folder_id FK to media_folders

**media_folders** - Hierarchical folders for media
- Self-referential parent_id, ON DELETE SET NULL on items

**shop_products** - Product catalog (25 cols)
- listing_type enum, display_layout CHECK, Tiptap description
- NUMERIC price, JSONB images/seo, is_featured BOOLEAN

**shop_categories** - Product categories (flat, no nesting)
- Tenant-isolated

**shop_marketplace_connections** - OAuth credentials per tenant per marketplace
- pgcrypto BYTEA encrypted tokens, `shop_marketplace_connections_decrypted` view

**shop_marketplace_listings** - Product-to-marketplace mapping (1 product to N listings)
- marketplace_params JSONB, external_id, status sync

**shop_marketplace_imports** - Imported listings from external marketplaces

**site_settings** - One row per tenant, org-level config
- Name, logo, SEO defaults, keywords

**calendar_settings** - Per-user Google Calendar OAuth tokens + booking settings

**tenant_domains** - Custom domain mapping per tenant

**workflows** - Per-tenant workflow definitions (visual builder)
- ReactFlow-based, trigger_type TEXT

**workflow_steps** - Individual steps within a workflow
- step_type TEXT, step_config JSONB, position JSONB

**workflow_edges** - Connections between workflow steps
- source_step_id, target_step_id, condition_branch

**workflow_executions** - Workflow run instances
- status, started_at, completed_at, context JSONB

**workflow_step_executions** - Per-step execution records
- status, result JSONB, started_at, completed_at

**docforge_licenses** - DocForge desktop app license keys (cross-project)

### Row Level Security (RLS)

**All tables use `current_user_tenant_id()` helper** (SECURITY DEFINER function) to avoid RLS infinite recursion. Never query `users` table directly in RLS policy — causes infinite loop.

**Authenticated tenant isolation (most tables):**
```sql
-- Pattern used by surveys, responses, blog_posts, landing_pages, pages,
-- email_configs, email_templates, media_items, media_folders, site_settings, etc.
CREATE POLICY "tenant_isolation"
  ON surveys FOR ALL
  USING (tenant_id = current_user_tenant_id());
```

**Public access for client-facing data:**
```sql
-- survey_links: anon SELECT (public form access)
-- responses: anon INSERT (form submissions)
-- shop_products: anon SELECT WHERE is_published = true
-- shop_categories: anon SELECT all (public catalog)
-- site_settings: anon SELECT (public website needs org name/logo)
-- landing_pages: anon SELECT WHERE is_published = true
```

**Admin-only (no anon access):**
- media_folders, media_items, email_configs, email_templates, calendar_settings

## Migrations

### Creating a Migration

```bash
# Create new migration file
supabase migration new add_feature_name

# Edit the file in supabase/migrations/

# Apply locally
supabase db reset

# Apply to production
supabase db push
```

### Migration Naming

Format: `YYYYMMDDHHMMSS_description.sql`
- `20250105000001_initial_schema.sql`
- `20250110000001_add_lex_integration.sql`

### Migration Best Practices

1. **Always use transactions** (implicit in Supabase)
2. **Add indexes** for frequently queried columns
3. **Add comments** for complex logic
4. **Test locally** before pushing to production
5. **Regenerate types** after migration

## TypeScript Types

**Auto-generated from live database:**

```bash
# Generate types — filter "Initialising login role..." line that corrupts output
supabase gen types typescript --linked 2>/dev/null | grep -v "^Initialising" > packages/database/src/types.ts

# Or use npm script
npm run db:types
```

**Never manually edit** `packages/database/src/types.ts` - it's auto-generated!

**Why the `grep -v "^Initialising"` filter:** `supabase gen types` prepends "Initialising login role..." status text to stdout, which corrupts `types.ts` and breaks TypeScript compilation. Manually removing the line each time is error-prone — bake the filter into the redirect.

**`db:types` script targets `--local` by default** — when local Supabase isn't running, switch to `--linked` (or update the script) to hit Cloud directly. Otherwise the command silently produces an empty/stale types file.

## Local Development

```bash
# Start local Supabase (Docker required)
supabase start

# This starts:
# - PostgreSQL (port 54322)
# - Kong API Gateway (port 54321)
# - GoTrue Auth (port 9999)
# - Studio UI (http://localhost:54323)

# Get local credentials
supabase status

# Update .env.local with local credentials
```

## Production (Supabase Cloud)

**Project:** zsrpdslhnuwmzewwoexr
**URL:** https://zsrpdslhnuwmzewwoexr.supabase.co
**Database:** PostgreSQL 17

**Credentials:**
- Anon Key: Used in apps (public, respects RLS)
- Service Role Key: Server-side only (bypasses RLS, secret!)

**Access:**
- Dashboard: https://app.supabase.com/project/zsrpdslhnuwmzewwoexr
- Database Editor: .../editor
- SQL Editor: .../sql
- Auth Users: .../auth/users

## Creating First User

**See `seed_first_user.sql` for complete instructions.**

Quick version:
```sql
-- 1. Create tenant
INSERT INTO tenants (name, email) VALUES ('Test Firm', 'test@test.com');

-- 2. Create auth user (via Dashboard UI)

-- 3. Link user to tenant
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES ('[auth-user-id]', '[tenant-id]', 'test@test.com', 'Test User', 'owner');
```

## Common Queries

### Check tenant data
```sql
SELECT * FROM tenants;
SELECT * FROM users WHERE tenant_id = '[tenant-id]';
SELECT * FROM surveys WHERE tenant_id = '[tenant-id]';
```

### Test RLS policies
```sql
-- Set user context
SET LOCAL request.jwt.claims.sub = '[user-id]';

-- This should only return user's tenant data
SELECT * FROM surveys;
```

### View indexes
```sql
SELECT * FROM pg_indexes WHERE tablename IN ('surveys', 'responses', 'appointments');
```

## Troubleshooting

### "Function gen_random_uuid() does not exist"

**Fix:** Migration uses `gen_random_uuid()` which requires `pgcrypto` extension.
Already enabled in migration: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`

### "RLS policy violation"

**Cause:** User not in `users` table or tenant_id mismatch
**Fix:** Ensure user exists in both `auth.users` AND `public.users` with correct `tenant_id`

### Types out of sync

**Cause:** Database schema changed but types not regenerated
**Fix:** `npm run db:types`

## Gotchas (Supabase JS / PostgREST Limitations)

### Supabase JS `.update().eq().lte().select()` is NOT atomic

Chained methods are separate HTTP request parts, not a single `UPDATE...RETURNING` SQL statement. Two concurrent callers can claim the same rows.

**Fix:** PostgreSQL RPC with `FOR UPDATE SKIP LOCKED` for any batch processing endpoint where concurrent calls may overlap (e.g., `claim_due_delay_steps`).

**Why:** Supabase JS translates method chains into a single PostgREST HTTP request, but PostgREST does not wrap the read-filter + update into a single atomic SQL transaction with row locking. For single-caller endpoints this is fine; for batch endpoints called by cron or parallel workers, it causes double-claiming.

### PostgREST `.order()` cannot sort by foreign table columns

`.order('foreign_table(column)')` fails silently — returns data unsorted, no error thrown.

**Fix:** Sort client-side after `.map()` or use a PostgreSQL view/RPC that joins and sorts server-side.

**Why:** PostgREST limitation. The embedded resource syntax works for `.select()` but not for `.order()`. No error is thrown, making this hard to debug.

### Supabase `.upsert()` `onConflict` requires actual unique constraint

`.upsert({}, { onConflict: 'col1,col2' })` silently INSERTs duplicates if no unique constraint or unique index exists on those columns. PostgREST does not error — it falls back to plain INSERT.

**Fix:** Always verify the migration SQL has a matching `UNIQUE(col1, col2)` constraint or unique index before using `onConflict`. Check with: `\d table_name` in psql or inspect migration file.

**Why:** Found in AAA-T-157 (marketplace listings). `onConflict: 'product_id,marketplace'` created duplicate listings silently because the unique constraint was missing from the migration. No error at any layer — Supabase JS, PostgREST, and PostgreSQL all succeed (as a regular INSERT).

### Supabase Cloud blocks `ALTER DATABASE SET` for custom GUCs — use `app_config` table instead

Supabase Cloud rejects `ALTER DATABASE postgres SET app.encryption_key = '...'`. Custom GUCs (Grand Unified Configuration parameters) cannot be set this way on managed Postgres.

**Fix:** Store the value in an `app_config` table (one row per key) and read it from a `SECURITY DEFINER` function (e.g. `get_encryption_key()`). Call that function from pgcrypto wrappers instead of `current_setting('app.encryption_key')`.

**Why:** Used by `shop_marketplace_connections.access_token` encryption (pgcrypto BYTEA). `current_setting('app.x')` would be the natural Postgres pattern but is unavailable on Cloud — `SELECT get_encryption_key()` from a SECURITY DEFINER function reading `app_config` is the workaround. Keeps the secret out of code/env while remaining queryable from migrations and triggers.

### Nil UUID fallback for nullable filter values

`.eq('column', maybeNullId)` where `maybeNullId` is `null` causes PostgreSQL to throw a UUID parse error (PostgREST forwards it as a 400). The query fails instead of returning zero rows.

**Fix:** Coalesce to the nil UUID at the call site:

```ts
.eq('user_id', maybeUserId ?? '00000000-0000-0000-0000-000000000000')
```

The nil UUID is a valid UUID (parses fine) but never matches a real row → safely returns zero results.

**Why:** Recurs in queries with optional FK filters (e.g., "responses for this user, or none if not logged in"). Conditional `.eq()` chaining works too but is verbose; the nil-UUID coalesce reads as a single expression and is the established pattern in this codebase.

## Related Documentation

- [Supabase Setup Guide](./README.md)
- [Database Pattern](../docs/adr/006-agency-project-structure.md#5-database-access-pattern)
- [Migration Guide](../docs/ARCHITECTURE.md#database-schema)
