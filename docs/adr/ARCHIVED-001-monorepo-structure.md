# ADR-001: Monorepo Structure with Turborepo

---
**⚠️ ARCHIVED - Historical Reference Only**

This ADR is from the **Multi-tenant CMS project** (pre-Agency) and is kept for historical context.

**Why archived:**
- Written for different project (CMS Panel + Tenant Frontends)
- Agency uses similar patterns but simpler implementation
- Concepts valuable, examples not directly applicable

**Current ADRs:** See [/docs/adr/](.) for Agency architecture decisions.
---

**Status:** Accepted
**Date:** 2025-01-22
**Decision Makers:** Architecture Team
**Tags:** #architecture #monorepo #turborepo

---

## Context

The Multi-tenant CMS consists of multiple applications that share significant amounts of code:
- **CMS Panel** - Admin interface for managing content
- **Tenant Frontends** - Public-facing websites for each tenant
- **Shared Libraries** - Layout renderer, theme system, plugin system, UI components

Without proper code organization, we risk:
- Code duplication across apps
- Inconsistent versioning
- Difficult atomic changes across multiple packages
- Complex deployment coordination

## Decision

**We will use a Turborepo-based monorepo structure** with the following organization:

```
cms/
├── apps/
│   ├── cms-panel/           # Next.js 15 - Admin panel
│   └── tenant-frontend/     # Next.js 15 - Tenant sites template
│
├── packages/
│   ├── ui/                  # Shared UI components (Shadcn/ui)
│   ├── layout-renderer/     # Layout rendering engine
│   ├── theme/               # Theme system
│   ├── plugins/             # Plugin system
│   ├── database/            # Supabase types & queries
│   └── config/              # Shared configs (ESLint, TS, Tailwind)
│
├── supabase/                # Database migrations & config
├── turbo.json              # Turborepo configuration
└── package.json            # Root package.json
```

### Why Turborepo over alternatives?

**Alternatives considered:**
1. **Polyrepo** (separate repositories)
2. **Nx Monorepo**
3. **Lerna**
4. **Yarn/npm Workspaces only**

**Comparison:**

| Feature | Turborepo | Nx | Lerna | Workspaces Only |
|---------|-----------|-----|-------|-----------------|
| **Build Caching** | ✅ Remote + Local | ✅ Remote + Local | ❌ No | ❌ No |
| **Parallel Tasks** | ✅ Optimal | ✅ Good | ⚠️ Limited | ❌ Manual |
| **DX Simplicity** | ✅ Excellent | ⚠️ Complex | ⚠️ Dated | ✅ Simple |
| **Next.js Integration** | ✅ First-class | ✅ Good | ⚠️ Manual | ⚠️ Manual |
| **Learning Curve** | ✅ Low | ⚠️ Steep | ⚠️ Medium | ✅ Minimal |
| **Vercel Integration** | ✅ Native | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |

## Rationale

### Benefits of Monorepo

✅ **Code Sharing**
- `@cms/layout-renderer` used by both panel (preview) and tenant sites (production)
- `@cms/theme` generates CSS variables for both apps
- `@cms/ui` provides consistent components

✅ **Atomic Changes**
```bash
# Single commit updates both apps
git commit -m "feat: add new Hero component"
# Changes:
# - packages/ui/src/Hero.tsx (new component)
# - apps/cms-panel/components/layout-builder/palette.tsx (add to palette)
# - apps/tenant-frontend/lib/component-registry.ts (register for rendering)
```

✅ **Simplified Dependencies**
- No need to publish internal packages to npm
- No version mismatches between packages
- TypeScript types work seamlessly

✅ **Unified Tooling**
```json
// Single command for all apps
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "test": "turbo run test",
  "lint": "turbo run lint"
}
```

### Benefits of Turborepo Specifically

✅ **Remote Caching** (Vercel)
- First build: 5 minutes
- Cached build: 30 seconds
- Share cache across team

✅ **Incremental Builds**
```bash
# Only rebuilds affected packages
turbo build --filter=cms-panel...
# If @cms/theme didn't change, skips rebuild
```

✅ **Pipeline Optimization**
```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],  // Build dependencies first
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": false
    }
  }
}
```

✅ **Vercel Deployment Integration**
```bash
# Vercel automatically detects Turborepo
# Deploys only changed apps
vercel --prod
```

## Implementation Plan

### Phase 1: Initialize Monorepo (Week 1)

1. **Create root structure**
```bash
mkdir cms-monorepo && cd cms-monorepo
npm install turbo --save-dev
npx create-turbo@latest
```

2. **Setup apps**
```bash
cd apps
npx create-next-app@latest cms-panel --typescript --tailwind --app
npx create-next-app@latest tenant-frontend --typescript --tailwind --app
```

3. **Create packages**
```bash
cd packages
mkdir -p ui layout-renderer theme plugins database config
```

4. **Configure Turborepo**
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

5. **Setup package.json**
```json
{
  "name": "cms-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### Phase 2: Migrate Shared Code (Week 2)

1. Extract shared UI components → `packages/ui`
2. Extract layout renderer logic → `packages/layout-renderer`
3. Extract theme system → `packages/theme`
4. Setup internal imports (`@cms/*`)

### Phase 3: CI/CD Integration (Week 3)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx turbo run build

      - name: Test
        run: npx turbo run test

      - name: Lint
        run: npx turbo run lint
```

## Consequences

### Positive

✅ **10x faster builds** with caching
✅ **Consistent versioning** across all packages
✅ **Simplified deployment** (Vercel detects changes)
✅ **Better DX** (single repo to clone)
✅ **Type safety** across packages

### Negative

⚠️ **Initial setup complexity** (Week 1 overhead)
⚠️ **Larger repository size** (more files in one repo)
⚠️ **Learning curve for team** (Turborepo concepts)

### Neutral

ℹ️ **CI/CD times may increase** for full builds (mitigated by caching)
ℹ️ **Git history shared** (can't split repos later easily)

## Migration Path

### Current State
```
cms/                    # Room of Code (existing)
```

### Target State
```
cms-monorepo/
├── apps/
│   ├── cms-panel/
│   └── tenant-frontend/
└── packages/
    └── ...
```

### Migration Strategy

**Option A: Fresh Start** (Recommended)
- Create new repo `cms-monorepo`
- Copy relevant code as packages are created
- Clean slate, no legacy baggage

**Option B: In-place Migration**
- Restructure existing `cms/` repo
- Risk: mixing Room of Code with new CMS

**Decision: Option A** - Clean separation of concerns

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Vercel Monorepo Guide](https://vercel.com/docs/concepts/monorepos)
- [Next.js Monorepo Example](https://github.com/vercel/turborepo/tree/main/examples/with-nextjs)

## Related Decisions

- [ADR-002: Tenant Frontend Deployment Strategy](./002-tenant-frontend-deployment.md)
- [ADR-004: Layout Builder State Management](./004-layout-builder-state.md)

---

**Last Updated:** 2025-01-22
**Reviewed By:** Architecture Team
