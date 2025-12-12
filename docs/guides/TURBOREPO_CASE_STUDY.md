# Turborepo Case Study - Legal-Mind Real Code Analysis

Analiza rzeczywistych implementacji Turborepo w Legal-Mind z wyjaśnieniami każdej linii.

---

## Case 1: Root package.json - Workspace Definition

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/package.json`

```json
{
  "name": "legal-mind",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "dev:website": "turbo run dev --filter=@legal-mind/website",
    "dev:cms": "turbo run dev --filter=@legal-mind/cms",
    "build:website": "turbo run build --filter=@legal-mind/website",
    "build:cms": "turbo run build --filter=@legal-mind/cms",
    "db:reset": "cd supabase && supabase db reset",
    "db:types": "supabase gen types typescript --local > packages/database/src/types.ts"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "@turbo/gen": "^2.0.0"
  },
  "packageManager": "npm@10.0.0",
  "engines": { "node": ">=18.0.0" }
}
```

### Wyjaśnienie po linii

```
"workspaces": ["apps/*", "packages/*"]

Oznacza:
├─ apps/website/package.json → Workspace
├─ apps/cms/package.json → Workspace
├─ packages/ui/package.json → Workspace
├─ packages/database/package.json → Workspace
└─ packages/validators/package.json → Workspace

Efekt npm install:
├─ Czyta każdy package.json
├─ Zbiera wszystkie dependencje
├─ Tworzy jeden node_modules/ w root
├─ Tworzy symlinki dla packages/
│  └─ node_modules/@legal-mind/ui → packages/ui/src
└─ Wszystko dzielone!

Jeśli każdy miał swoje node_modules:
❌ apps/website/node_modules/react (React raz)
❌ apps/cms/node_modules/react (React dwa razy!)
❌ packages/ui/node_modules/react (React trzy razy!)
❌ Duże, powolne, dupolikacja

Z workspaces:
✅ node_modules/react (jeden raz!)
✅ Mały, szybki, brak duplikacji
```

### Scripts Analysis

```typescript
"dev": "turbo run dev"
├─ Turbo czyta turbo.json
├─ Znajduje "dev" task
├─ Wykonuje w KAŻDYM workspace-ie
├─ apps/website: next dev (port 3000)
├─ apps/cms: next dev --port 3001
└─ Oba działają jednocześnie

"dev:cms": "turbo run dev --filter=@legal-mind/cms"
├─ --filter: Tylko CMS
├─ Zależy: packages/ui, packages/database, packages/validators
│  └─ Ale ci nie uruchamiają dev (nie mają dev task)
├─ Wynik: Tylko CMS dev process
└─ Szybciej niż pełny dev!

"build:website": "turbo run build --filter=@legal-mind/website"
├─ Build tylko website
├─ Ale najpierw: build dependencies
├─ Pipeline: database → validators → ui → website
├─ Każdy waits for previous
└─ Deterministic build order
```

### packageManager Enforcement

```json
"packageManager": "npm@10.0.0"

Oznacza:
├─ Projektu musi użyć npm@10.0.0
├─ Nie: yarn, pnpm, czy inne
├─ npm try npm install → error jeśli zła wersja
└─ Consistent tooling across team
```

---

## Case 2: turbo.json - Pipeline Configuration

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "N8N_WEBHOOK_URL",
    "N8N_WEBHOOK_BOOKING_URL",
    "HOST_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "OPENAI_API_KEY"
  ],
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "clean": { "cache": false }
  }
}
```

### globalDependencies

```
"globalDependencies": ["**/.env.*local"]

Oznacza:
├─ Jeśli .env.local zmieni się
├─ Invalidate ALL cache
├─ Rebuild wszystko (env variables ważne!)
├─ Zapewnia consistency
└─ Performance hit: ale correctness waży więcej

Bez tego:
❌ Zmienisz .env.local
❌ Turbo nie wie że zmiana była
❌ Staric cachem
❌ Błędna konfiguracja w buildie!

Z tym:
✅ .env.local zmieniony
✅ Cache invalidated
✅ Build z nową konfiguracją
✅ Zawsze correct
```

### globalEnv

```
"globalEnv": [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  ...
]

Oznacza:
├─ Te env variables wpływają na build
├─ Zmiana wartości → cache miss
├─ Turbo zawiera wartości w hash
├─ Inne env variables nie invalidate cache
└─ Optymizacja: mniej rebuilds

Example:
1. Build z: SUPABASE_URL=http://localhost:54321
2. Cache: hash zawiera tą wartość
3. Zmień: SUPABASE_URL=production-url.com
4. Turbo vidi zmianę
5. Hash nie match → rebuild

Vs bez globalEnv:
❌ CI_BUILD_ID=123 zmieni się
❌ Ale nie wpływa na output
❌ Chcesz cache hit
❌ Za mało invalidate
```

