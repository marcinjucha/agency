# Legal-Mind MVP: Full Turborepo Architecture Implementation Plan

## Executive Decision

**Architecture:** Full Turborepo with 2 Next.js Applications

**Rationale:**
- User prioritizes long-term architecture over speed
- Plans to add 1-2 team members in 3-6 months
- Starting with single domain, migrating to subdomains later
- TanStack Query included for optimal data management
- Clear separation: PUBLIC (website + survey) vs ADMIN (cms)
- Two applications provide clean boundaries and independent deployments

---

## Project Structure

```
legal-mind/
├── turbo.json                      # Turborepo pipeline config
├── package.json                    # Root workspace
├── .gitignore
├── .eslintrc.json                  # Root ESLint config
├── tsconfig.json                   # Root TypeScript config
│
├── apps/
│   ├── website/                    # PUBLIC Next.js app (legalmind.pl)
│   │   ├── package.json            # App dependencies
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   │
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── globals.css
│   │   │   │
│   │   │   ├── (marketing)/       # Route group - landing page
│   │   │   │   ├── layout.tsx     # Marketing layout (Navbar, Footer)
│   │   │   │   ├── page.tsx       # Homepage
│   │   │   │   ├── pricing/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── o-nas/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── kontakt/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── survey/            # Client survey forms (NO auth)
│   │   │   │   └── [token]/
│   │   │   │       ├── page.tsx   # Survey form + Calendar
│   │   │   │       └── success/
│   │   │   │           └── page.tsx  # Thank you page
│   │   │   │
│   │   │   └── api/               # Public API routes
│   │   │       ├── survey/
│   │   │       │   └── submit/
│   │   │       └── calendar/
│   │   │           └── slots/
│   │   │
│   │   ├── features/              # Business logic
│   │   │   ├── survey/
│   │   │   │   ├── components/
│   │   │   │   │   ├── SurveyForm.tsx
│   │   │   │   │   └── CalendarBooking.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   └── queries.ts
│   │   │   │
│   │   │   └── marketing/
│   │   │       └── components/
│   │   │           ├── Hero.tsx
│   │   │           ├── Features.tsx
│   │   │           └── Pricing.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   └── shared/
│   │   │
│   │   └── lib/
│   │       ├── supabase/
│   │       └── utils/
│   │
│   └── cms/                        # ADMIN Next.js app (app.legalmind.pl)
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── middleware.ts           # Auth protection for all routes
│       │
│       ├── app/
│       │   ├── layout.tsx          # Root layout (QueryProvider)
│       │   ├── providers.tsx       # TanStack Query setup
│       │   ├── globals.css
│       │   │
│       │   ├── login/
│       │   │   └── page.tsx       # Login page (unprotected)
│       │   │
│       │   ├── admin/             # Protected admin routes
│       │   │   ├── layout.tsx     # Admin layout (Sidebar)
│       │   │   ├── page.tsx       # Dashboard
│       │   │   │
│       │   │   ├── surveys/       # Survey management
│       │   │   │   ├── page.tsx   # List surveys
│       │   │   │   ├── new/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx    # Edit survey
│       │   │   │       └── preview/
│       │   │   │           └── page.tsx
│       │   │   │
│       │   │   ├── responses/     # Client responses
│       │   │   │   ├── page.tsx   # List responses
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx    # Response detail
│       │   │   │
│       │   │   ├── calendar/      # Calendar management
│       │   │   │   └── page.tsx
│       │   │   │
│       │   │   └── settings/      # Settings
│       │   │       └── page.tsx
│       │   │
│       │   └── api/               # Admin API routes
│       │       ├── auth/
│       │       ├── surveys/
│       │       ├── responses/
│       │       └── calendar/
│       │
│       ├── features/              # Business logic (ADR-005)
│       │   ├── surveys/
│       │   │   ├── components/
│       │   │   │   ├── SurveyBuilder.tsx
│       │   │   │   ├── SurveyList.tsx
│       │   │   │   └── QuestionEditor.tsx
│       │   │   ├── actions.ts
│       │   │   ├── queries.ts
│       │   │   ├── validations.ts
│       │   │   └── types.ts
│       │   │
│       │   ├── responses/
│       │   │   ├── components/
│       │   │   ├── actions.ts
│       │   │   └── queries.ts
│       │   │
│       │   ├── calendar/
│       │   │   ├── components/
│       │   │   ├── actions.ts
│       │   │   └── queries.ts
│       │   │
│       │   └── auth/
│       │       ├── components/
│       │       └── actions.ts
│       │
│       ├── components/
│       │   ├── admin/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   └── DashboardCard.tsx
│       │   └── shared/
│       │
│       ├── lib/
│       │   ├── supabase/
│       │   ├── google-calendar/
│       │   ├── n8n/
│       │   └── utils/
│       │
│       └── hooks/
│
├── packages/
│   ├── ui/                         # Shared UI components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── index.ts            # Exports
│   │       └── components/
│   │           ├── button.tsx
│   │           ├── form.tsx
│   │           └── calendar.tsx
│   │
│   ├── database/                   # Supabase types & queries
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts            # Generated from Supabase
│   │       └── queries/
│   │           └── common.ts
│   │
│   ├── validators/                 # Shared Zod schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── survey.ts
│   │       └── calendar.ts
│   │
│   └── config/                     # Shared configs
│       ├── eslint/
│       │   └── package.json
│       ├── typescript/
│       │   └── package.json
│       └── tailwind/
│           └── package.json
│
├── supabase/                       # Database migrations
│   ├── config.toml
│   └── migrations/
│
└── docs/
    ├── architecture.md
    └── deployment.md
```

