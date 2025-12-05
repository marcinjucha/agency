# ADR-005: App vs Features Separation (Hybrid Approach)

**Status:** Accepted
**Date:** 2025-01-22
**Decision Makers:** Architecture Team
**Tags:** #architecture #structure #nextjs #organization

---

## Context

Next.js App Router encourages route colocation - placing components, actions, and logic alongside route files. However, this creates **structural confusion** as projects grow:

### The Problem

```
app/pages/
├── page.tsx              # Route: /pages
├── [id]/                 # Route: /pages/[id]
│   ├── edit/             # Route: /pages/[id]/edit
│   │   ├── page.tsx
│   │   ├── actions.ts    # ❌ Belongs to 'edit'? Or 'pages'?
│   │   └── components/   # ❌ Belongs to 'edit'? Or '[id]'?
│   │       ├── Canvas.tsx
│   │       └── Toolbar.tsx
```

**Issues:**
1. **Unclear ownership** - Hard to tell what belongs to which route
2. **Routing vs Logic mixing** - Can't distinguish route structure from feature logic
3. **Poor scalability** - Complex features get deeply nested in app/
4. **Difficult refactoring** - Moving routes means moving all logic
5. **Onboarding confusion** - New developers don't know where to put code

### Requirements

1. **Clear separation** between routing and business logic
2. **Easy navigation** - Find feature code quickly
3. **Reusability** - Share logic across multiple routes
4. **Next.js compliance** - Don't fight the framework
5. **Maintainability** - Scale to 20+ features

## Decision

**We will use a Hybrid Approach: `app/` for routing only, `features/` for all business logic.**

### Structure

```
apps/cms-panel/
├── app/                           # ← ROUTING ONLY
│   ├── (dashboard)/
│   │   ├── pages/
│   │   │   ├── page.tsx          # Imports from features/pages
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx  # Imports from features/pages
│   │   │
│   │   └── articles/
│   │       └── page.tsx          # Imports from features/articles
│   │
│   └── layout.tsx
│
├── features/                      # ← BUSINESS LOGIC
│   ├── pages/                    # Feature: Page Management
│   │   ├── components/
│   │   │   ├── PageList.tsx
│   │   │   └── PageEditor/
│   │   │       ├── Canvas.tsx
│   │   │       ├── Toolbar.tsx
│   │   │       └── PropertyEditor.tsx
│   │   │
│   │   ├── actions.ts            # Server Actions
│   │   ├── queries.ts            # Supabase queries
│   │   ├── validations.ts        # Zod schemas
│   │   └── types.ts              # TypeScript types
│   │
│   ├── articles/                 # Feature: Articles
│   └── layout-builder/           # Feature: Layout Builder
│
└── lib/                           # ← UTILITIES
    ├── supabase/
    └── utils/
```

### Rules

**app/ directory:**
- ✅ `page.tsx` - Route entry points
- ✅ `layout.tsx` - Route layouts
- ✅ `loading.tsx`, `error.tsx`, `not-found.tsx` - Next.js special files
- ✅ Route groups: `(auth)`, `(dashboard)`
- ❌ **NO** components/
- ❌ **NO** actions.ts
- ❌ **NO** business logic

**features/ directory:**
- ✅ All UI components
- ✅ Server Actions
- ✅ Data queries
- ✅ Validations
- ✅ Types
- ✅ Stores (Zustand)
- ✅ Feature-specific utilities

**lib/ directory:**
- ✅ Shared utilities
- ✅ Supabase client setup
- ✅ Common helpers

## Rationale

### Why Separate app/ and features/?

**1. Clear Mental Model**

```
app/          → "Where is this in the URL?"
features/     → "What does this feature do?"
lib/          → "What utilities are available?"
```

**2. Easy Code Discovery**

```typescript
// ❌ Before: Where is the Canvas component?
app/pages/[id]/edit/components/Canvas.tsx?
app/pages/components/Canvas.tsx?
components/Canvas.tsx?

// ✅ After: Obvious!
features/pages/components/PageEditor/Canvas.tsx
```