### Task: dev

```json
"dev": { "cache": false, "persistent": true }

cache: false
├─ Nie cachuj dev proces
├─ Dev = watch mode (watch changes)
├─ Każdy run different
└─ Cachowanie by bezużyteczne

persistent: true
├─ Proces nigdy się nie kończy
├─ Turbo czeka na niego
├─ Nie exit po ukończeniu
└─ next dev --watch

Przy npm run dev:
1. Turbo start dev task
2. Persistent: true
3. Next dev starts
4. Watches for changes
5. Turbo nie kończy
6. User ctrl+c aby stop
```

### Task: build

```json
"build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] }

dependsOn: ["^build"]
├─ ^ = dependencies
├─ Run build w dependencies FIRST
├─ Dann run build in this workspace
├─ Ensures correct order

Dla cms:
1. cms depends on: ui, database, validators
2. turbo run build --filter=cms
3. Sequence:
   ├─ database build (no deps)
   ├─ validators build (no deps)
   ├─ ui build (depends on database)
   ├─ cms build (depends on all)
   └─ All serial wait for previous

outputs: [".next/**", "!.next/cache/**", "dist/**"]
├─ .next/** → Cache Next.js build
├─ !.next/cache/** → EXCEPT cache (too large)
├─ dist/** → Cache package builds
└─ Turbo saves these files

First build: 60-90 seconds
├─ Compiles everything
├─ Saves outputs to cache

Second build: 5-10 seconds
├─ Finds cached outputs
├─ Restores them
├─ Massive speedup!
```

### Task: lint

```json
"lint": { "dependsOn": ["^lint"] }

dependsOn: ["^lint"]
├─ Lint in dependencies first
├─ Then lint this workspace
├─ Logical consistency
└─ Catch errors in packages before apps

Sequence:
1. packages/ui lint
2. packages/database lint
3. packages/validators lint
4. apps/website lint
5. apps/cms lint

Why:
├─ If package has error
├─ Don't bother linting app
├─ Fix package first
├─ Depends on it anyway
```

---

## Case 3: Apps - Workspace Definitions

### Website package.json

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/package.json`

```json
{
  "name": "@legal-mind/website",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "next": "16.0.7",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "@legal-mind/ui": "*",
    "@legal-mind/database": "*",
    "@legal-mind/validators": "*"
  }
}
```

### Analiza

```
"name": "@legal-mind/website"

Oznacza:
├─ Workspace name (workspace identifier)
├─ Import alias: @legal-mind/website
├─ But NOT used (website is app, not package)
├─ Actually: apps use features/ directly
└─ Only packages (ui, database) imported

"@legal-mind/ui": "*"

Znaczenie:
├─ * = Any version (wildcard)
├─ npm workspace magic:
│  └─ "latest" version z packages/ui
├─ If update packages/ui/package.json version
│  └─ website uses new version immediately
└─ Without reinstall!

Vs explicit version:
❌ "@legal-mind/ui": "0.1.0"
├─ Fixed version
├─ Update package version
├─ But website still 0.1.0
├─ Must manually update
└─ Error-prone

✅ "@legal-mind/ui": "*"
├─ Always latest
├─ Update package.json version
├─ Workspace updates automatically
└─ Single source of truth
```

---

## Case 4: Packages - Shared Code

### @legal-mind/database package.json

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/database/package.json`

```json
{
  "name": "@legal-mind/database",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "clean": "rm -rf dist",
    "generate-types": "supabase gen types typescript --local > src/types.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

### Export Pattern

```typescript
// packages/database/src/index.ts
export * from './types'

// Generated:
export type Database = {...}
export type Survey = Tables<'surveys'>
export type Response = Tables<'responses'>

// Usage in apps:
import type { Survey, Response } from '@legal-mind/database'

// How it works:
1. Website imports @legal-mind/database
2. npm workspace: node_modules/@legal-mind/database → packages/database/src
3. index.ts imports types
4. Types available!
5. NO build needed (Next.js transpiles on-demand)
```

---

## Case 5: Build Process Flow

### npm run build (Full)

```
1. User runs: npm run build
   └─ Root package.json → turbo run build

2. Turbo reads turbo.json
   ├─ Finds "build" task
   ├─ Reads: dependsOn: ["^build"]
   ├─ Finds all workspaces
   └─ Plans execution order

3. Dependency resolution:
   database (no deps)
       ↓
   validators (no deps)
       ↓
   ui (depends on database? no, just imports types)
       ↓
   website (depends on ui, database, validators)
       ↓
   cms (depends on ui, database, validators)

