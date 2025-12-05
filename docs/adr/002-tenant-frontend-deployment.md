# ADR-002: Tenant Frontend Deployment Strategy

**Status:** Accepted
**Date:** 2025-01-22
**Decision Makers:** Architecture Team
**Tags:** #deployment #vercel #multi-tenancy #scaling

---

## Context

Each tenant in the multi-tenant CMS needs their own public-facing website. We need to decide how to deploy and manage these tenant frontends at scale.

### Requirements

1. **Tenant Isolation** - Each tenant's site must be completely isolated
2. **Custom Domains** - Support for custom domains (e.g., `acme.com`)
3. **Cost Efficiency** - Must scale to 100+ tenants without excessive costs
4. **Easy Updates** - Ability to update all tenants with one deployment
5. **Performance** - Fast deployments and optimal caching

### Constraints

- Using Vercel for hosting
- Using Next.js 15 with App Router
- Each tenant connects to same Supabase instance (multi-tenant DB)
- Budget: Minimize per-tenant infrastructure costs

## Decision

**We will use a single Vercel project with environment-based deployment strategy.**

### Architecture

```
┌─────────────────────────────────────────────┐
│  Vercel Project: tenant-frontend            │
├─────────────────────────────────────────────┤
│                                             │
│  Production Environments:                   │
│  ├── tenant-1 (env: TENANT_ID=uuid-1)      │
│  ├── tenant-2 (env: TENANT_ID=uuid-2)      │
│  └── tenant-3 (env: TENANT_ID=uuid-3)      │
│                                             │
│  Custom Domains:                            │
│  ├── acme.com → tenant-1                   │
│  ├── startup.io → tenant-2                 │
│  └── agency.com → tenant-3                 │
│                                             │
└─────────────────────────────────────────────┘
```

### How It Works

1. **Single Codebase** (`apps/tenant-frontend`)
```typescript
// apps/tenant-frontend/app/page.tsx
export default async function HomePage() {
  const tenantId = process.env.TENANT_ID!;
  const tenant = await getTenant(tenantId);
  const homepage = await getPageBySlug(tenantId, 'home');

  return <LayoutRenderer layout={homepage.layout_data} />;
}
```

2. **Environment Variables per Deployment**
```env
# Tenant 1 Environment
TENANT_ID=550e8400-e29b-41d4-a716-446655440001
TENANT_SLUG=acme
NEXT_PUBLIC_SITE_URL=https://acme.com

# Tenant 2 Environment
TENANT_ID=550e8400-e29b-41d4-a716-446655440002
TENANT_SLUG=startup
NEXT_PUBLIC_SITE_URL=https://startup.io
```

3. **Custom Domains via Vercel**
```bash
# Add custom domain via Vercel CLI
vercel domains add acme.com --project tenant-frontend --target production-tenant-1
```

### Alternatives Considered

#### Alternative 1: One Vercel Project Per Tenant

```
vercel-acme/           (separate repo or monorepo app)
vercel-startup/        (separate repo or monorepo app)
vercel-agency/         (separate repo or monorepo app)
```

**Pros:**
✅ Complete isolation
✅ Independent deployments
✅ Custom configuration per tenant

**Cons:**
❌ **Scaling nightmare** - 100 tenants = 100 Vercel projects
❌ **Update complexity** - Need to deploy to 100 projects for a bug fix
❌ **Higher costs** - Each project counts separately
❌ **Monitoring complexity** - 100 dashboards to check

**Decision: Rejected** - Doesn't scale operationally

#### Alternative 2: Runtime Multi-tenancy (Single Deployment)

```typescript
// Single deployment, tenant ID from domain
export default async function HomePage() {
  const domain = headers().get('host');
  const tenant = await getTenantByDomain(domain);

  return <LayoutRenderer tenant={tenant} />;
}
```

**Pros:**
✅ Simplest deployment (one environment)
✅ Instant updates for all tenants
✅ Lowest cost

**Cons:**
❌ **Performance** - DB lookup on every request
❌ **Caching complexity** - Need to cache per-tenant
❌ **Risk** - Bug affects all tenants at once
❌ **Less flexibility** - Can't deploy different versions per tenant

