# Turborepo Patterns - Real-World Solutions

Rzeczywiste problemy z monorepo które mogą się pojawić w Legal-Mind i jak je rozwiązywać.

---

## Problem 1: Adding a New Shared Package

### The Problem

**Scenario:** Need a shared utilities package (helper functions used by both apps)

```
Currently have: @legal-mind/ui, @legal-mind/database, @legal-mind/validators
Need: @legal-mind/utils (for date helpers, string utils, etc)
```

### The Solution: Step by Step

```bash
# Step 1: Create directory
mkdir packages/utils

# Step 2: Create package.json
cat > packages/utils/package.json << 'EOF'
{
  "name": "@legal-mind/utils",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
EOF

# Step 3: Create tsconfig.json
cat > packages/utils/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true
  },
  "include": ["src/**/*"]
}
EOF

# Step 4: Create src/index.ts
mkdir packages/utils/src

cat > packages/utils/src/index.ts << 'EOF'
export { formatDate, parseDate } from './date'
export { truncate, capitalize } from './string'
EOF

# Step 5: Create utilities
cat > packages/utils/src/date.ts << 'EOF'
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pl-PL')
}

export function parseDate(str: string): Date {
  return new Date(str)
}
EOF

# Step 6: Reinstall (creates symlink)
npm install

# Step 7: Update apps to use it
# apps/website/package.json
# Add: "@legal-mind/utils": "*"

# apps/cms/package.json
# Add: "@legal-mind/utils": "*"

# Step 8: Update next.config.ts (IMPORTANT!)
// apps/website/next.config.ts
transpilePackages: [
  '@legal-mind/ui',
  '@legal-mind/database',
  '@legal-mind/validators',
  '@legal-mind/utils'  // ← Add this!
]
```

### Why This Works

```
Workspace resolution:
1. npm install reads root package.json "workspaces"
2. Finds packages/utils/package.json
3. Reads "name": "@legal-mind/utils"
4. Creates symlink: node_modules/@legal-mind/utils → packages/utils/src/
5. Apps import @legal-mind/utils automatically resolves!

TypeScript resolution:
1. apps/cms imports '@legal-mind/utils'
2. Finds node_modules/@legal-mind/utils/src/index.ts
3. IDE shows types from packages/utils/src/

Next.js transpilation:
1. Website imports { formatDate } from '@legal-mind/utils'
2. Next.js sees transpilePackages: [@legal-mind/utils]
3. Transpiles at build time
4. No need to pre-compile package!
```

---

## Problem 2: Sharing Feature Code (WRONG WAY)

### The Problem

```
Temptation: "Both apps show surveys, let's share the component"

❌ WRONG:
packages/
├─ surveys-feature/
│  └─ components/SurveyList.tsx (shared!)
│
apps/website/
└─ features/surveys/
   └─ components/SurveyList.tsx (different UI!)

apps/cms/
└─ features/surveys/
   └─ components/SurveyList.tsx (different UI!)

Problem:
├─ Website wants: Simple list, no actions
├─ CMS wants: List with edit/delete buttons
├─ Shared component can't satisfy both!
└─ Result: Wrong abstraction, complex props
```

### The Solution: Share Only UI, Not Features

```
✅ CORRECT:

packages/
├─ ui/ (pure components, no business logic)
│  └─ Table.tsx (generic, reusable)
│
apps/website/
├─ features/surveys/
│  └─ components/SurveyList.tsx
│     └─ Uses <Table> from @legal-mind/ui
│
apps/cms/
├─ features/surveys/
│  └─ components/SurveyList.tsx
│     └─ Uses <Table> + <Button> from @legal-mind/ui

Each app:
├─ Own feature-specific components
├─ Own business logic
└─ Shares generic UI building blocks
```

### What To Share vs What NOT To Share

```
✅ SHARE (in packages/):
├─ UI components (Button, Input, Card, etc.)
├─ Types (auto-generated Supabase types)
├─ Validation schemas (Zod)
├─ Utility functions (format, parse, etc.)
├─ Constants (API endpoints, colors)
└─ Hooks (useLocalStorage, useDebounce) - generic only

❌ DON'T SHARE (in apps/features/):
├─ Feature components (SurveyList, SurveyBuilder)
├─ Page components
├─ Business logic (queries, mutations)
├─ Contexts (auth, theme - app-specific)
├─ Middleware
└─ API routes
```

### Rule of Thumb

```
If feature logic differs between apps → Feature-specific
If UI building block is generic → Shared package

Example:
├─ Button component → Shared (same everywhere)
├─ SurveyList → App-specific (different UI, different features)
├─ DatePicker → Shared (generic date picking)
├─ SurveyBuilder → App-specific (complex business logic)
```

---

## Problem 3: Dependency Conflicts Between Apps

### The Problem

```typescript
// apps/website/package.json
"dependencies": {
  "react": "^19.0.0",
  "@radix-ui/react-dialog": "^1.1.0"
}

// apps/cms/package.json
"dependencies": {
  "react": "^18.0.0",  // ❌ Different version!
  "@radix-ui/react-dialog": "^1.0.0"
}

Result:
❌ Two different React versions
❌ Conflict resolution fails
❌ Build problems
```

