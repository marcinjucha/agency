# Supabase Database

This directory contains Supabase configuration and database migrations for Legal-Mind.

## Setup

### Option 1: Use Supabase Cloud (Recommended for production)

1. Create a new project at https://app.supabase.com
2. Go to Project Settings → Database
3. Copy the connection string
4. Run the migration:
   ```bash
   # Connect to your database
   psql "your-connection-string"

   # Or use Supabase SQL Editor
   # Copy and paste the contents of migrations/20250105000001_initial_schema.sql
   ```

5. Get your API credentials:
   - Project URL: Settings → API → Project URL
   - Anon Key: Settings → API → anon/public key
   - Service Role Key: Settings → API → service_role key (keep secret!)

6. Update `.env.local` files in both apps:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # CMS only
   ```

### Option 2: Use Supabase Local (Development)

1. Install Supabase CLI:
   ```bash
   # macOS (if Xcode is updated)
   brew install supabase/tap/supabase

   # Or download binary from:
   # https://github.com/supabase/cli/releases
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

   This will:
   - Start PostgreSQL on port 54322
   - Start Kong API Gateway on port 54321
   - Start GoTrue Auth on port 9999
   - Start Studio UI on http://localhost:54323
   - Automatically run all migrations

3. Get local credentials:
   ```bash
   supabase status
   ```

   Copy the credentials to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
   ```

4. Access Studio UI:
   - Open http://localhost:54323
   - View tables, run queries, manage data

## Database Schema

### Tables

- **tenants**: Law firms (multi-tenant isolation)
- **users**: Lawyers within firms
- **surveys**: Survey templates
- **survey_links**: Unique shareable links with tokens
- **responses**: Client form submissions
- **appointments**: Scheduled meetings

### Row Level Security (RLS)

All tables use RLS policies to enforce multi-tenant isolation:
- Users can only access data from their own tenant
- Survey links are publicly accessible (for client forms)
- Responses and appointments can be created by anyone (anonymous clients)
- Only authenticated users (lawyers) can view/manage responses

### Indexes

Optimized indexes for:
- Tenant-based queries (most common)
- Status filtering (surveys, responses, appointments)
- Time-based queries (appointments by start_time)
- Token lookups (survey_links by token)

## Migrations

### Creating a New Migration

```bash
# Local development
supabase migration new <migration_name>

# Edit the created file in supabase/migrations/
# Then apply it:
supabase db reset  # Applies all migrations from scratch
```

### Applying Migrations to Production

**Option A: Supabase Dashboard (Recommended)**
1. Go to SQL Editor
2. Copy migration content
3. Run the SQL

**Option B: Supabase CLI**
```bash
# Link to your project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

## Generating TypeScript Types

```bash
# After running migrations, generate types:
npm run db:types

# This creates/updates packages/database/src/types.ts
```

Types are automatically imported in apps via `@legal-mind/database`.

## Troubleshooting

### "Supabase CLI not found"

If you can't install via Homebrew, download the binary:
1. Go to https://github.com/supabase/cli/releases
2. Download for your OS
3. Add to PATH

### "Connection refused" when using local Supabase

```bash
# Check if Supabase is running
docker ps

# If not, start it
supabase start

# If ports are already in use, stop other services or change ports in config.toml
```

### "RLS policy violation"

- Make sure user is authenticated
- Check that `auth.uid()` returns the correct user ID
- Verify user's `tenant_id` matches the resource's `tenant_id`

## Security Notes

- **NEVER commit** `.env.local` files (they're in `.gitignore`)
- **NEVER commit** `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- Use `anon` key for client-side (respects RLS)
- Use `service_role` key only server-side for admin operations

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development)
- [TypeScript Types](https://supabase.com/docs/guides/api/generating-types)
