# packages/ - Shared Packages

This directory contains code shared between `apps/website` and `apps/cms`.

## Purpose

Prevent code duplication by extracting common functionality into reusable packages.

## Structure

```
packages/
├── ui/          # Shared UI components (shadcn/ui)
├── database/    # Supabase types (auto-generated)
└── validators/  # Zod validation schemas
```

## Packages

### packages/ui/
**Purpose:** Shared UI component library

**Contains:**
- shadcn/ui components (Button, Input, Card, Label, etc.)
- `cn()` utility for className merging
- Tailwind CSS theme (globals.css)

**Usage:**
```typescript
import { Button, Card } from '@legal-mind/ui'

function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}
```

**When to add components:**
- Used in 2+ apps (website AND cms)
- Generic UI primitives (buttons, inputs, cards)
- shadcn/ui components

**When NOT to add:**
- App-specific components (use features/ instead)
- One-off components (keep in app)

### packages/database/
**Purpose:** Single source of truth for database types

**Contains:**
- `src/types.ts` - Auto-generated from Supabase schema
- Type helpers: `Tables<'surveys'>`, `TablesInsert<'surveys'>`

**Usage:**
```typescript
import type { Database, Tables } from '@legal-mind/database'

type Survey = Tables<'surveys'>

const supabase = createClient<Database>()
const { data } = await supabase.from('surveys').select('*')
// data is typed as Survey[]
```

**Regenerate types:**
```bash
npm run db:types
# Or manually:
supabase gen types typescript --linked > packages/database/src/types.ts
```

**When to regenerate:**
- After changing database schema
- After running migrations
- After adding/removing tables

### packages/validators/
**Purpose:** Shared validation logic with Zod

**Contains:**
- `src/survey.ts` - Survey validation schema
- `src/calendar.ts` - Calendar validation (future)
- `src/response.ts` - Response validation (future)

**Usage:**
```typescript
import { surveySchema } from '@legal-mind/validators'

// Validate survey structure
const result = surveySchema.parse(data)

// Use with React Hook Form
const form = useForm({
  resolver: zodResolver(surveySchema)
})
```

**When to add schemas:**
- Validation logic used in multiple apps
- Client + server validation (same schema)
- Example: Survey structure validated in CMS (create) and Website (submit)

## Package Development

### Adding a New Component to UI

```bash
cd packages/ui

# Add shadcn/ui component
npx shadcn@latest add button

# Export from index.ts
echo "export { Button } from './components/ui/button'" >> src/index.ts

# Use in apps
import { Button } from '@legal-mind/ui'
```

### Creating a New Package

```bash
mkdir -p packages/new-package/src
cd packages/new-package

# Create package.json
cat > package.json <<EOF
{
  "name": "@legal-mind/new-package",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
EOF

# Create index.ts
touch src/index.ts
```

## TypeScript Configuration

All packages extend root `tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

## Build & Transpilation

Packages are **NOT pre-built**. They're transpiled on-demand by Next.js:

```typescript
// next.config.ts (in apps)
transpilePackages: [
  '@legal-mind/ui',
  '@legal-mind/database',
  '@legal-mind/validators'
]
```

This means:
- ✅ No build step needed for packages
- ✅ Fast iteration (change package → app hot-reloads)
- ✅ TypeScript types work seamlessly

## Import Aliases

**From apps:**
```typescript
import { Button } from '@legal-mind/ui'
import type { Database } from '@legal-mind/database'
import { surveySchema } from '@legal-mind/validators'
```

**Within packages:**
```typescript
// Use relative imports
import { cn } from '../lib/utils'
```

## When to Create a Package

**Create package if:**
- ✅ Used in 2+ apps
- ✅ Has clear API boundary
- ✅ Changes infrequently
- ✅ Benefits from centralization

**Don't create package if:**
- ❌ Used in only 1 app (keep in app)
- ❌ Too app-specific
- ❌ Changes frequently with app
- ❌ Would create circular dependencies

## Dependencies

**Add dependency to package:**
```bash
# From root
npm install react --workspace=@legal-mind/ui

# Or directly
cd packages/ui
npm install react
```

**Note:** React, React-DOM must match versions across all packages and apps.

## Related Documentation

- [ADR-006: Shared Code Pattern](../adr/006-legal-mind-project-structure.md#3-shared-code-pattern)
- [Architecture](../docs/ARCHITECTURE.md)