---

## Phase 1: Initialize Turborepo Monorepo (Week 1, Days 1-2)

### 1.1 Create Turborepo Structure

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind

# Initialize Turborepo (interactive)
npx create-turbo@latest .
# Select: npm, no remote caching initially, skip examples

# Or manual setup:
npm install turbo -D -W

# Create directories
mkdir -p apps/web
mkdir -p packages/{ui,database,validators,config}
```

### 1.2 Configure Root Package.json

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/package.json`

```json
{
  "name": "legal-mind",
  "version": "1.0.0",
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
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "@turbo/gen": "^2.0.0"
  },
  "packageManager": "npm@10.0.0",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 1.3 Configure Turborepo Pipeline

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
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

### 1.4 Root TypeScript Config

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "files": []
}
```

---

## Phase 2: Create Next.js Applications (Week 1, Days 2-3)

### 2.1 Initialize Website App (Public)

```bash
cd apps
npx create-next-app@latest website \
  --typescript \
  --tailwind \
  --app \
  --import-alias "@/*" \
  --no-git

cd website
```

### 2.2 Initialize CMS App (Admin)

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind/apps
npx create-next-app@latest cms \
  --typescript \
  --tailwind \
  --app \
  --import-alias "@/*" \
  --no-git

cd cms
```

### 2.3 Configure Website App Package.json

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
    "lint": "next lint",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@legal-mind/ui": "*",
    "@legal-mind/database": "*",
    "@legal-mind/validators": "*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.0",
    "eslint": "^8",
    "eslint-config-next": "^15.0.0"
  }
}
```

### 2.4 Configure CMS App Package.json

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/package.json`

```json
{
  "name": "@legal-mind/cms",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@legal-mind/ui": "*",
    "@legal-mind/database": "*",
    "@legal-mind/validators": "*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.50.0",
    "@tanstack/react-query-devtools": "^5.50.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.0",
    "eslint": "^8",
    "eslint-config-next": "^15.0.0"
  }
}
```

### 2.5 Configure Website Next.js

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@legal-mind/ui', '@legal-mind/database', '@legal-mind/validators'],

  images: {
    domains: [],
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
```

### 2.6 Configure CMS Next.js

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@legal-mind/ui', '@legal-mind/database', '@legal-mind/validators'],

  experimental: {
    instrumentationHook: true,
  },

  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
