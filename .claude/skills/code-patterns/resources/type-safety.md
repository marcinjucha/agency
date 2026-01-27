# Type Safety: Supabase Generic Types

## The Problem: `any` Type is an Anti-Pattern

When querying with nested relations, Supabase returns generic JSON types.

```typescript
// ❌ WRONG: Using `any` bypasses type safety
const { data, error } = await supabase.from('responses').select('*')
return (data || []).map((item: any) => ({  // ← any type!
  id: item.id,
  status: item.status,
  surveys: {
    title: item.survey_links?.surveys?.title
  }
}))
```

**Problems:**
- No TypeScript type checking
- IDE autocomplete doesn't work
- Runtime errors not caught at compile time
- Defeats purpose of using TypeScript

---

## Solution: Define Proper Types

### Step 1: Define the raw Supabase response type

```typescript
// Define nested structure exactly as Supabase returns it
type SupabaseResponseRow = Tables<'responses'> & {
  survey_links: (Tables<'survey_links'> & {
    surveys: Tables<'surveys'>
  }) | null
}
```

### Step 2: Create transform function with explicit typing

```typescript
function transformToListItem(data: SupabaseResponseRow): ResponseListItem {
  return {
    id: data.id,
    status: (data.status as ResponseListItem['status']),
    created_at: data.created_at,
    survey_links: {
      survey_id: data.survey_links?.survey_id || '',
    },
    surveys: {
      title: data.survey_links?.surveys?.title || 'Unknown Survey',
    },
  }
}
```

### Step 3: Use proper type casting in query

```typescript
export async function getResponses(): Promise<ResponseListItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('responses')
    .select(`
      *,
      survey_links(id, token, survey_id, surveys(id, title))
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // ✅ Type-safe transformation
  return (data as SupabaseResponseRow[] || []).map(transformToListItem)
}
```

---

## When Casting is Necessary

### 1. Supabase `Json` type → Strict TypeScript type

```typescript
// Supabase returns Json (could be null, any value)
// We know it's actually a Question[]
questions: (data.survey_links.surveys.questions ?? []) as Question[]
```

### 2. Generic database string → Enum type

```typescript
// Database status column is text, but we have ResponseStatus enum
status: (data.status as ResponseListItem['status'])
```

### 3. Nested object transformation

```typescript
// Create intermediate typed variable, then cast to final type
const surveyLinkContext: ResponseSurveyLinkContext = {...}
surveys: (surveyLinkContext as any)  // ← Justified if types differ
```

**Rule:** Comment why casting is needed if it's not obvious.

```typescript
// Cast Json type from Supabase to our strict Question[] type
// Supabase doesn't preserve array generics through Json columns
questions: (data.survey_links.surveys.questions ?? []) as Question[]
```

---

## When `as any` is Never Okay

These patterns should NEVER appear without justification:

```typescript
// ❌ BAD: No clear reason
const item: any = data
const response: ResponseListItem = item as any

// ❌ BAD: Lazy workaround
map((item: any) => processItem(item))

// ❌ BAD: Missing types entirely
return data.map((item) => ({ ...item }))
```

---

## Better Approach: Create Proper Subset Types

Instead of casting everything at the end, create types that match what you query:

```typescript
// apps/cms/features/responses/types.ts
export interface ResponseSurveyLinkContext {
  id: string
  token: string
  survey_id: string
  // Only include fields you actually select from Supabase
}

// Then use it in ResponseWithRelations
export interface ResponseWithRelations {
  // ...
  survey_links?: ResponseSurveyLinkContext  // ← No casting needed!
}
```

---

## Pattern Summary

```typescript
// 1. Define raw Supabase structure
type SupabaseRow = Tables<'responses'> & {
  survey_links: (Tables<'survey_links'> & {
    surveys: Tables<'surveys'>
  }) | null
}

// 2. Create transform function with explicit return type
function transform(data: SupabaseRow): ResponseListItem {
  return {
    // Explicit field mapping
    id: data.id,
    title: data.survey_links?.surveys?.title || 'Unknown'
  }
}

// 3. Use in query with single type cast
export async function getResponses(): Promise<ResponseListItem[]> {
  const { data, error } = await supabase.from('responses').select('...')
  if (error) throw error

  // ✅ One cast to match raw structure, transform ensures type safety
  return (data as SupabaseRow[] || []).map(transform)
}
```

---

## Key Points

- ✅ Define raw Supabase types to match your `.select()` query
- ✅ Create transformation functions with explicit return types
- ✅ Use only ONE type cast (converting raw Supabase data)
- ✅ Transformation functions handle all type conversions
- ✅ Never use `any` for component data after transformation
- ✅ Create subset types for nested relations to avoid type mismatches
- ⚠️ Comment why casting is needed if it's non-obvious