**3. Feature Reusability**

```typescript
// Use PageEditor in multiple routes
app/pages/[id]/edit/page.tsx → <PageEditor />
app/templates/[id]/edit/page.tsx → <PageEditor />

// Logic stays in ONE place
features/pages/components/PageEditor/
```

**4. Simplified Routing Files**

```typescript
// app/pages/[id]/edit/page.tsx
import { PageEditor } from '@/features/pages/components/PageEditor';

export default function EditPagePage({ params }: { params: { id: string } }) {
  return <PageEditor pageId={params.id} />;
}

// That's it! Just import and render.
```

**5. Testability**

```typescript
// Test feature logic, not routes
import { createPage } from '@/features/pages/actions';

test('should create page', async () => {
  const result = await createPage({ title: 'Test' });
  expect(result.success).toBe(true);
});

// No need to test app/pages/page.tsx - it just imports and renders
```

### Alternatives Considered

#### Alternative 1: Pure App Router (Everything in app/)

```
app/pages/
├── page.tsx
├── actions.ts
├── components/
│   ├── PageList.tsx
│   └── PageCard.tsx
└── [id]/
    └── edit/
        ├── page.tsx
        ├── actions.ts
        └── components/
            ├── Canvas.tsx
            └── Toolbar.tsx
```

**Pros:**
✅ Follows Next.js conventions exactly
✅ Route colocation

**Cons:**
❌ **Routing structure mixes with feature structure**
❌ Unclear what belongs where
❌ Hard to reuse components across routes
❌ Deep nesting for complex features
❌ Difficult to refactor

**Decision: Rejected** - Poor scalability and clarity

#### Alternative 2: Traditional Clean Architecture (features/ with use-cases + repos)

```
features/pages/
├── components/
├── use-cases/
│   ├── create-page-use-case.ts
│   └── update-page-use-case.ts
├── repositories/
│   └── pages-repository.ts
└── actions/
    └── create-page-action.ts
```

**Pros:**
✅ Maximum abstraction
✅ Framework-agnostic
✅ Perfect testability

**Cons:**
❌ **Over-engineered for CRUD operations**
❌ Too many layers (Action → Use Case → Repository → DB)
❌ High boilerplate
❌ Fights Next.js conventions

**Decision: Rejected** - Overkill for this project

#### Alternative 3: Component Library Pattern (components/ + hooks/)

```
components/pages/
├── PageList.tsx
├── PageEditor.tsx
└── PageCard.tsx

hooks/
├── usePages.ts
└── usePageEditor.ts

actions/
└── pages.ts
```

**Pros:**
✅ Simple structure
✅ Easy to understand

**Cons:**
❌ **No feature grouping** - pages split across folders
❌ Doesn't scale to 20+ features
❌ Hard to find related code

**Decision: Rejected** - Poor organization for large codebases

## Implementation

### Phase 1: Create Structure

```bash
cd apps/cms-panel

# Create features/ directory
mkdir -p features/{pages,articles,layout-builder,media,users}

# Each feature gets these folders
mkdir -p features/pages/{components,__tests__}
touch features/pages/{actions.ts,queries.ts,validations.ts,types.ts}
```

### Phase 2: Define Feature Structure Template

```
features/[feature-name]/
├── components/              # UI components
│   ├── [FeatureName]List.tsx
│   ├── [FeatureName]Editor/
│   │   ├── index.tsx
│   │   └── [SubComponents].tsx
│   └── [FeatureName]Card.tsx
│
├── actions.ts              # Server Actions
├── queries.ts              # Data fetching (Supabase)
├── validations.ts          # Zod schemas
├── types.ts                # TypeScript types
├── constants.ts            # Constants (optional)
├── utils.ts                # Feature utilities (optional)
│
├── __tests__/              # Tests
│   ├── actions.test.ts
│   ├── queries.test.ts
│   └── components/
│       └── [Component].test.tsx
│
└── README.md               # Feature documentation
```

### Phase 3: Implement Example Feature

