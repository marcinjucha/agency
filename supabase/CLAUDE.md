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
├── migrations/                           # 28 migration files (as of 2026-03-30)
│   ├── 20250105000001_initial_schema.sql # Initial schema
│   └── ...                               # See migrations/ for full list
├── seed_first_user.sql                   # User creation guide
└── README.md                             # Setup instructions
```

## Database Schema

### Tables (19 total)

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
- Encrypted API keys via pgcrypto, `email_configs_decrypted` view for n8n

**email_templates** - Per-tenant email templates
- JSONB blocks + pre-rendered html_body, UNIQUE(tenant_id, type)

**media_items** - Media library items (S3)
- 6 types: image, video, youtube, vimeo, instagram, tiktok
- folder_id FK to media_folders

**media_folders** - Hierarchical folders for media
- Self-referential parent_id, ON DELETE SET NULL on items

**shop_products** - Product catalog (25 cols)
- listing_type enum, display_layout CHECK, Tiptap description
- NUMERIC price, JSONB images/seo

**shop_categories** - Product categories (flat, no nesting)
- Tenant-isolated

**site_settings** - One row per tenant, org-level config
- Name, logo, SEO defaults, keywords

**calendar_settings** - Per-user Google Calendar OAuth tokens + booking settings

**tenant_domains** - Custom domain mapping per tenant

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
# Generate types
supabase gen types typescript --linked > packages/database/src/types.ts

# Or use npm script
npm run db:types
```

**Never manually edit** `packages/database/src/types.ts` - it's auto-generated!

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

## Related Documentation

- [Supabase Setup Guide](./README.md)
- [Database Pattern](../docs/adr/006-agency-project-structure.md#5-database-access-pattern)
- [Migration Guide](../docs/ARCHITECTURE.md#database-schema)
