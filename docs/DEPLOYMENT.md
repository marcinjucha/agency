# Legal-Mind Deployment Guide

## Vercel Deployment (2 Projects)

Legal-Mind uses a Turborepo monorepo with 2 separate Next.js applications that deploy independently to Vercel.

---

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **GitHub Repository** - Push code to GitHub (already done)
3. **Supabase Project** - Already set up (zsrpdslhnuwmzewwoexr)
4. **Vercel CLI** (optional) - `npm install -g vercel`

---

## Project 1: Website App (Public)

### Setup in Vercel Dashboard

1. **Import Project**
   - Go to https://vercel.com/new
   - Import from GitHub: `legal-mind` repository
   - Project name: `legal-mind-website`

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: apps/website
   Build Command: cd ../.. && npx turbo run build --filter=@legal-mind/website
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   ```bash
   SUPABASE_URL=https://zsrpdslhnuwmzewwoexr.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcnBkc2xobnV3bXpld3dvZXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwOTE4NzcsImV4cCI6MjA0ODY2Nzg3N30.lmykUCOSNUUJP-aVWWP4teSzYMBzbKb0LBIq-lSA_e8
   N8N_WEBHOOK_URL=https://n8n.n8n-mj.freeddns.org/webhook/form-submit
   HOST_URL=https://your-domain.vercel.app
   ```

   **IMPORTANT:** Set for all environments (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Wait for build (~2-3 minutes)
   - Vercel will auto-assign URL: `legal-mind-website.vercel.app`

---

## Project 2: CMS App (Admin Panel)

### Setup in Vercel Dashboard

1. **Import Project**
   - Go to https://vercel.com/new
   - Import SAME GitHub repository: `legal-mind`
   - Project name: `legal-mind-cms`

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: apps/cms
   Build Command: cd ../.. && npx turbo run build --filter=@legal-mind/cms
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://zsrpdslhnuwmzewwoexr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcnBkc2xobnV3bXpld3dvZXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwOTE4NzcsImV4cCI6MjA0ODY2Nzg3N30.lmykUCOSNUUJP-aVWWP4teSzYMBzbKb0LBIq-lSA_e8

   # Supabase Service Role (Get from Supabase Dashboard → Settings → API)
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   # Google Calendar (Setup in Google Cloud Console)
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://your-cms-url.vercel.app/api/auth/google/callback

   # n8n Webhooks
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/form-submit
   N8N_WEBHOOK_BOOKING_URL=https://your-n8n-instance.com/webhook/booking

   # OpenAI (for AI qualification)
   OPENAI_API_KEY=sk-your-openai-key

   # App URL
   NEXT_PUBLIC_APP_URL=https://your-cms-url.vercel.app
   ```

   **IMPORTANT:** Set for all environments (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Wait for build (~2-3 minutes)
   - Vercel will auto-assign URL: `legal-mind-cms.vercel.app`

---

## Domain Configuration (Optional)

### Single Domain Setup (MVP)

**Website:**
- Add custom domain in Vercel: `legalmind.pl`
- DNS: Point A record to Vercel IP

**CMS:**
- Access via Vercel URL: `legal-mind-cms.vercel.app`
- Or add custom domain later

### Multi-Subdomain Setup (Production)

**Website:**
- Domain: `legalmind.pl`
- DNS: A record → Vercel

**CMS:**
- Domain: `app.legalmind.pl`
- DNS: CNAME → `cname.vercel-dns.com`

**Update Environment Variables:**
```bash
# Website
NEXT_PUBLIC_APP_URL=https://legalmind.pl

# CMS
NEXT_PUBLIC_APP_URL=https://app.legalmind.pl
GOOGLE_REDIRECT_URI=https://app.legalmind.pl/api/auth/google/callback
```

---

## Vercel CLI Deployment (Alternative)

### Install Vercel CLI

```bash
npm install -g vercel
```

### Deploy Website

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind
vercel --cwd apps/website

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: legal-mind-website
# - Directory: apps/website (already set by --cwd)
# - Override settings? N

# Production deployment:
vercel --cwd apps/website --prod
```

### Deploy CMS

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind
vercel --cwd apps/cms

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: legal-mind-cms
# - Directory: apps/cms (already set by --cwd)
# - Override settings? N

# Production deployment:
vercel --cwd apps/cms --prod
```

### Pull Environment Variables (After Dashboard Setup)

```bash
# After setting env vars in Vercel Dashboard:
cd apps/website
vercel env pull .env.local

cd apps/cms
vercel env pull .env.local
```

---

## Continuous Deployment

Once linked to GitHub, Vercel will automatically deploy:

**Production Deployments:**
- Push to `main` branch → Auto-deploy to production

**Preview Deployments:**
- Pull Requests → Auto-deploy preview
- Feature branches → Auto-deploy preview

**Environment:**
- Production: Uses Production env vars
- Preview: Uses Preview env vars (if set, otherwise Production)

---

## Post-Deployment Checklist

### Website App
- [ ] Visit deployed URL
- [ ] Check homepage loads
- [ ] Verify Supabase connection (check browser console)
- [ ] Test survey form route `/survey/test-token` (will 404, but route should exist)

### CMS App
- [ ] Visit deployed URL
- [ ] Should redirect to `/login` (middleware working)
- [ ] Try to login (need to create user first - see below)
- [ ] Check `/admin` loads after login
- [ ] Verify Dashboard stats load
- [ ] Check `/admin/surveys` page
- [ ] Test Create Survey button

---

## Creating First User (CMS Access)

Supabase doesn't have users yet. Create one:

### Option 1: Supabase Dashboard

1. Go to https://app.supabase.com/project/zsrpdslhnuwmzewwoexr/auth/users
2. Click "Add User" → "Create new user"
3. Enter email + password
4. Click "Create user"

**IMPORTANT:** Also create record in `users` table:

5. Go to https://app.supabase.com/project/zsrpdslhnuwmzewwoexr/editor
6. Open `users` table
7. Click "Insert" → "Insert row"
8. Fill in:
   ```
   id: [copy from auth.users]
   tenant_id: [create tenant first or use existing]
   email: [same as auth user]
   full_name: Your Name
   role: owner
   ```

### Option 2: SQL Editor

```sql
-- 1. Create tenant
INSERT INTO tenants (name, email)
VALUES ('My Law Firm', 'admin@lawfirm.com')
RETURNING id;

-- 2. Create auth user (via Supabase Auth UI or Dashboard)

-- 3. Link user to tenant
INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  '[auth-user-id]',
  '[tenant-id-from-step-1]',
  'admin@lawfirm.com',
  'Admin User',
  'owner'
);
```

### Option 3: Supabase Auth Signup (Future)

Add signup page at `/signup` in CMS (future feature).

---

## Troubleshooting

### "Error: Invalid API key" or "Failed to fetch"

**Problem:** Environment variables not set correctly

**Solution:**
1. Check Vercel Dashboard → Settings → Environment Variables
2. Ensure all required vars are set
3. Redeploy: Vercel → Deployments → ... → Redeploy

### "Middleware redirect loop"

**Problem:** Middleware redirecting authenticated users incorrectly

**Solution:**
1. Check middleware.ts config.matcher
2. Ensure `/login` is NOT in matcher (it's excluded)
3. Clear browser cookies and try again

### "Database query fails with RLS policy violation"

**Problem:** User not in `users` table or no tenant_id

**Solution:**
1. Check user exists in `users` table (not just auth.users)
2. Verify tenant_id is set
3. Check RLS policies allow user's query

### "Build fails on Vercel but works locally"

**Problem:** Missing dependencies or environment variables

**Solution:**
1. Check build logs in Vercel Dashboard
2. Ensure all packages in package.json
3. Run `npm run build` locally to reproduce
4. Check `transpilePackages` in next.config.ts

---

## Monitoring

### Vercel Analytics

Automatically enabled for all deployments:
- Real User Monitoring (RUM)
- Core Web Vitals
- Error tracking

Access: Vercel Dashboard → Analytics

### Supabase Logs

- Database queries: Supabase Dashboard → Logs → Database
- Auth events: Supabase Dashboard → Logs → Auth
- API calls: Supabase Dashboard → Logs → API

---

## Environment Variables Reference

### Required for Website

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | Supabase Dashboard → Settings → API |
| `N8N_WEBHOOK_URL` | n8n form webhook | n8n instance URL |
| `NEXT_PUBLIC_APP_URL` | Website URL | Vercel deployment URL |

### Required for CMS

All Website variables PLUS:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Secret admin key | Supabase Dashboard → Settings → API (⚠️ Keep secret!) |
| `GOOGLE_CLIENT_ID` | Google OAuth client | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `https://your-cms-url/api/auth/google/callback` |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI Dashboard |
| `N8N_WEBHOOK_BOOKING_URL` | n8n booking webhook | n8n instance URL |