**Example: Pages Feature**

```typescript
// features/pages/types.ts
export interface Page {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  layout_data: LayoutData;
  created_at: string;
  updated_at: string;
}

export interface CreatePageInput {
  title: string;
  slug: string;
}
```

```typescript
// features/pages/validations.ts
import { z } from 'zod';

export const pageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

export const layoutDataSchema = z.object({
  version: z.string(),
  breakpoints: z.object({
    desktop: z.any(), // ComponentTree
    tablet: z.any().optional(),
    mobile: z.any().optional(),
  }),
});
```

```typescript
// features/pages/queries.ts
import { createClient } from '@/lib/supabase/server';

export async function getPages() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPageById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
```

```typescript
// features/pages/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server';
import { pageSchema } from './validations';
import { revalidatePath } from 'next/cache';
import type { CreatePageInput } from './types';

export async function createPage(input: CreatePageInput) {
  // Validation
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error };
  }

  // Data access
  const supabase = await createClient();
  const { data: page, error } = await supabase
    .from('pages')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return { error: 'Failed to create page' };
  }

  // Side effects
  revalidatePath('/pages');

  return { success: true, data: page };
}

export async function updatePage(id: string, updates: Partial<Page>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pages')
    .update(updates)
    .eq('id', id);

  if (error) {
    return { error: 'Failed to update page' };
  }

  revalidatePath('/pages');
  revalidatePath(`/pages/${id}`);

  return { success: true };
}
```

```typescript
// features/pages/components/PageList.tsx
'use client'

import { useQuery } from '@tanstack/react-query';
import { getPages } from '../queries';
import { PageCard } from './PageCard';

export function PageList() {
  const { data: pages, isLoading } = useQuery({
    queryKey: ['pages'],
    queryFn: getPages,
  });

  if (isLoading) {
    return <div>Loading pages...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {pages?.map(page => (
        <PageCard key={page.id} page={page} />
      ))}
    </div>
  );
}
```

```typescript
// features/pages/components/PageEditor/index.tsx
'use client'

import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { PropertyEditor } from './PropertyEditor';
import { useLayoutBuilder } from '@/features/layout-builder/stores/layout-builder-store';
import { updatePage } from '../../actions';

interface PageEditorProps {
  pageId: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const { layoutData, isDirty } = useLayoutBuilder();

  const handleSave = async () => {
    await updatePage(pageId, { layout_data: layoutData });
  };

  return (
    <div className="flex h-screen">
      <Toolbar onSave={handleSave} isDirty={isDirty} />
      <div className="flex-1">
        <Canvas />
      </div>
      <PropertyEditor />
    </div>
  );
}
```

**Then use in routes:**

```typescript
// app/(dashboard)/pages/page.tsx
import { PageList } from '@/features/pages/components/PageList';

export default function PagesPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Pages</h1>
      <PageList />
    </div>
  );
}
```

```typescript
// app/(dashboard)/pages/[id]/edit/page.tsx
import { PageEditor } from '@/features/pages/components/PageEditor';

export default function EditPagePage({ params }: { params: { id: string } }) {
  return <PageEditor pageId={params.id} />;
}
```

### Phase 4: Define Import Rules

```typescript
// ✅ ALLOWED IMPORTS

// 1. app/ can import from features/
import { PageList } from '@/features/pages/components/PageList';

// 2. features/ can import from lib/
import { createClient } from '@/lib/supabase/server';

// 3. features/ can import from packages/
import { Button } from '@cms/ui';

// 4. features/ can import from other features/
import { useLayoutBuilder } from '@/features/layout-builder/stores';

// 5. lib/ can import from packages/
import { Database } from '@cms/database';
```

```typescript
// ❌ FORBIDDEN IMPORTS

// 1. features/ CANNOT import from app/
import { something } from '@/app/pages/page'; // ❌

// 2. lib/ CANNOT import from features/
import { createPage } from '@/features/pages/actions'; // ❌

// 3. packages/ CANNOT import from apps/
import { PageList } from '@cms/panel/features/pages'; // ❌
```