```

### 2.7 Setup Folder Structure - Website

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind/apps/website

# Create app routes
mkdir -p app/\(marketing\)/{pricing,o-nas,kontakt}
mkdir -p app/survey/[token]/success
mkdir -p app/api/survey/submit
mkdir -p app/api/calendar/slots

# Create features
mkdir -p features/{survey,marketing}/{components,__tests__}

# Create components
mkdir -p components/{layout,shared}

# Create lib
mkdir -p lib/{supabase,utils}
```

### 2.8 Setup Folder Structure - CMS

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms

# Create app routes
mkdir -p app/login
mkdir -p app/admin/{surveys,responses,calendar,settings}
mkdir -p app/admin/surveys/{new,[id]}
mkdir -p app/admin/responses/[id]
mkdir -p app/api/{auth,surveys,responses,calendar}

# Create features
mkdir -p features/{surveys,responses,calendar,auth}/{components,__tests__}

# Create components
mkdir -p components/{admin,shared,providers}

# Create lib
mkdir -p lib/{supabase,google-calendar,n8n,utils}

# Create hooks
mkdir -p hooks
```

### 2.9 Setup TanStack Query Provider (CMS only)

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/app/providers.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10,   // 10 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Legal Mind - AI-Powered Legal Intake',
  description: 'Smart legal intake forms with AI qualification and calendar booking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

---

## Phase 3: Create Shared Packages (Week 1, Days 3-4)

### 3.1 Package: @legal-mind/ui

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/ui/package.json`

```json
{
  "name": "@legal-mind/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0"
  }
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/ui/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/ui/src/index.ts`

```typescript
// shadcn/ui components exports
export * from './components/button'
export * from './components/form'
export * from './components/input'
export * from './components/textarea'
export * from './components/select'
export * from './components/calendar'
export * from './components/card'

// Utils
export { cn } from './lib/utils'
```

**Setup shadcn/ui in packages/ui:**

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind/packages/ui

# Initialize shadcn/ui
npx shadcn@latest init -d

# Add components
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add select
npx shadcn@latest add calendar
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

### 3.2 Package: @legal-mind/database

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
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/database/src/index.ts`

```typescript
export * from './types'
export * from './queries/common'
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/database/src/types.ts`

```typescript
// This file will be generated by: npm run generate-types
// For now, placeholder:

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          domain: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          created_at?: string
        }
      }
      // More tables will be added after Supabase setup
    }
  }
}
```

### 3.3 Package: @legal-mind/validators

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/validators/package.json`

```json
{
  "name": "@legal-mind/validators",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/validators/src/index.ts`

```typescript
export * from './survey'
export * from './calendar'
export * from './response'
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/validators/src/survey.ts`

```typescript
import { z } from 'zod'

export const surveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  questions: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'textarea', 'email', 'tel', 'select', 'radio', 'checkbox']),
    label: z.string().min(1),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })),
})

export type Survey = z.infer<typeof surveySchema>
```

### 3.4 Package: @legal-mind/config

Create shared ESLint and TypeScript configs (optional for now, can be added later).

---

## Phase 4: Supabase Setup (Week 1, Days 4-5)

### 4.1 Initialize Supabase

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind

# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start
```

### 4.2 Create Database Schema

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/supabase/migrations/20250101000001_initial_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table (law firms)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (lawyers within tenants)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  google_calendar_token JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create surveys table
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create survey_links table (unique tokens for clients)
CREATE TABLE survey_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  client_email TEXT,
  expires_at TIMESTAMPTZ,
  max_submissions INT DEFAULT 1,
  submission_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_link_id UUID NOT NULL REFERENCES survey_links(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  ai_qualification JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'disqualified', 'contacted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES users(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  google_calendar_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_surveys_tenant ON surveys(tenant_id);
CREATE INDEX idx_responses_tenant ON responses(tenant_id);
CREATE INDEX idx_responses_status ON responses(status);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_lawyer ON appointments(lawyer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their tenant's data)
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own tenant users"
  ON users FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own tenant responses"
  ON responses FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own tenant appointments"
  ON appointments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Public access to survey links (for client form)
CREATE POLICY "Anyone can view survey links by token"
  ON survey_links FOR SELECT
  USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.3 Generate TypeScript Types

```bash
cd /Users/marcinjucha/Prywatne/projects/legal-mind