---

## Build Commands Summary

```bash
# Test builds locally before deploying
npm run build

# Build specific app
npx turbo run build --filter=@legal-mind/website
npx turbo run build --filter=@legal-mind/cms

# Deploy with Vercel CLI
vercel --cwd apps/website --prod
vercel --cwd apps/cms --prod
```

---

## Rollback

If deployment fails or has issues:

1. **Via Vercel Dashboard:**
   - Go to Deployments
   - Find previous working deployment
   - Click "..." → "Promote to Production"

2. **Via Git:**
   ```bash
   git revert HEAD
   git push origin main
   # Vercel will auto-deploy reverted version
   ```

---

## Next Steps After Deployment

1. **Test production URLs:**
   - Website: https://legal-mind-website.vercel.app
   - CMS: https://legal-mind-cms.vercel.app

2. **Create first user** (see "Creating First User" above)

3. **Test authentication flow:**
   - Login to CMS
   - View Dashboard
   - Create a survey

4. **Setup custom domains** (optional)

5. **Configure n8n** for webhooks (future)

6. **Setup Google Calendar OAuth** (future)

---

**Last Updated:** 2025-12-05
**Deployment Status:** Ready to deploy
**Apps:** 2 (Website + CMS)
**Database:** Supabase Cloud (deployed)
