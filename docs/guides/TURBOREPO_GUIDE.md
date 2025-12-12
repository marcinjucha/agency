# Turborepo Deep Dive - Legal-Mind Implementation

Praktyczny przewodnik zrozumienia Turborepo i monorepo na bazie rzeczywistego kodu Legal-Mind.

---

## Spis treści

1. [Co to jest Turborepo?](#co-to-jest-turborepo)
2. [Architektura Legal-Mind](#architektura-legal-mind)
3. [Workspace Structure](#workspace-structure)
4. [Task Pipeline](#task-pipeline)
5. [Packages & Apps](#packages--apps)
6. [Shared Code & Imports](#shared-code--imports)
7. [Build & Deploy](#build--deploy)
8. [Development Workflow](#development-workflow)
9. [Performance & Caching](#performance--caching)
10. [Troubleshooting](#troubleshooting)

---

## Co to jest Turborepo?

**Turborepo = Tool do zarządzania monorepo (wiele aplikacji w jednym repo)**

### Problem bez Turborepo

```
Project Structure:
├─ website/
│  ├─ node_modules/ (Duży!)
│  ├─ build scripts
│  └─ dependencies
├─ cms/
│  ├─ node_modules/ (Duży!)
│  ├─ build scripts (Powtórzony kod!)
│  └─ dependencies (Wspólne!)

Problemy:
❌ Duplikacja zależności (React 2x, Next 2x)
❌ Brak współdzielenia kodu
❌ Duplikacja build scriptów
❌ Trudne w deploymencie
```

### Rozwiązanie: Turborepo

```
Legal-Mind Structure:
├─ root/
│  ├─ package.json (Workspace definicja)
│  ├─ turbo.json (Pipeline)
│  ├─ node_modules/ (Jeden raz!)
│  │
│  ├─ apps/
│  │  ├─ website/ (Next.js)
│  │  └─ cms/ (Next.js)
│  │
│  └─ packages/
│     ├─ ui/ (Shared components)
│     ├─ database/ (Shared types)
│     └─ validators/ (Shared schemas)

Korzyści:
✅ Jedna node_modules (wspólne dependencje)
✅ Współdzielenie kodu (packages/)
✅ Shared build cache (szybsze buildy)
✅ Prosty multipl development
✅ Atomowe deploymenty
```

### Wspólne Dependencje

```
Zainstalowano raz (root node_modules):
├─ next@16.0.7 (używany przez website i cms)
├─ react@19.2.0 (używany przez website, cms, ui)
├─ tailwindcss@4.0 (używany przez website, cms, ui)

Zamiast:
❌ apps/website/node_modules/react
❌ apps/cms/node_modules/react
❌ packages/ui/node_modules/react

✅ node_modules/react (jeden raz, dzielony!)
```

---

## Architektura Legal-Mind

### Diagram

```
┌─────────────────────────────────────────────┐
│          root/                              │
│  ┌────────────────────────────────────────┐ │
│  │ package.json (workspaces)              │ │
│  │ turbo.json (pipeline)                  │ │
│  │ package-lock.json (all deps)           │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ node_modules/ (wspólne pakiety)        │ │
│  │ ├─ react, next, zod, tailwindcss, ... │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────┬──────────────────────┐ │
│  │    apps/        │     packages/        │ │
│  │                 │                      │ │
│  │ ┌─────────┐     │ ┌──────────────────┐ │ │
│  │ │website  │     │ │ ui               │ │ │
│  │ │port 3000│     │ │ (components)     │ │ │
│  │ │(public) │     │ └──────────────────┘ │ │
│  │ └─────────┘     │                      │ │
│  │                 │ ┌──────────────────┐ │ │
│  │ ┌─────────┐     │ │ database         │ │ │
│  │ │cms      │     │ │ (Supabase types) │ │ │
│  │ │port 3001│     │ └──────────────────┘ │ │
│  │ │(admin)  │     │                      │ │
│  │ └─────────┘     │ ┌──────────────────┐ │ │
│  │                 │ │ validators       │ │ │
│  │                 │ │ (Zod schemas)    │ │ │
│  │                 │ └──────────────────┘ │ │
│  └─────────────────┴──────────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
```

### Zależności

```
Dependency graph:

website → [@legal-mind/ui, @legal-mind/database, @legal-mind/validators]
cms → [@legal-mind/ui, @legal-mind/database, @legal-mind/validators]

Packages nie zależą od app (One-way dependency!)

Aktualizacja pakietu automatycznie użyta w obu apkach
```

---

## Workspace Structure

### Root package.json

```json
{
  "name": "legal-mind",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "dev:website": "turbo run dev --filter=@legal-mind/website",
    "dev:cms": "turbo run dev --filter=@legal-mind/cms"
  },
  "packageManager": "npm@10.0.0"
}
```

### Wyjaśnienie Workspace

```
"workspaces": ["apps/*", "packages/*"]

Oznacza:
├─ apps/website/package.json → @legal-mind/website
├─ apps/cms/package.json → @legal-mind/cms
├─ packages/ui/package.json → @legal-mind/ui
├─ packages/database/package.json → @legal-mind/database
└─ packages/validators/package.json → @legal-mind/validators

Każdy folder z package.json jest workspace-em
Nazwa w "name" field to @legal-mind/XXX
```

### Turbo.json - Pipeline

```json
{
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "N8N_WEBHOOK_URL"
  ],
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "clean": { "cache": false }
  }
}
```

### Task Pipeline Explained

```
"dev": { "cache": false, "persistent": true }
├─ cache: false → Don't cache (dev is live)
└─ persistent: true → Runs forever (watch mode)

"build": { "dependsOn": ["^build"], "outputs": [...] }
├─ dependsOn: ["^build"] → Run build in dependencies FIRST
│  └─ ^ = dependencies (website/cms must build packages first)
├─ outputs: [".next/**", "dist/**"] → Cache these
└─ Caching: Next build cached after first run

"lint": { "dependsOn": ["^lint"] }
├─ Run lint in packages first
├─ Then run lint in apps

"test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] }
├─ Must build first
└─ Then run tests

"clean": { "cache": false }
└─ Always run (don't cache clean)
```

### Dependency Symbol (^)

```
"dependsOn": ["^build"]

^ = Caret = Dependencies, not this package

Semantic:
├─ "build" → Run build in this package (no dep needed)
├─ "^build" → Run build in this package's dependencies FIRST
└─ "layout" → Task in this package with "build" dependency

Example for CMS:
turbo run build --filter=@legal-mind/cms

Executes:
1. turbo run build --filter=@legal-mind/ui (dependency)
2. turbo run build --filter=@legal-mind/database (dependency)
3. turbo run build --filter=@legal-mind/validators (dependency)
4. turbo run build --filter=@legal-mind/cms (the app itself)
```

---

## Packages & Apps

### Shared Package: @legal-mind/ui

```typescript
// packages/ui/src/index.ts
export { Button } from './components/ui/button'
export { Input } from './components/ui/input'
export { Card, CardHeader, CardContent } from './components/ui/card'
export { cn } from './lib/utils'

// Usage in apps:
import { Button } from '@legal-mind/ui'

// No relative imports needed!
```

**Benefits:**

```
Single source of truth for UI
├─ Update button style once
├─ Changes in both website and cms
├─ Consistent design system

Type-safe
├─ Full TypeScript support
├─ IDE autocomplete

Versioning
├─ Change version when updating UI
├─ Can pin specific versions (if needed)
```

### Shared Package: @legal-mind/database

```typescript
// packages/database/src/types.ts
// Auto-generated from Supabase
export type Survey = Tables<'surveys'>
export type Response = Tables<'responses'>
export type Appointment = Tables<'appointments'>

// packages/database/src/index.ts
export * from './types'

// Usage in apps:
import type { Survey, Response } from '@legal-mind/database'

const survey: Survey = { id: '...', title: '...', ... }
```

**Benefits:**

```
Single source of truth for types
├─ Regenerate once: npm run db:types
├─ Automatically used in all apps
└─ No manual type copying

Type sync with database
├─ Schema changes → Types update
├─ Compile-time safety

Reduces duplication
├─ No copying types between apps
└─ One package.json for Supabase deps
```

### Shared Package: @legal-mind/validators

```typescript
// packages/validators/src/survey.ts
import { z } from 'zod'

export const SurveySchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  questions: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'email', 'select', ...]),
    label: z.string(),
    required: z.boolean(),
  })),
})

// Usage in apps:
import { SurveySchema } from '@legal-mind/validators'

const validated = SurveySchema.parse(data)
```

**Benefits:**

```
Consistent validation
├─ Website validates same as CMS
├─ Single source of truth
└─ Schema reusable

Type safety
├─ Extract type from schema
├─ Form typing automatic
└─ Database typing aligned
```

---

## Shared Code & Imports

### Import Pattern 1: Direct Package Import

```typescript
// In apps/website or apps/cms
import { Button } from '@legal-mind/ui'
import type { Survey } from '@legal-mind/database'
import { SurveySchema } from '@legal-mind/validators'
```

### Import Pattern 2: Path Aliases

```typescript
// In apps/website/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

// Usage:
import { SurveyList } from '@/features/surveys/components/SurveyList'
// Not: import from '../../../features/surveys/...'
```

### Import Pattern 3: Local Features

```typescript
// Each app has its own features/ folder
apps/website/
├─ features/
│  ├─ survey/ (website-specific survey form)
│  └─ marketing/ (website-specific pages)

apps/cms/
├─ features/
│  ├─ surveys/ (cms-specific survey management)
│  ├─ responses/ (cms-specific response handling)
│  └─ calendar/ (cms-specific calendar)

// Features are NOT shared (different UI/logic)
// Only packages/ are shared
```

### Dependency Resolution

```
Import resolution order:

1. Local folder (features/surveys/)
2. node_modules/@legal-mind/ui → packages/ui/src/
3. node_modules/react → root/node_modules/react
4. Alias paths (@/*)

Example:
import { Button } from '@legal-mind/ui'

Resolves to:
root/node_modules/@legal-mind/ui/src/index.ts
  ↓
packages/ui/src/index.ts (via npm workspace)
```

---

## Build & Deploy

### Local Development: npm run dev

```bash
npm run dev

What happens:
1. Root turbo.json reads
2. Task: "dev" → cache: false, persistent: true
3. Runs in parallel (for all workspaces):
   ├─ Next.js website (port 3000)
   ├─ Next.js cms (port 3001)
   └─ Watches for changes

Result:
✅ Two apps running simultaneously
✅ Shared packages reloaded on changes
✅ HMR (hot module replacement) works
```

### Single App Development: npm run dev:cms

```bash
npm run dev:cms

What happens:
1. turbo run dev --filter=@legal-mind/cms
2. Only CMS Next.js process starts (port 3001)
3. Website not running (faster startup)

Why use this:
├─ Faster startup (only one app)
├─ Lower resource usage
├─ Focused development
```

### Build: npm run build

```bash
npm run build

Pipeline execution:

1. Read turbo.json
2. For each workspace in dependency order:
   ├─ packages/ui: run build (outputs: dist/)
   ├─ packages/database: run build (outputs: dist/)
   ├─ packages/validators: run build (outputs: dist/)
   ├─ apps/website: run build (outputs: .next/)
   └─ apps/cms: run build (outputs: .next/)

3. Cache outputs:
   ├─ First run: Full build (slow)
   ├─ Second run: Incremental (fast)
   └─ Only changed packages rebuilt

Why fast:
✅ Parallel builds (multiple workspaces at once)
✅ Caching (unchanged packages skipped)
✅ Smart dependency resolution (correct order)
```

### Build Output

```
Root structure after build:

├─ packages/
│  ├─ ui/
│  │  ├─ src/
│  │  └─ dist/ ← Compiled JS
│  ├─ database/
│  │  ├─ src/
│  │  └─ dist/ ← Compiled JS
│  └─ validators/
│     ├─ src/
│     └─ dist/ ← Compiled JS
│
├─ apps/
│  ├─ website/
│  │  ├─ app/
│  │  └─ .next/ ← Next.js build
│  └─ cms/
│     ├─ app/
│     └─ .next/ ← Next.js build

.next/ files deployed to Vercel
dist/ files used by Next.js (via transpilePackages)
```

### Deployment: Vercel

```
Two independent deployments:

Website Deployment:
1. Git push to main
2. Vercel detected change in apps/website/
3. Vercel runs: npm run build:website
   └─ turbo run build --filter=@legal-mind/website
4. Dependencies built automatically
5. .next/ uploaded to Vercel
6. Deployed to legal-mind-website.vercel.app

CMS Deployment:
1. Git push to main
2. Vercel detected change in apps/cms/
3. Vercel runs: npm run build:cms
   └─ turbo run build --filter=@legal-mind/cms
4. Dependencies built automatically
5. .next/ uploaded to Vercel
6. Deployed to legal-mind-cms.vercel.app

Benefits:
✅ Only changed app redeployed
✅ If only packages/ changed, both redeployed
✅ Atomic deployments (both succeed or both fail)
✅ Fast incremental builds (caching)
```

---

## Development Workflow

### Scenario 1: Modify Component in UI Package

```bash
1. Edit packages/ui/src/components/ui/button.tsx
2. npm run dev (already running)
3. HMR triggers:
   ├─ Button component recompiled
   ├─ Both apps (website, cms) see change
   ├─ Browser hot-reloads
4. Result: Instant update in both apps!
```

### Scenario 2: Add New Component to UI

```bash
1. Create packages/ui/src/components/ui/new-component.tsx
2. Export in packages/ui/src/index.ts
3. In apps/cms/...
   import { NewComponent } from '@legal-mind/ui'
   // IDE autocomplete works!
4. No build step needed (npm run dev transpiles)
```

### Scenario 3: Modify Feature (Feature is specific to app)

```bash
# Website feature:
1. Edit apps/website/features/survey/queries.ts
2. Only website app affected
3. CMS doesn't need to recompile

# CMS feature:
1. Edit apps/cms/features/surveys/components/SurveyList.tsx
2. Only cms app affected
3. Website doesn't need to recompile
```

### Scenario 4: Update Supabase Schema

```bash
1. Make change in Supabase (add column to surveys table)
2. Run: npm run db:types
3. Regenerates: packages/database/src/types.ts
4. Both apps automatically use new types!
5. TypeScript errors if using old schema
6. Force update everywhere at once
```

---

## Performance & Caching

### Turbo Cache

```
First run: npm run build
├─ Compiles all packages
├─ Compiles all apps
└─ Takes ~60-90 seconds

Second run: npm run build (no changes)
├─ Uses cache
├─ Verifies hashes
└─ Takes ~5-10 seconds ✅

Incremental run: npm run build (one package changed)
├─ Only affected package rebuilt
├─ Dependent apps rebuilt
├─ Takes ~20-30 seconds
```

### What Gets Cached

```json
{
  "build": {
    "outputs": [".next/**", "!.next/cache/**", "dist/**"]
  }
}

Cached:
✅ .next/ (Next.js build output)
✅ dist/ (Package compiled output)

NOT cached:
❌ .next/cache/** (Next.js incremental cache)
❌ node_modules/ (too large)
❌ .turbo/ (Turbo's own cache)
```

### Cache Location

```
Local development:
.turbo/cache/ → Local disk cache

CI/CD (GitHub Actions, Vercel):
Turbo Remote Caching (optional)
├─ Save cache to remote
├─ Share across CI runs
└─ Faster deploys
```

---

## Troubleshooting

### Problem: Dependency Not Found

```typescript
// ❌ ERROR: Cannot find module '@legal-mind/ui'

// Solution 1: Verify workspace name
// packages/ui/package.json
"name": "@legal-mind/ui"  // Must be exact!

// Solution 2: Check root package.json
"workspaces": ["apps/*", "packages/*"]  // Must include packages!

// Solution 3: Reinstall
npm install  // Recreates node_modules symlinks
```

### Problem: TypeScript Can't Find Types

```typescript
// ❌ ERROR: Cannot find module '@legal-mind/database'

// Solution: Check next.config.ts
transpilePackages: [
  '@legal-mind/ui',
  '@legal-mind/database',
  '@legal-mind/validators'
]  // All packages must be listed!
```

### Problem: Build Fails in CI but Works Locally

```bash
# ❌ CI build fails (but npm run build works locally)

# Solution 1: Clear cache
npm run clean
npm install
npm run build

# Solution 2: Check env vars
# turbo.json globalEnv section
# CI must provide all listed env vars

# Solution 3: Check filtered build
turbo run build --filter=@legal-mind/cms
# If fails, the app has issue
```

### Problem: Package Changes Not Reflecting

```bash
# ❌ Edited packages/ui/button.tsx but apps don't see change

# Solution 1: Dev mode already running
npm run dev  # Should auto-reload

# Solution 2: Force reload
# Stop dev, run:
npm run clean
npm run dev

# Solution 3: Check if exported
packages/ui/src/index.ts
export { Button } from './components/ui/button'  // Must export!
```

### Problem: Circular Dependencies

```typescript
// ❌ Problem: packages/ui imports from apps/cms

// WRONG structure:
packages/ui → import from apps/cms (circular!)

// CORRECT structure:
apps/cms → import from packages/ui (one-way only!)

// Solution: Move shared code to packages/
// If ui needs something from cms:
// 1. Move to packages/
// 2. Both import from packages/
// 3. Breaks circularity
```

---

## Best Practices Checklist

```
□ All shared code in packages/, not apps/
□ packages/ don't depend on apps/ (one-way)
□ Import via @legal-mind/XXX (not relative)
□ Next.js transpilePackages updated when adding package
□ Environment variables in turbo.json globalEnv
□ Build outputs defined in turbo.json
□ Run npm run db:types after schema changes
□ Use --filter for single app development
□ Check turbo.json dependency order
□ Don't commit .turbo/ or dist/ or .next/
□ Use workspaces in root package.json
□ Run npm install in root, not per app
```

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start all apps
npm run dev:website           # Start website only
npm run dev:cms              # Start CMS only

# Building
npm run build                 # Build all
npm run build:website         # Build website only
npm run build:cms            # Build CMS only

# Maintenance
npm run clean                 # Remove build output
npm run lint                  # Lint all
npm run db:types            # Update database types

# Specific workspace
turbo run build --filter=@legal-mind/ui
turbo run dev --filter=@legal-mind/cms
```

---

## Summary: Why Monorepo is Worth It

```
Before (Separate Repos):
├─ website/ repo
├─ cms/ repo
├─ shared-ui/ repo
└─ shared-types/ repo

Problems:
❌ Version sync hell
❌ Update one package everywhere
❌ No atomic deployments
❌ More CI/CD complexity

After (Monorepo):
├─ One repo (everything)
├─ Shared packages/
├─ Atomic deployments
└─ Single npm install

Benefits:
✅ Easy code sharing
✅ Atomic changes
✅ One CI/CD pipeline
✅ Faster local dev
✅ Single dependency tree
✅ Easy refactoring
```

---

Ostatnia aktualizacja: 2025-12-12
