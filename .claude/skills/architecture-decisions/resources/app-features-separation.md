# ADR-005: App vs Features Separation

## Decision

Use Hybrid Approach: `app/` for routing only, `features/` for all business logic.

## Structure

```
apps/cms/
├── app/                           # ← ROUTING ONLY
│   ├── (dashboard)/
│   │   ├── surveys/
│   │   │   ├── page.tsx          # Imports from features/
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   └── responses/
│   │       └── page.tsx
│   └── layout.tsx
│
├── features/                      # ← BUSINESS LOGIC
│   ├── surveys/
│   │   ├── components/
│   │   │   ├── SurveyList.tsx
│   │   │   └── SurveyBuilder/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── types.ts
│   │
│   └── responses/
│       ├── components/
│       ├── actions.ts
│       └── queries.ts
│
└── lib/                           # ← UTILITIES
    ├── supabase/
    └── utils/
```

## Rules

### app/ directory
- ✅ `page.tsx` - Route entry points
- ✅ `layout.tsx` - Route layouts
- ✅ `loading.tsx`, `error.tsx`, `not-found.tsx`
- ✅ Route groups: `(auth)`, `(dashboard)`
- ❌ **NO** components/
- ❌ **NO** actions.ts
- ❌ **NO** business logic

### features/ directory
- ✅ All UI components
- ✅ Server Actions
- ✅ Data queries
- ✅ Validations
- ✅ Types
- ✅ Feature-specific utilities

### lib/ directory
- ✅ Shared utilities
- ✅ Supabase client setup
- ✅ Common helpers

## Feature Structure Template

```
features/[feature-name]/
├── components/
│   ├── [FeatureName]List.tsx
│   ├── [FeatureName]Editor/
│   │   ├── index.tsx
│   │   └── [SubComponents].tsx
│   └── [FeatureName]Card.tsx
│
├── actions.ts              # Server Actions
├── queries.ts              # Data fetching
├── validations.ts          # Zod schemas
├── types.ts                # TypeScript types
└── utils.ts                # Feature utilities (optional)
```

## Route Page Pattern

```typescript
// apps/cms/app/admin/surveys/page.tsx
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return (
    <div>
      <h1>Surveys</h1>
      <SurveyList />
    </div>
  )
}
// That's it! Just import and render.
```

## Import Rules

```typescript
// ✅ ALLOWED
import { PageList } from '@/features/pages/components/PageList'  // app → features
import { createClient } from '@/lib/supabase/server'              // features → lib
import { Button } from '@agency/ui'                           // features → packages
import { useLayoutBuilder } from '@/features/layout-builder/stores'  // features → features

// ❌ FORBIDDEN
import { something } from '@/app/pages/page'        // features → app
import { createPage } from '@/features/pages/actions' // lib → features
```

## Dependency Graph

```
┌─────────────┐
│   app/      │  ← Routes (imports from features/)
├─────────────┤
│  features/  │  ← Business logic (imports from lib/ + packages/)
├─────────────┤
│   lib/      │  ← Utilities (imports from packages/)
├─────────────┤
│  packages/  │  ← Shared code (no app-specific imports)
└─────────────┘
```

## Why This Approach?

**Clear Mental Model:**
- `app/` → "Where is this in the URL?"
- `features/` → "What does this feature do?"
- `lib/` → "What utilities are available?"

**Easy Code Discovery:**
```typescript
// Where is the SurveyBuilder component?
features/surveys/components/SurveyBuilder/  // Obvious!
```

**Feature Reusability:**
```typescript
// Use SurveyBuilder in multiple routes
app/admin/surveys/[id]/edit/page.tsx → <SurveyBuilder />
app/admin/templates/[id]/edit/page.tsx → <SurveyBuilder />
```

**Testability:**
```typescript
// Test feature logic, not routes
import { createSurvey } from '@/features/surveys/actions'

test('should create survey', async () => {
  const result = await createSurvey({ title: 'Test' })
  expect(result.success).toBe(true)
})
```