**Dependency Graph:**
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

## Consequences

### Positive

✅ **Crystal clear organization**
- `app/` = routing, `features/` = logic, `lib/` = utilities

✅ **Easy code discovery**
- Looking for Pages logic? → `features/pages/`
- Looking for Articles UI? → `features/articles/components/`

✅ **Better reusability**
- Components can be used across multiple routes
- No tight coupling to route structure

✅ **Simplified routing files**
- `page.tsx` files are tiny (just imports + render)
- Easy to understand what a route does

✅ **Testability**
- Test features independently of routes
- Mock-free Server Actions testing

✅ **Scalability**
- Add new features without touching existing ones
- Clear ownership boundaries

✅ **Onboarding**
- New developers instantly understand structure
- Convention over configuration

### Negative

⚠️ **Extra directory nesting**
- `features/pages/components/PageEditor/Canvas.tsx` vs `app/pages/components/Canvas.tsx`
- *Mitigation:* Clear naming makes this worth it

⚠️ **Potential duplication**
- Feature name repeated: `features/pages/` + `app/pages/`
- *Mitigation:* This is intentional - they serve different purposes

⚠️ **Learning curve**
- Developers used to pure App Router need to learn convention
- *Mitigation:* Simple rules, clear documentation

### Neutral

ℹ️ **Not "pure" Next.js**
- Adds custom convention on top of App Router
- Next.js community may prefer colocation

ℹ️ **Requires discipline**
- Team must follow import rules
- Need ESLint rules to enforce

## Enforcement

### ESLint Rules

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@/app/*"],
            "message": "Features cannot import from app/"
          },
          {
            "group": ["@/features/*"],
            "message": "Lib cannot import from features/"
          }
        ]
      }
    ]
  }
}
```

### Code Review Checklist

- [ ] Is `app/` file only a route entry point?
- [ ] Is all business logic in `features/`?
- [ ] Are imports following the dependency graph?
- [ ] Is feature logic self-contained?

## Documentation

Each feature should have a README:

```markdown
# Pages Feature

## Overview
Manages CMS pages with layout builder integration.

## Components
- `PageList` - Grid view of all pages
- `PageEditor` - Full page editor with Layout Builder
- `PageCard` - Individual page card

## Actions
- `createPage(input)` - Create new page
- `updatePage(id, updates)` - Update page
- `deletePage(id)` - Delete page
- `publishPage(id)` - Publish page

## Queries
- `getPages()` - Get all pages
- `getPageById(id)` - Get single page
- `getPublishedPages()` - Get published pages only

## Usage
```typescript
// In route
import { PageEditor } from '@/features/pages/components/PageEditor';
export default function EditPage() {
  return <PageEditor pageId="123" />;
}
```
```

## Migration Guide

### From Pure App Router

**Before:**
```
app/pages/
├── page.tsx
├── actions.ts
├── components/
│   ├── PageList.tsx
│   └── Canvas.tsx
└── [id]/edit/
    ├── page.tsx
    └── components/
```

**After:**
```
app/pages/
├── page.tsx              # Imports PageList
└── [id]/edit/
    └── page.tsx          # Imports PageEditor

features/pages/
├── components/
│   ├── PageList.tsx      # Moved from app/
│   └── PageEditor/
│       └── Canvas.tsx    # Moved from app/
├── actions.ts            # Moved from app/
└── types.ts
```

**Steps:**
1. Create `features/pages/` directory
2. Move `components/` → `features/pages/components/`
3. Move `actions.ts` → `features/pages/actions.ts`
4. Update imports in `app/pages/page.tsx`
5. Test that everything still works

## References

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

## Related Decisions

- [ADR-001: Monorepo Structure](./001-monorepo-structure.md)
- [ADR-003: Plugin System Scope](./003-plugin-system-mvp-scope.md)
- [ADR-004: Layout Builder State](./004-layout-builder-state-zustand.md)

---

**Last Updated:** 2025-01-22
**Reviewed By:** Architecture Team