**Decision: Rejected** - Performance and risk concerns

#### Alternative 3: Serverless per Tenant (Vercel Functions)

Each tenant gets a serverless function that serves their site.

**Pros:**
✅ Auto-scaling
✅ Pay-per-use

**Cons:**
❌ **Cold starts** - Slower initial loads
❌ **Complexity** - Function orchestration
❌ **Not needed** - Static/ISR works better for CMS

**Decision: Rejected** - Overengineered

## Rationale

### Why Environment-Based Strategy Wins

✅ **Scalability**
- 1 project → 100+ environments (Vercel supports this)
- Vercel Team plan: Unlimited environments

✅ **Cost Efficiency**
```
Single project per tenant: 100 tenants × $20/month = $2,000/month
Environment-based:         1 project × $20/month = $20/month
```

✅ **Easy Updates**
```bash
# Update all tenants with single deployment
git push origin main
# Vercel automatically deploys to all environments
```

✅ **Performance**
- Each environment gets its own Edge deployment
- Custom domains point directly to environment
- Full CDN caching per tenant

✅ **Monitoring**
- Single Vercel dashboard
- Filter by environment
- Centralized logging

### Tenant Isolation is Maintained

**Data Isolation:** Supabase RLS policies (tenant_id filter)
```sql
CREATE POLICY "tenant_isolation" ON pages
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id'));
```

**Environment Isolation:** Each tenant has separate env vars
```env
TENANT_ID=unique-per-tenant
```

**Domain Isolation:** Custom domains map 1:1 to environments
```
acme.com → production-tenant-1 (TENANT_ID=uuid-1)
startup.io → production-tenant-2 (TENANT_ID=uuid-2)
```

## Implementation Plan

### Phase 1: Setup Vercel Project (Week 1)

1. **Create Vercel project**
```bash
cd apps/tenant-frontend
vercel --prod
# Project name: cms-tenant-frontend
```

2. **Create environment template**
```bash
# .env.template
TENANT_ID=
TENANT_SLUG=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Phase 2: Automate Tenant Provisioning (Week 5)

**When a new tenant is created in the CMS panel:**

```typescript
// app/actions/tenants.ts
export async function createTenant(data: CreateTenantInput) {
  // 1. Create tenant in database
  const tenant = await db.insert(tenants).values({
    name: data.name,
    slug: data.slug,
    design_tokens: defaultDesignTokens,
  }).returning();

  // 2. Create Vercel environment
  await createVercelEnvironment({
    projectId: process.env.VERCEL_PROJECT_ID!,
    name: `production-${tenant.slug}`,
    environmentVariables: {
      TENANT_ID: tenant.id,
      TENANT_SLUG: tenant.slug,
      NEXT_PUBLIC_SITE_URL: `https://${tenant.slug}.cms-tenants.app`,
    },
  });

  // 3. Trigger deployment
  await triggerVercelDeployment({
    projectId: process.env.VERCEL_PROJECT_ID!,
    target: `production-${tenant.slug}`,
  });

  return tenant;
}
```

**Vercel API Integration:**
```typescript
// lib/vercel-api.ts
import { createClient } from '@vercel/edge-config';