### The Solution: Define in Root

```json
// root package.json
{
  "dependencies": {},
  "devDependencies": {
    "react": "^19.0.0",
    "@radix-ui/react-dialog": "^1.1.0"
  }
}

// apps/website/package.json
{
  "dependencies": {
    "react": "19.0.0",  // ← Reference root version
    "@radix-ui/react-dialog": "1.1.0"
  }
}

// apps/cms/package.json (identical!)
{
  "dependencies": {
    "react": "19.0.0",
    "@radix-ui/react-dialog": "1.1.0"
  }
}

Result:
✅ Single version (root package-lock.json enforced)
✅ No conflicts
✅ node_modules deduplicated
```

### Why This Works

```
npm install with workspaces:
1. Reads root package.json
2. Reads each app's package.json
3. Merges all dependencies
4. Deduplicates (if same version)
5. Creates single node_modules/

If different versions of same package needed:
❌ DON'T try different versions
✅ Either:
   ├─ Update both to same version
   ├─ Or use monorepo feature (npm 7+): Different paths
   └─ Usually: Same version better choice
```

---

## Problem 4: Build Order Issues

### The Problem

```typescript
// apps/cms/package.json
"dependencies": {
  "@legal-mind/ui": "*",
  "@legal-mind/database": "*"
}

// If ui depends on database types:
// packages/ui/src/components/Button.tsx
import type { Survey } from '@legal-mind/database'

// Build order matters!
// ❌ If cms builds before database → Missing types

turbo.json
"build": {
  "dependsOn": ["^build"]  // ✅ Correct: Run deps first
}

// But what if someone removed it?
"build": {
  "dependsOn": []  // ❌ No dependency info!
}

// Result:
// turbo runs: cms → ui → database (random order!)
// cms fails: Database not built yet
```

### The Solution: Explicit Dependencies in turbo.json

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // ← Always include this
      "outputs": [".next/**", "dist/**"]
    }
  }
}

What ^ means:
dependsOn: ["^build"]
├─ Run build in dependencies FIRST
├─ Then run build in this workspace
└─ Ensures correct order automatically

Execution order:
1. packages/database: build (no deps)
2. packages/validators: build (no deps)
3. packages/ui: build (depends on database)
4. apps/website: build (depends on ui, database, validators)
5. apps/cms: build (depends on ui, database, validators)

Parallelization:
├─ Parallel: database, validators (no deps on each other)
├─ Then: ui (waits for database)
├─ Then: website, cms (waits for all packages)
└─ Efficient scheduling!
```

---

## Problem 5: Local Development: Only Want One App Running

### The Problem

```bash
npm run dev

# Starts:
# ├─ website (port 3000) ← I don't need this!
# ├─ cms (port 3001)
# └─ Takes 45 seconds to start

# I only need cms, wastes time and resources
```

### The Solution: Use --filter

```bash
# Only start CMS
npm run dev:cms

# Or direct turbo command:
turbo run dev --filter=@legal-mind/cms

# Result:
# ├─ cms (port 3001) only
# └─ Starts in ~15 seconds ✅