4. Execution:
   Parallel:
   ├─ database build → dist/
   ├─ validators build → dist/
   ├─ (Then:) ui build → dist/

   Then serial:
   ├─ website build → .next/
   ├─ cms build → .next/

5. Cache:
   First run:
   ├─ Full compilation
   ├─ Outputs saved to .turbo/cache
   ├─ Takes: 60-90 seconds

   Second run (no changes):
   ├─ Restore from cache
   ├─ Takes: 5-10 seconds ✅

6. Result:
   ├─ apps/website/.next/ ready for deploy
   ├─ apps/cms/.next/ ready for deploy
   └─ Vercel picks these up
```

### npm run build:website (Filtered)

```
User runs: npm run build:website
└─ turbo run build --filter=@legal-mind/website

Turborepo:
1. Sees --filter=@legal-mind/website
2. Determines dependencies:
   ├─ ui (imported in website/package.json)
   ├─ database (imported)
   └─ validators (imported)
3. Builds only these:
   ├─ database build
   ├─ validators build
   ├─ ui build
   ├─ website build
   └─ NOT cms (not dependency)
4. Time saved: ~20-30 seconds (vs 60-90)
```

---

## Case 6: Next.js Transpilation Magic

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@legal-mind/ui',
    '@legal-mind/database',
    '@legal-mind/validators'
  ],
}
```

### Co to robi

```
transpilePackages: ['@legal-mind/ui', ...]

Oznacza:
1. Website sees: import { Button } from '@legal-mind/ui'
2. Normalnie: Error! packages/ nie transpilowane
3. Next.js setting: transpilePackages
4. Next.js: Transpile @legal-mind/ui on-build
5. Result: Works!

Bez tego:
❌ import { Button } from '@legal-mind/ui'
❌ Error: Cannot find module
❌ Packages nie transpilowane
❌ Next.js doesn't know to include them

Z tym:
✅ import { Button } from '@legal-mind/ui'
✅ Next.js sees in transpilePackages
✅ Includes package source in build
✅ Transpiles TypeScript
✅ Works!

Flow:
1. npm run build:website
2. Next.js starts build
3. Sees import from @legal-mind/ui
4. Checks transpilePackages
5. Found! Include it
6. Transpiles packages/ui/src to JS
7. Includes in .next/ bundle
8. Done!
```

---

## Case 7: Workspace Symlink Resolution

### npm install Process

```
Command: npm install (at root)

Process:
1. Reads: root/package.json
   └─ "workspaces": ["apps/*", "packages/*"]

2. Scans directories:
   ├─ apps/website/package.json
   ├─ apps/cms/package.json
   ├─ packages/ui/package.json
   ├─ packages/database/package.json
   └─ packages/validators/package.json

3. Collects all dependencies:
   ├─ React 19.2.0
   ├─ Next 16.0.7
   ├─ Zod 3.23.0
   ├─ TanStack Query 5.50.0
   └─ ... (all merged)

4. Deduplicates:
   ├─ React: 1x installed (not 3x)
   ├─ TailwindCSS: 1x (not 2x)
   └─ All shared packages: 1x each

5. Creates node_modules/:
   ├─ node_modules/react/
   ├─ node_modules/next/
   ├─ node_modules/@legal-mind/ui/ ← Symlink!
   ├─ node_modules/@legal-mind/database/ ← Symlink!
   └─ node_modules/@legal-mind/validators/ ← Symlink!

6. Symlinks point to:
   node_modules/@legal-mind/ui → ../../packages/ui/src
   node_modules/@legal-mind/database → ../../packages/database/src
   node_modules/@legal-mind/validators → ../../packages/validators/src

Result:
✅ One node_modules
✅ All packages shared
✅ Small footprint (~500MB vs 1.5GB)
✅ Fast install
```

### Import Resolution

```typescript
// In apps/website/features/survey/page.tsx
import { Button } from '@legal-mind/ui'

Resolution:
1. Module resolver: @legal-mind/ui
2. Checks: node_modules/@legal-mind/ui
3. Finds symlink: → ../../packages/ui/src
4. Reads: packages/ui/src/index.ts
5. Exports: { Button, ... }
6. Success!

Why it's fast:
├─ No pre-build needed
├─ Symlinks direct to source
├─ TypeScript: knows types
├─ Next.js: Transpiles on-demand
└─ Development: instant
```

---

## Case 8: Deployment Flow

### Vercel Deployment (Website)

