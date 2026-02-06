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
├── migrations/
│   └── 20250105000001_initial_schema.sql # Database schema
├── seed_first_user.sql                   # User creation guide
└── README.md                             # Setup instructions
```

## Database Schema

### Tables (6 total)

**tenants** - Law firms
- Multi-tenant isolation root
- Each law firm = 1 tenant
- Has many users, surveys, responses, appointments

**users** - Lawyers within firms
- Links auth.users (Supabase Auth) to public.users
- Belongs to one tenant
- Has role: owner, admin, member
- Stores Google Calendar OAuth tokens

**surveys** - Survey templates
- Created by lawyers
- Contains questions as JSONB
- Has status: draft, active, archived
- Belongs to tenant (RLS enforced)

**survey_links** - Unique client links
- One link per survey distribution
- Has unique token (UUID)
- Tracks submission count
- Can expire

**responses** - Client submissions
- Answers stored as JSONB
- AI qualification results as JSONB
- Has status: new, qualified, disqualified, contacted
- Belongs to tenant (RLS enforced)

**appointments** - Scheduled meetings
- Links to response (optional)
- Has lawyer_id (which lawyer)
- Has start/end time
- Syncs with Google Calendar (google_calendar_event_id)
- Has status: scheduled, completed, cancelled

### Row Level Security (RLS)

**All tables protected by RLS policies:**

```sql
-- Users see only their tenant's data
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**Public access for client forms:**
```sql
-- Anyone can view survey by token
CREATE POLICY "Anyone can view survey links by token"
  ON survey_links FOR SELECT
  USING (true);

-- Anyone can submit responses
CREATE POLICY "Anyone can create responses"
  ON responses FOR INSERT
  WITH CHECK (true);
```

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
