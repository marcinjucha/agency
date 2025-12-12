# Turborepo Quick Reference - Copy-Paste Ready

Szybkie komendy i snippety do kopiowania.

---

## Installation & Setup

```bash
# Already done in Legal-Mind, but for reference:
npm install -D turbo

# Initialize (creates turbo.json)
npx turbo init
```

## Root package.json Template

```json
{
  "name": "legal-mind",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "npm@10.0.0",
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "dev": "turbo run dev",
    "dev:website": "turbo run dev --filter=@legal-mind/website",
    "dev:cms": "turbo run dev --filter=@legal-mind/cms",
    "build": "turbo run build",
    "build:website": "turbo run build --filter=@legal-mind/website",
    "build:cms": "turbo run build --filter=@legal-mind/cms",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\""
  }
}
```

## turbo.json Template

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

## Create New Shared Package

```bash
# 1. Create directory
mkdir packages/my-package
cd packages/my-package

# 2. Create package.json
cat > package.json << 'EOF'
{
  "name": "@legal-mind/my-package",
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

# 3. Create tsconfig.json
cat > tsconfig.json << 'EOF'
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

# 4. Create src/index.ts
mkdir src
touch src/index.ts

# 5. Reinstall (creates symlink)
npm install

# 6. Update apps to use it
# In apps/website/package.json and apps/cms/package.json:
# Add: "@legal-mind/my-package": "*"

# 7. Update next.config.ts in both apps:
# Add to transpilePackages: ['@legal-mind/my-package']
```

## App package.json Template (Next.js)

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

## next.config.ts Template

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@legal-mind/ui',
    '@legal-mind/database',
    '@legal-mind/validators'
    // Add new packages here!
  ],
}

export default nextConfig
```

## tsconfig.json with Path Alias

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Common Commands

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
npm run clean                 # Clean all build output
npm run lint                  # Lint all
npm run format                # Format all files

# Specific workspace operations
turbo run dev --filter=@legal-mind/cms
turbo run build --filter=@legal-mind/ui
turbo run lint --filter=@legal-mind/*

# Graph visualization
turbo build --graph           # Creates graph.html

# Verbose output
turbo run build --verbose

# Skip cache
turbo run build --no-cache
```

## Import Patterns

### From Shared Package

```typescript
// Anywhere (website or cms)
import { Button } from '@legal-mind/ui'
import type { Survey } from '@legal-mind/database'
import { SurveySchema } from '@legal-mind/validators'
```

### From Local Features (Path Alias)

```typescript
// In apps/website/
import { SurveyForm } from '@/features/survey/components/SurveyForm'
import { getSurveys } from '@/features/survey/queries'

// Instead of:
import { SurveyForm } from '../../../../features/survey/components/SurveyForm'
```

### Export from Package

```typescript
// packages/ui/src/index.ts
export { Button } from './components/ui/button'
export { Input } from './components/ui/input'
export { cn } from './lib/utils'
```

## Dependency Declaration

### In Root package.json

```json
{
  "devDependencies": {
    "react": "19.2.0",
    "next": "16.0.7",
    "typescript": "^5.5.0",
    "tailwindcss": "^4.0.0"
  }
}
```

### In App package.json

```json
{
  "dependencies": {
    "react": "19.2.0",
    "next": "16.0.7",
    "@legal-mind/ui": "*",
    "@legal-mind/database": "*"
  }
}
```

## .env Setup

```bash
# root/.env.local (shared variables)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-key

# apps/website/.env.local (optional app-specific)
# (usually empty, inherits from root)

# apps/cms/.env.local (optional app-specific)
# (usually empty, inherits from root)
```

## .gitignore Monorepo Patterns

```
# Dependencies
node_modules/
.pnp

# Build outputs
.next/
out/
build/
dist/

# Turbo
.turbo/

# Environment
.env
.env*.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Supabase
.branches/
.temp/
```

## Workflow: Add New Feature

### To Shared UI Package

```bash
# 1. Create component
cat > packages/ui/src/components/ui/dialog.tsx << 'EOF'
export function Dialog({ ... }) {
  // Component code
}
EOF

# 2. Export in index.ts
echo "export { Dialog } from './components/ui/dialog'" >> packages/ui/src/index.ts

# 3. Use in app (no build needed!)
# apps/cms/app/admin/page.tsx
import { Dialog } from '@legal-mind/ui'
```

### To App Feature (CMS-specific)

```bash
# 1. Create component
mkdir -p apps/cms/features/responses/components
touch apps/cms/features/responses/components/ResponseList.tsx

# 2. Use in route
# apps/cms/app/admin/responses/page.tsx
import { ResponseList } from '@/features/responses/components/ResponseList'
```

### To Shared Package (New Package)

```bash
# 1. Create package (see "Create New Shared Package" above)
mkdir packages/my-utils

# 2. Add to package.json files:
# apps/website/package.json: "@legal-mind/my-utils": "*"
# apps/cms/package.json: "@legal-mind/my-utils": "*"

# 3. Update next.config.ts in both:
# transpilePackages: ['@legal-mind/my-utils']

# 4. Reinstall
npm install

# 5. Use anywhere
import { myFunction } from '@legal-mind/my-utils'
```

## Debugging Checklist

```bash
# Package not found?
□ npm install (recreates symlinks)
□ Check package.json has "name": "@legal-mind/xxx"
□ Check root workspaces: ["apps/*", "packages/*"]
□ Check next.config.ts transpilePackages

# Build failing?
□ turbo run build --filter=@legal-mind/cms --verbose
□ Check dependency order (^build in turbo.json)
□ npm run clean (clear cache)
□ npm install (reinstall)

# Types not working?
□ npm run db:types (if Supabase types)
□ Check tsconfig paths correct
□ Restart IDE/TypeScript server

# Slow builds?
□ turbo build --graph (check dependencies)
□ turbo run build --no-cache (debug)
□ Check next.config.js transpilePackages correct

# Vercel deploy failing?
□ turbo run build --filter=@legal-mind/cms (test locally)
□ Check env vars set in Vercel dashboard
□ Check buildCommand in vercel.json correct
```

## Useful Links

```bash
# Turborepo documentation
https://turbo.build/

# Workspaces documentation
https://docs.npmjs.com/cli/v7/using-npm/workspaces

# Next.js transpilePackages
https://nextjs.org/docs/advanced-features/transpiling-packages-from-node_modules
```

## Quick Decision Tree

```
Need to share code?
├─ YES → Is it UI component?
│  ├─ YES → packages/ui/
│  ├─ NO → Is it types or validation?
│  │  ├─ YES → packages/database/ or packages/validators/
│  │  └─ NO → Create new shared package!
│
├─ NO → Keep in app-specific features/
```

---

Last updated: 2025-12-12