export async function createVercelEnvironment(config: {
  projectId: string;
  name: string;
  environmentVariables: Record<string, string>;
}) {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${config.projectId}/env`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'TENANT_ID',
        value: config.environmentVariables.TENANT_ID,
        type: 'encrypted',
        target: ['production'],
        gitBranch: config.name,
      }),
    }
  );

  return response.json();
}
```

### Phase 3: Custom Domain Management (Week 10)

**Allow tenants to add custom domains:**

```typescript
// app/actions/domains.ts
export async function addCustomDomain(tenantId: string, domain: string) {
  // 1. Validate domain ownership (DNS TXT record)
  const isVerified = await verifyDomainOwnership(domain);
  if (!isVerified) throw new Error('Domain verification failed');

  // 2. Add domain to Vercel
  await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
        gitBranch: `production-${tenantSlug}`,
      }),
    }
  );

  // 3. Save to database
  await db.insert(customDomains).values({
    tenantId,
    domain,
    status: 'pending',
  });
}
```

## Deployment Workflow

### Development
```bash
# Local development (mock tenant)
TENANT_ID=dev-tenant-123 npm run dev
```

### Staging
```bash
# Create staging environment per tenant
vercel --env=preview --env TENANT_ID=uuid-1
```

### Production
```bash
# Deploy to all production environments
git push origin main
# Vercel auto-deploys to all production-* environments
```

### Rollback
```bash
# Rollback single tenant
vercel rollback https://acme.com --prod

# Rollback all tenants
vercel rollback --prod
```

## Monitoring & Observability

### Logs
```typescript
// Vercel automatically tags logs with environment
console.log('[TENANT]', process.env.TENANT_ID, 'Page loaded');

// Query logs per tenant
vercel logs --filter="TENANT_ID=uuid-1"
```

### Analytics
```typescript
// Track per-tenant metrics
import { track } from '@vercel/analytics';

track('page_view', {
  tenant_id: process.env.TENANT_ID,
  page: slug,
});
```

### Alerts
```yaml
# vercel.json
{
  "alerts": {
    "error-rate": {
      "threshold": 5,
      "filter": "environment:production-*"
    }
  }
}
```

## Cost Analysis

### Vercel Pricing (Team Plan: $20/month)

**Included:**
- Unlimited environments ✅
- Unlimited deployments ✅
- 1 TB bandwidth
- 1000 GB-hours serverless execution

**Per-tenant cost breakdown:**

| Tenants | Project Cost | Cost per Tenant |
|---------|--------------|-----------------|
| 10      | $20/month    | $2/tenant       |
| 50      | $20/month    | $0.40/tenant    |
| 100     | $20/month    | $0.20/tenant    |

**Additional costs only if exceeding:**
- Bandwidth > 1 TB/month: $40 per additional TB
- Execution > 1000 GB-hours: $40 per 1000 GB-hours

**Typical usage per tenant:**
- Bandwidth: 10 GB/month
- Execution: 50 GB-hours/month

**Conclusion:** Can support 100 tenants on $20/month plan ✅

## Consequences

### Positive

✅ **10x cost reduction** vs per-tenant projects
✅ **Instant updates** for all tenants
✅ **Simple monitoring** (single dashboard)
✅ **Easy tenant provisioning** (automated via API)
✅ **Custom domains supported**

### Negative

⚠️ **Deployment risk** - Bug affects all tenants
  - *Mitigation:* Staging environment + automated tests

⚠️ **Less flexibility** - Can't deploy different versions per tenant
  - *Mitigation:* Feature flags for per-tenant features

⚠️ **Vercel dependency** - Locked into Vercel platform
  - *Mitigation:* Standard Next.js app, can migrate to other hosts

### Neutral

ℹ️ **Learning curve** - Team needs to learn Vercel API
ℹ️ **Environment management** - Need tooling to manage 100+ environments

## Future Considerations

### Multi-version Support (Phase 7+)

If we need to deploy different versions per tenant:

```typescript
// Option 1: Feature flags
if (await isFeatureEnabled(tenantId, 'new-checkout')) {
  return <NewCheckout />;
} else {
  return <OldCheckout />;
}

// Option 2: Separate projects for beta tenants
vercel-tenant-frontend-beta/  (10% of tenants)
vercel-tenant-frontend/       (90% of tenants)
```

### Edge Functions for Dynamic Routing

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const domain = request.headers.get('host');

  // Redirect to correct environment
  if (domain === 'acme.com') {
    return NextResponse.rewrite(
      new URL('/?tenantId=uuid-1', request.url)
    );
  }
}
```

## References

- [Vercel Environments Documentation](https://vercel.com/docs/concepts/deployments/environments)
- [Vercel API Reference](https://vercel.com/docs/rest-api)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

## Related Decisions

- [ADR-001: Monorepo Structure](./001-monorepo-structure.md)
- [ADR-003: Plugin System Scope](./003-plugin-system-scope.md)

---

**Last Updated:** 2025-01-22
**Reviewed By:** Architecture Team
