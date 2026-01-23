# Shared State Components

**Location:** `apps/{app}/components/shared/`

These components standardize loading, error, and empty states across applications.

---

## LoadingState

**Variants:** `spinner`, `skeleton-table`, `skeleton-list`, `skeleton-card`

### Spinner (centered, with optional message)

```typescript
import { LoadingState } from '@/components/shared'

<LoadingState variant="spinner" message="Loading surveys..." />
```

### Skeleton Table (default 5 rows)

```typescript
<Card className="p-6">
  <LoadingState variant="skeleton-table" rows={5} />
</Card>
```

### Skeleton List (text lines)

```typescript
<LoadingState variant="skeleton-list" rows={3} />
```

### Skeleton Card (multiple elements)

```typescript
<LoadingState variant="skeleton-card" rows={2} />
```

**Theme tokens:**
- Spinner: `border-primary`, `text-muted-foreground`
- Skeleton: `bg-muted` (via Skeleton component)

---

## ErrorState

**Variants:** `card`, `inline`

### Card Variant (with padding)

```typescript
import { ErrorState } from '@/components/shared'

<ErrorState
  title="Failed to load appointments"
  message={error.message}
  onRetry={() => refetch()}
  variant="card"
/>
```

### Inline Variant (no card wrapper)

```typescript
<ErrorState
  message={error.message}
  variant="inline"
/>
```

**Props:**
- `title` (optional) - Error heading
- `message` (required) - Error details
- `onRetry` (optional) - Retry callback, shows retry button
- `variant` - `"card"` (default) or `"inline"`

**Theme tokens:**
- Icon: `text-destructive`
- Border: `border-destructive/50`
- Background: `bg-destructive/5` (card), `bg-destructive/10` (inline)

**Features:**
- AlertCircle icon from Lucide
- Accessible: `role="alert"`, `aria-live="polite"`

---

## EmptyState

**Variants:** `card`, `inline`

### Card Variant (with padding)

```typescript
import { EmptyState } from '@/components/shared'
import { CalendarCheck } from 'lucide-react'

<EmptyState
  icon={CalendarCheck}
  title="No appointments found"
  description="Appointments will appear here after clients book time slots."
  variant="card"
/>
```

### Inline Variant (with action)

```typescript
import { FileText, Plus } from 'lucide-react'
import { Button } from '@legal-mind/ui'
import Link from 'next/link'

<EmptyState
  icon={FileText}
  title="No surveys"
  description="Get started by creating a new survey."
  action={
    <Link href="/admin/surveys/new">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Survey
      </Button>
    </Link>
  }
/>
```

**Props:**
- `icon` (required) - Lucide icon component
- `title` (required) - Empty state heading
- `description` (optional) - Explanation text
- `action` (optional) - ReactNode, typically a button
- `variant` - `"inline"` (default) or `"card"`

**Theme tokens:**
- Icon: `text-muted-foreground` (12x12 size)
- Title: `text-foreground`, `text-lg font-semibold`
- Description: `text-muted-foreground`, `text-sm`

---

## Usage Pattern in Components

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState, EmptyState } from '@/components/shared'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys, isLoading, error, refetch } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) {
    return <LoadingState variant="skeleton-table" rows={5} />
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load surveys"
        message={error.message}
        onRetry={() => refetch()}
      />
    )
  }

  if (!surveys?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No surveys"
        description="Get started by creating a new survey."
        action={<CreateSurveyButton />}
      />
    )
  }

  return (
    <div>
      {surveys.map(survey => <SurveyCard key={survey.id} survey={survey} />)}
    </div>
  )
}
```

---

## Cross-App Consistency

Both CMS and Website apps have identical shared components with the same API:
- `apps/cms/components/shared/LoadingState.tsx`
- `apps/cms/components/shared/ErrorState.tsx`
- `apps/cms/components/shared/EmptyState.tsx`
- `apps/website/components/shared/LoadingState.tsx`
- `apps/website/components/shared/ErrorState.tsx`
- `apps/website/components/shared/EmptyState.tsx`

This ensures consistent UX across the platform.
