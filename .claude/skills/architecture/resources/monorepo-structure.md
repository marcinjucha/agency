# ADR-001: Monorepo Structure (Turborepo)

## Decision

Use Turborepo-based monorepo with:
- 2 Next.js applications (`apps/website`, `apps/cms`)
- 3 shared packages (`ui`, `database`, `validators`)

## Project Structure

```
agency/
├── turbo.json
├── package.json
│
├── apps/
│   ├── website/              # PUBLIC app (no auth)
│   │   ├── app/
│   │   │   ├── (marketing)/  # Landing page routes
│   │   │   └── survey/[token]/
│   │   └── features/
│   │
│   └── cms/                  # ADMIN app (auth required)
│       ├── app/
│       │   ├── login/
│       │   └── admin/
│       ├── features/
│       └── middleware.ts
│
├── packages/
│   ├── ui/                   # Shared shadcn/ui
│   ├── database/             # Supabase types
│   └── validators/           # Zod schemas
│
└── supabase/
    └── migrations/
```

## Why Turborepo?

| Feature | Turborepo | Alternatives |
|---------|-----------|--------------|
| Build Caching | ✅ Remote + Local | Nx: ✅, Lerna: ❌ |
| Parallel Tasks | ✅ Optimal | Nx: ✅, Lerna: ⚠️ |
| DX Simplicity | ✅ Excellent | Nx: ⚠️ Complex |
| Next.js Integration | ✅ First-class | Others: Manual |
| Vercel Integration | ✅ Native | Others: Manual |

## Commands

```bash
# Start all apps
npm run dev

# Build all apps
npm run build

# Build specific app
turbo build --filter=@agency/website
turbo build --filter=@agency/cms

# Run tests
npm run test

# Lint
npm run lint
```

## Package Configuration

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

```json
// Root package.json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

## Benefits

- **10x faster builds** with caching
- **Consistent versioning** across packages
- **Simplified deployment** (Vercel detects changes)
- **Type safety** across packages
- **Single repo** to clone and manage

## Deployment

Each app deploys separately to Vercel:
- `apps/website` → `agency-website.vercel.app`
- `apps/cms` → `agency-cms.vercel.app`

Changes to CMS don't trigger website rebuild, and vice versa.