# Also works for other commands:
turbo run build --filter=@legal-mind/ui
turbo run lint --filter=@legal-mind/*  # All packages
```

### Create Shortcuts

```json
// root package.json
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:website": "turbo run dev --filter=@legal-mind/website",
    "dev:cms": "turbo run dev --filter=@legal-mind/cms",
    "build:website": "turbo run build --filter=@legal-mind/website",
    "build:cms": "turbo run build --filter=@legal-mind/cms"
  }
}

// Usage:
npm run dev:cms  // Faster startup
npm run build:website  // Deploy only website
```

---

## Problem 6: Debugging: Where's The Error?

### The Problem

```bash
npm run build

# Error output:
# ❌ Error in .next/types/layout.ts
# ❌ But which app? website or cms?

# Long build output, hard to find source
```

### The Solution: Turbo Graph Visualization

```bash
# Visualize dependency graph
turbo build --graph

# Output: graph.html in browser
# Shows:
# ├─ All packages and apps
# ├─ Dependencies between them
# ├─ Build order
# └─ Which one failed!

# Or run specific app:
turbo run build --filter=@legal-mind/cms

# Output clearer (only cms dependencies)
```

### Specific Error Debugging

```bash
# Error in CMS build
npm run build:cms

# See verbose output:
turbo run build --filter=@legal-mind/cms --verbose

# Output shows:
# ├─ What's building
# ├─ Dependencies resolving
# ├─ Exact error location
# └─ Line number
```

---

## Problem 7: Adding TypeScript Path Alias (@/)

### The Problem

```typescript
// apps/website/features/surveys/components/SurveyList.tsx

// ❌ With relative imports (messy):
import { getSurveys } from '../../../../queries'

// ✅ With path alias:
import { getSurveys } from '@/features/surveys/queries'

// But how to set up?
```

### The Solution: tsconfig paths

```json
// apps/website/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}

// apps/cms/tsconfig.json (identical)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### How It Works

```
import statement: @/features/surveys/queries

Resolution:
1. @ = start of alias
2. /* = rest of path
3. Lookup in tsconfig paths
4. "@/*" maps to ["./*"]
5. Replace: ./ + features/surveys/queries
6. Becomes: ./features/surveys/queries
7. Resolves relative to app root!

Benefits:
✅ No more ../../../ hell
✅ IDE autocomplete works
✅ Refactoring easier
✅ Clearer code
```

### Different Aliases for Packages

```json
// packages/ui/tsconfig.json (if needed)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/utils/*": ["./utils/*"],
      "@/components/*": ["./components/*"]
    }
  }
}

// But usually: Just use src/index.ts for packages
// Apps import from @legal-mind/ui directly
```

---

## Problem 8: Env Variables in Monorepo

### The Problem

```typescript
// apps/website/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

// apps/cms/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

// ❌ Duplication!
// If URL changes, update both files
```

### The Solution: Root .env + Local Overrides

```bash
# root/.env.local (shared)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=secret

# apps/website/.env.local (optional overrides)
# (empty or specific to website)

# apps/cms/.env.local (optional overrides)
# (empty or specific to cms)

# In turbo.json, declare all env vars:
{
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ]
}

# Next.js automatically picks up root .env
# And uses root .env.local overrides
```

### Env in turbo.json

```json
{
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "N8N_WEBHOOK_URL"
  ]
}

globalDependencies:
├─ If .env changes, invalidate cache
└─ Ensures rebuild when env updated

globalEnv:
├─ These env vars affect build
├─ Turbo considers them for caching
├─ If these change, cache invalidated
└─ Build happens fresh
```

---

## Problem 9: Circular Dependencies

### The Problem

```
ui imports from database
  ↓
database imports from validators
  ↓
validators imports from ui ❌ CIRCULAR!

Or:
website imports from cms (❌ circular)
apps shouldn't depend on each other
```

### The Solution: Dependency Visualization

```bash
# See dependency graph
turbo build --graph

# Open graph.html - shows:
# ├─ All packages
# ├─ All arrows (dependencies)
# ├─ Circular arrows highlighted
# └─ Which direction breaks cycle

# Fix process:
# 1. Identify circular dependency
# 2. Extract shared code to NEW package
# 3. Both import from new package
# 4. Breaks cycle
```

### Example Fix

```
❌ Before (circular):
ui → database → validators → ui

✅ After (fixed):
types/ (new package)
  ← database imports types
  ← validators imports types
  ← ui imports types

No circular! All import from types
```

---

## Problem 10: Vercel Deployment Confusion

### The Problem

```
Two apps deployed to Vercel separately
Question: How do packages get built?

Vercel runs: npm run build
But which app?
```

### The Solution: Vercel Configuration

```json
// vercel.json (root or per app)
{
  "buildCommand": "turbo run build --filter=@legal-mind/website",
  "outputDirectory": "apps/website/.next"
}

// Or:
{
  "buildCommand": "turbo run build --filter=@legal-mind/cms",
  "outputDirectory": "apps/cms/.next"
}

Process:
1. Vercel clones full monorepo
2. Runs build command: turbo run build --filter=cms
3. Turbo sees cms depends on packages
4. Turbo builds packages FIRST
5. Then builds cms
6. Uses .next/ as deployment
7. Website .next/ ignored (separate deployment)
```

### Key Insight

```
Vercel per-app deployment:
├─ Website deployment has own build process
├─ CMS deployment has own build process
├─ Each runs full turbo pipeline
├─ Packages built as dependencies
└─ Both share same monorepo code

Result:
✅ Atomic deployments (both or none)
✅ Code always in sync
✅ No version mismatch
```

---

## Lessons Learned from Legal-Mind

```
1. One-way dependencies only (packages ← apps)
   ├─ Never: apps import from apps
   └─ Always: apps import from packages

2. Share only pure code (UI, types, utils)
   ├─ Not: business logic (features)
   └─ Each app: own features directory

3. All dependencies in root package.json
   ├─ Single version truth
   └─ npm deduplicates

4. Explicit turbo.json configuration
   ├─ Define all tasks
   ├─ Define dependsOn: ["^task"]
   ├─ Define outputs
   └─ Turbo handles rest

5. Use --filter for focused work
   ├─ npm run dev:cms (faster)
   ├─ npm run build:website
   └─ Saves time during development

6. Environment variables in globalEnv
   ├─ Invalidate cache when changed
   └─ Ensure rebuilds

7. Add to transpilePackages in next.config.ts
   ├─ Every new @legal-mind/* package
   ├─ Forget this → TypeErrors!
   └─ Double-check on package creation

8. .env files: Share root, override locally
   ├─ Most vars in root
   ├─ App-specific in app/.env
   └─ Avoid duplication

9. Visualize dependency graph
   ├─ turbo build --graph
   ├─ Debug circular deps
   └─ Understand structure

10. Monorepo scales better
    ├─ CMS + Website → Easy to split
    ├─ But code shared → No duplication
    ├─ Future: Easy to add 3rd app
    └─ All use same packages
```