```
Git push to main
    ↓
Vercel detects change
    ├─ Website changed?
    ├─ Packages changed?
    └─ Yes → Deploy

Vercel build command:
npm run build:website

Behind scenes:
1. Clone full monorepo
2. npm install (installs all workspaces)
3. turbo run build --filter=@legal-mind/website
4. Turbo sees dependencies:
   ├─ Builds database
   ├─ Builds validators
   ├─ Builds ui
   ├─ Builds website
   └─ Uses cache if available
5. Next.js output: apps/website/.next/
6. Vercel deploys: apps/website/.next/
7. Result: website.vercel.app updated

Key insight:
├─ Full monorepo cloned (necessary)
├─ All packages available (good!)
├─ Atomic: Build everything or nothing
├─ CMS separately:
│  └─ cms.vercel.app has own deployment
│  └─ Uses same code
│  └─ Both always in sync!
```

---

## Case 9: Development Workflow

### Developer Working on CMS Feature

```
1. Start development:
   npm run dev:cms

   What runs:
   ├─ CMS Next.js (port 3001)
   ├─ Watches: apps/cms/
   ├─ Watches: packages/ (symlinked)
   └─ HMR enabled

2. Edit feature:
   apps/cms/features/surveys/components/SurveyList.tsx

   Result:
   ├─ File changes detected
   ├─ Module reloaded
   ├─ Browser updates
   ├─ Instant ✅

3. Edit shared UI:
   packages/ui/src/components/ui/button.tsx

   Result:
   ├─ Symlink detected change
   ├─ Next.js sees import change
   ├─ Module reloaded
   ├─ Browser updates
   ├─ Both website AND cms updated!
   ├─ Even though only cms running
   ├─ Why? next dev watches symlinked changes
   └─ Instant ✅

4. Export new component:
   packages/ui/src/index.ts

   Result:
   ├─ Add: export { NewComponent }
   ├─ App code:
   │  └─ import { NewComponent } from '@legal-mind/ui'
   ├─ IDE shows autocomplete
   ├─ No build needed!
   ├─ Works immediately
   └─ Instant ✅
```

---

## Case 10: Why Legal-Mind Structure Works

### Before Monorepo (Separate Repos)

```
Problem 1: Code duplication
├─ shared-ui repo (UI components)
├─ website repo (uses shared-ui)
├─ cms repo (uses shared-ui)
├─ shared-types repo (database types)
└─ All 4 repos, 4 CI/CD, 4 deploys

Problem 2: Version sync
├─ Update Button in shared-ui
├─ Version: 0.1.0 → 0.1.1
├─ website/package.json: "shared-ui": "0.1.0" (old!)
├─ cms/package.json: "shared-ui": "0.1.1" (new!)
├─ Different versions in different apps!
├─ Bugs from inconsistency

Problem 3: Deployment coordination
├─ shared-ui.com deployed
├─ website.com needs new version
├─ website deployed
├─ cms doesn't get update
├─ Different versions on production!

Problem 4: Atomic changes impossible
├─ Change UI affecting both apps
├─ Update shared-ui repo
├─ Deploy website
├─ Website breaks (shared-ui not updated yet!)
└─ Need careful coordination
```

### After Monorepo (Legal-Mind)

```
Solution 1: No duplication
├─ One repo
├─ All code together
├─ Shared packages/ in same repo
├─ Features/ in respective apps
└─ Single source of truth

Solution 2: Automatic sync
├─ Update packages/ui/
├─ "@legal-mind/ui": "*"
├─ Both apps use latest immediately
├─ No version mismatch
└─ Impossible to be out of sync!

Solution 3: Atomic deployments
├─ Commit changes to monorepo
├─ Website and CMS deployed together
├─ Both use same code
├─ Always consistent
└─ No coordination needed

Solution 4: Atomic changes
├─ Modify UI + both apps using it
├─ Single commit
├─ Test locally
├─ Deploy atomically
├─ No breakage
└─ Instant!

Result:
✅ Simpler
✅ Faster
✅ Safer
✅ More maintainable
```

---

## Summary: Why Turborepo is Perfect for Legal-Mind

```
Two apps + Shared code:
├─ Monorepo: Perfect!
├─ Website + CMS
├─ Both use UI components, types, validators
├─ Natural to share
└─ Turborepo manages it

Key benefits realized:
1. Single npm install (deduplication)
2. Atomic builds (correct order)
3. Cache sharing (fast rebuilds)
4. Easy refactoring (move code to packages)
5. Atomic deployments (both apps in sync)
6. Developer experience (instant HMR)

Growth path:
Phase 1: Website + CMS (Now)
├─ Works great with monorepo

Phase 2: Add mobile app?
├─ Just create apps/mobile
├─ Reuse packages/ui, packages/database
├─ Deploy independently
└─ All in sync!

Phase 3: Add admin dashboard?
├─ apps/admin
├─ Same packages
├─ Easy!

Monorepo scales beautifully
As you add more apps, benefits compound
```