# Generate types from Supabase
supabase gen types typescript --local > packages/database/src/types.ts
```

### 4.4 Setup Supabase Clients (Both Apps)

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@legal-mind/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/lib/supabase/server.ts` (and same for `apps/cms/`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@legal-mind/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**File:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/middleware.ts` (CMS only - protects all admin routes)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',  // Protect only /admin routes
    '/((?!_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Phase 5: Environment Variables Setup

### 5.1 Development Environment

**Website:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# n8n Webhooks
N8N_WEBHOOK_URL=http://localhost:5678/webhook/form-submit
```

**CMS:** `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# n8n Webhooks
N8N_WEBHOOK_URL=http://localhost:5678/webhook/form-submit
N8N_WEBHOOK_BOOKING_URL=http://localhost:5678/webhook/booking

# OpenAI (for future AI qualification)
OPENAI_API_KEY=sk-your-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5.2 Production Environment (Vercel)

Add these via Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (production callback URL)
- `N8N_WEBHOOK_URL` (production n8n instance)
- `OPENAI_API_KEY`

---

## Phase 6: Vercel Deployment Configuration

### 6.1 Deploy Website App

**Vercel Project #1: legal-mind-website**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy website
cd /Users/marcinjucha/Prywatne/projects/legal-mind
vercel --cwd apps/website

# Configure in Vercel dashboard:
# - Root Directory: apps/website
# - Build Command: cd ../.. && turbo run build --filter=@legal-mind/website
# - Install Command: npm install
# - Output Directory: .next
# - Framework Preset: Next.js
```

**Environment Variables (Website - Vercel Dashboard):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `N8N_WEBHOOK_URL`
- `NEXT_PUBLIC_APP_URL`

### 6.2 Deploy CMS App

**Vercel Project #2: legal-mind-cms**

```bash
# Deploy CMS
cd /Users/marcinjucha/Prywatne/projects/legal-mind
vercel --cwd apps/cms

# Configure in Vercel dashboard:
# - Root Directory: apps/cms
# - Build Command: cd ../.. && turbo run build --filter=@legal-mind/cms
# - Install Command: npm install
# - Output Directory: .next
# - Framework Preset: Next.js
```

**Environment Variables (CMS - Vercel Dashboard):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (production callback URL)
- `N8N_WEBHOOK_URL`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`

### 6.3 Configure Domains

**Initial Setup (Single Domain):**
- `legalmind.pl` → Website app
- `legalmind.pl/survey/*` → Website app (same app handles survey routes)

**Future Setup (Multiple Subdomains):**
- `legalmind.pl` → Website app
- `app.legalmind.pl` → CMS app

Configure in Vercel Dashboard → Domains for each project.

---

## Phase 7: Implementation Roadmap (Week 2-4)

### Week 2: Authentication & Admin Foundation

**Days 1-2: Authentication**
- Implement Supabase Auth login page
- Google OAuth integration
- Session management
- Protected routes middleware

**Days 3-4: Admin Layout**
- Admin sidebar navigation
- Dashboard overview page
- Tenant context (current logged-in tenant)

**Day 5: Survey Management - List View**
- Surveys list page with TanStack Query
- Create/Edit/Delete actions
- Status filtering

### Week 3: Survey Builder & Form Rendering

**Days 1-3: Survey Builder (CMS)**
- Drag-drop question builder
- Question type components (text, email, select, etc.)
- Preview mode
- Generate survey link

**Days 4-5: Client Survey Form**
- Dynamic form rendering from JSON
- React Hook Form integration
- Validation with Zod
- Submit to API

### Week 4: Calendar Integration

**Days 1-2: Google Calendar API**
- OAuth flow for lawyers
- Fetch available slots
- Create events API

**Days 3-4: Calendar Booking UI**
- Date picker component
- Time slot selection
- Booking confirmation
- Double-booking prevention

**Day 5: n8n Integration**
- Form submission webhook
- AI qualification workflow (future)
- Email notifications

---

## Migration Path: Subdomain Strategy (Future)

Already set up for subdomains! Simply configure DNS:

### Step 1: Configure DNS in Vercel

**Website Project:**
- Add domain: `legalmind.pl`

**CMS Project:**
- Add domain: `app.legalmind.pl`

### Step 2: Update Environment Variables

**Website `.env.production`:**
```bash
NEXT_PUBLIC_APP_URL=https://legalmind.pl
```

**CMS `.env.production`:**
```bash
NEXT_PUBLIC_APP_URL=https://app.legalmind.pl
GOOGLE_REDIRECT_URI=https://app.legalmind.pl/api/auth/google/callback
```

### Step 3: Deploy

Both apps are already separate - just point DNS records and redeploy!

---

## Critical Files Reference

### Essential Files to Create First

1. `/Users/marcinjucha/Prywatne/projects/legal-mind/package.json` - Root workspace
2. `/Users/marcinjucha/Prywatne/projects/legal-mind/turbo.json` - Turborepo config
3. `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/package.json` - Website app
4. `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/package.json` - CMS app
5. `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/next.config.js` - Website config
6. `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/next.config.js` - CMS config
7. `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/app/providers.tsx` - TanStack Query
8. `/Users/marcinjucha/Prywatne/projects/legal-mind/apps/cms/middleware.ts` - Auth protection
9. `/Users/marcinjucha/Prywatne/projects/legal-mind/supabase/migrations/20250101000001_initial_schema.sql` - Database
10. `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/ui/package.json` - UI package
11. `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/database/package.json` - Database types
12. `/Users/marcinjucha/Prywatne/projects/legal-mind/packages/validators/package.json` - Validators

### Feature Implementation Order

**Website App:**
1. **Marketing** → `/apps/website/features/marketing/` (Hero, Features, Pricing)
2. **Survey** → `/apps/website/features/survey/` (SurveyForm, CalendarBooking)

**CMS App:**
1. **Auth** → `/apps/cms/features/auth/` (Login, Session management)
2. **Surveys** → `/apps/cms/features/surveys/` (Builder, List, Preview)
3. **Responses** → `/apps/cms/features/responses/` (List, Detail, AI results)
4. **Calendar** → `/apps/cms/features/calendar/` (Google Calendar integration)

---

## Key Decisions Summary

✅ **Architecture:** Full Turborepo with 2 Next.js applications
✅ **Applications:**
  - `website` - Public landing page + survey forms
  - `cms` - Admin panel for law firms
✅ **State Management:** TanStack Query for CMS admin panel + calendar
✅ **Validation:** Zod schemas in shared package (@legal-mind/validators)
✅ **UI Components:** shadcn/ui in shared package (@legal-mind/ui)
✅ **Database:** Supabase with RLS for multi-tenancy
✅ **Deployment:** 2 Vercel projects (website + cms)
✅ **Domain Strategy:** Single domain initially, easy migration to subdomains
✅ **Folder Structure:** ADR-005 pattern (app/ for routing, features/ for logic)

---

## Survey Flow Summary

1. **Lawyer (CMS)** creates survey → generates unique link
2. **Client (Website)** receives email → clicks link → fills form
3. **n8n + AI** analyzes answers → qualifies client
4. **Client (Website)** sees calendar → books appointment
5. **Lawyer (CMS)** receives notification + sees response in dashboard
6. **Google Calendar** automatically creates event

---

## Next Steps After Plan Approval

1. Initialize Turborepo structure
2. Create 2 Next.js apps (website + cms)
3. Setup shared packages (ui, database, validators)
4. Initialize Supabase and run migrations
5. Configure authentication flow (CMS only)
6. Build marketing pages (website)
7. Build survey form (website)
8. Build survey builder (cms)
9. Integrate Google Calendar (cms)
10. Setup n8n workflows

This plan provides a solid foundation for long-term growth while maintaining clean architecture and supporting your team expansion plans.
