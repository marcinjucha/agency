# TanStack Start: Server/Client Boundary Patterns

Guide jak strukturyzować server-only kod (`createServerFn`, `*.server.ts` files) żeby uniknąć `node:async_hooks` AsyncLocalStorage crashów w client lazy chunks.

**Kontext**: Halo Efekt CMS (TanStack Start v1.167 + Vite 8). Sesja 2026-05-01 zidentyfikowała pattern który dropped 27 commits boundary refactoru i naprawił crash JEDNYM zmianą.

---

## TL;DR — kiedy dynamic import vs top-level

| Pattern | Top-level OK? | Dlaczego |
|---|---|---|
| `import type { X } from './foo.server'` | ✅ Zawsze | TypeScript erase'uje przy compile, zero runtime |
| `import { x } from '@/lib/leaf.server'` (single, leaf utility) | ✅ Tak | TanStack Start strippuje z lazy chunks |
| `import { a, b, c } from './handlers.server'` (1-3 named, used w 1-3 lambdach) | ✅ Tak | Strip nadal działa |
| `import { a, b, c, d, e, ..., n } from './handlers.server'` (barrel, 5+) | ❌ **DYNAMIC** | Strip skip — bundler musi keep reference |
| `export { x } from './foo.server'` (runtime re-export) | ❌ **ASYNC WRAPPER** | Re-export forces strip block |

---

## Background — jak działa strip TanStack Start

TanStack Start ma compile-time transform który dla każdego `createServerFn(...).handler(<lambda>)`:

- **Server bundle**: lambda zostaje z pełną logiką
- **Client bundle**: lambda body jest **stripped** — zastąpiony fetch stub:
  ```ts
  // Co piszesz:
  export const getFooFn = createServerFn().handler(async () => {
    const supabase = createServerClient()
    return supabase.from('foo').select('*')
  })

  // Co klient widzi po strip:
  export const getFooFn = (input) => fetch('/_server/getFoo', ...)
  ```

**Top-level imports w pliku z createServerFn**:
- TanStack Start próbuje strippować `import` statements które są używane TYLKO w stripped lambdas
- Strip działa gdy reference do imported symbol jest CZYSTY w stripped lambda body
- Strip **nie działa** gdy:
  - Import jest barrel (5+ named) — bundler conservative, keeps statement
  - Import jest re-exported z pliku — re-export wymaga reference żywa
  - Import jest cross-cutting (used w wielu lambdas + outside lambda code)

---

## Trzy patterny

### Pattern 1: Direct leaf import (✅ idiomatyczny dla wszystkich features)

```ts
// features/blog/server.ts (DZIAŁA)
import { createServerFn } from '@tanstack/react-start'
import { createServerClient } from '@/lib/supabase/server-start.server'  // ← leaf, OK
import { requireAuthContext } from '@/lib/server-auth.server'             // ← leaf, OK
import { z } from 'zod'

export const getBlogPostsFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = createServerClient()
  return supabase.from('blog_posts').select('*')
})
```

**Dlaczego OK**: `createServerClient`, `requireAuthContext` to **single named imports z osobnych plików** `.server.ts`. TanStack Start strippuje każdy import statement osobno z client lazy chunks. Reference żyją tylko w lambdas (które są stripped). Module evaluation cascade nie odpala bo strip eliminuje import statements zanim ESM evaluates.

**Faktyczne files w projekcie**: `features/blog/server.ts`, `features/surveys/server.ts`, `features/shop-products/server.ts`, większość `features/*/server.ts`.

---

### Pattern 2: Wrapper consolidation (✅ rekomendowany dla complex features)

Gdy jeden feature ma 5+ helpers z wspólnymi server-only deps, zamiast 5+ named imports — stwórz **jeden orchestrator function** w `helpers.server.ts`:

```ts
// features/analytics/helpers.server.ts
import { createServerClient } from '@/lib/supabase/server-start.server'
import { requireAuthContext } from '@/lib/server-auth.server'

// Internal helpers — NIE eksportowane
async function ensureAccess() { ... }
async function loadConfig() { ... }
async function trackQuery(type: string) { ... }

// Single entry point — orchestruje wszystko
export async function runAnalyticsOperation(
  type: 'reports' | 'export' | 'metrics',
  data: unknown
) {
  await ensureAccess()
  trackQuery(type)
  const config = await loadConfig()
  // ... routing per `type`
  return result
}
```

```ts
// features/analytics/server.ts
import { createServerFn } from '@tanstack/react-start'
import { runAnalyticsOperation } from './helpers.server'  // ← single import

export const getReportsFn = createServerFn().handler(({ data }) =>
  runAnalyticsOperation('reports', data)
)
export const exportReportFn = createServerFn().handler(({ data }) =>
  runAnalyticsOperation('export', data)
)
export const getMetricsFn = createServerFn().handler(({ data }) =>
  runAnalyticsOperation('metrics', data)
)
```

**Dlaczego lepszy niż barrel z 5+ imports**:
- Strip działa (single name)
- Single boundary do testowania (mock `runAnalyticsOperation`)
- Type inference cleaner
- Reorganizacja wewnętrznych helperów nie ruszą `server.ts`

---

### Pattern 3: Dynamic import (✅ dla legacy barrel + re-exports)

Workflows feature miał barrel + re-exports — Path B fix (commit `f3420ff`):

```ts
// features/workflows/server.ts (po Path B)
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ok, err, errAsync, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createWorkflowSchema, ... } from './validation'  // schemas
import { messages } from '@/lib/messages'
import type { ExecutionFilters, RetryWorkflowResult } from './handlers.server'  // type-only ✅

// ZERO top-level imports z './handlers.server' (NIE barrel)
// ZERO top-level `import { createServiceClient } from '@/lib/supabase/service'`
// ZERO `export { dispatchToN8n } from './handlers.server'`

export const getWorkflowsFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    // Dynamic import — ZA strip boundary
    const { getWorkflowsHandler } = await import('./handlers.server')
    return getWorkflowsHandler()
  }
)

export const retryWorkflowExecutionFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { executionId: string }) => 
    z.object({ executionId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data }) => {
    const { retryWorkflowExecutionHandler } = await import('./handlers.server')
    return retryWorkflowExecutionHandler(data)
  })

// Re-export jako async wrapper (NIE direct re-export)
export async function dispatchToN8n(
  ...args: Parameters<typeof import('./handlers.server')['dispatchToN8n']>
) {
  const mod = await import('./handlers.server')
  return mod.dispatchToN8n(...args)
}
```

**Dlaczego dynamic działa**:
- `await import('./handlers.server')` jest **wewnątrz** stripped lambda
- W client bundle: lambda body usunięty → dynamic import nie istnieje → handlers.server.ts nigdy nie evaluates → ZERO ESM cascade
- W server bundle: lambda fires → dynamic import evaluates → handler się wywołuje normalnie

**Re-export trick**: zamiast `export { dispatchToN8n } from './handlers.server'` (forces strip block), użyj async wrapper. Re-export staje się funkcją z dynamic import inside. Identyczny shape dla consumer (ale `await` required), zero ESM cascade.

---

## Co psuje strip mechanism — anti-patterns

### ❌ Anti-pattern 1: Barrel z handlers.server

```ts
// features/X/server.ts
import {
  getFooHandler,
  getBarHandler,
  createBazHandler,
  updateQuxHandler,
  deleteWorflowHandler,
  // ... 13 named imports
} from './handlers.server'
// ↑ 13 named imports + handlers.server.ts ma top-level server-only imports
//   → ESM eval cascade gdy lazy chunk loads → AsyncLocalStorage crash
```

**Co robić**: Pattern 3 (dynamic w lambdach) lub Pattern 2 (wrapper consolidation).

### ❌ Anti-pattern 2: Re-export server-only kodu

```ts
// features/X/server.ts
export { dispatchToN8n, fetchWorkflowForPublicTrigger } from './handlers.server'
// ↑ Re-export forces bundler keep reference do handlers.server
//   → ESM evaluates → cascade
```

**Co robić**: Async wrapper:
```ts
export async function dispatchToN8n(...args) {
  const mod = await import('./handlers.server')
  return mod.dispatchToN8n(...args)
}
```

### ❌ Anti-pattern 3: Cross-feature pull przez UI komponent

```ts
// features/surveys/components/SurveyLinks.tsx
import { getWorkflowsForSelectorFn } from '@/features/workflows/server'
// ↑ Cross-feature import — jeśli workflows/server.ts JEST broken,
//   surveys crashuje TRANZYTYWNIE mimo że surveys/server.ts jest clean
```

**Co robić**: Naprawić źródło (workflows/server.ts), NIE cofać import z SurveyLinks. Cross-feature imports są legitne dla shared functionality.

---

## Decision tree

Gdy piszesz nowy `features/X/server.ts`:

```
Czy plik importuje na top-level z .server.ts?
│
├─ NIE (tylko z plain .ts) → top-level OK
│
├─ TAK, single direct leaf (np. createServerClient z lib/supabase/server-start.server)
│   └─ used w 1-3 lambdach → top-level OK ✅
│
├─ TAK, single name z helpers.server (wrapper consolidation)
│   └─ Pattern 2 — top-level OK ✅
│
├─ TAK, 5+ named imports z handlers.server (barrel)
│   └─ Pattern 3 — DYNAMIC await import('./handlers.server') w lambdach ❌
│
└─ TAK, ma `export { x } from './foo.server'` runtime re-export
    └─ Pattern 3 — async wrapper ❌
```

Plus zawsze:
- `import type` / `export type` → top-level OK (zerowy runtime)
- Jeśli masz wątpliwość → dynamic w lambdach jest defensive, działa zawsze

---

## Diagnostic flow gdy `node:async_hooks` crash

Stack trace mówi:
```
Module "node:async_hooks" externalized for browser compatibility.
Cannot access "node:async_hooks.AsyncLocalStorage" in client code.
  at request-response.js (@tanstack/start-server-core)
  → ... → <Lazy> (React error boundary)
  → ComponentName.tsx
```

Krok po kroku:

1. **Zidentyfikuj komponent na top stacku** — np. `WorkflowEditor.tsx`
2. **Sprawdź jego top-level imports** — szczególnie `from '../server'` lub `from '@/features/X/server'`
3. **Otwórz `features/X/server.ts`** — sprawdź top-level imports:
   - Direct leaf single imports? → OK, szukaj gdzie indziej
   - Barrel z `./handlers.server` (5+ named)? → **THIS IS THE OFFENDER**
   - Re-exports `export { ... } from './handlers.server'`? → **THIS IS THE OFFENDER**
4. **Sprawdź cross-feature pulls** — czy komponenty z X importują `from '@/features/Y/server'`? Jeśli Y jest broken (z punktu 3), X crashuje tranzytywnie
5. **Apply Pattern 3** (dynamic imports) lub Pattern 2 (wrapper consolidation)

---

## Real-world history (this project)

**Sesja 2026-05-01**: 27 commits dropped (rename `*.server.ts`, prop drilling, etc.) — wszystkie **niepotrzebne**. Final fix: 1 plik (`features/workflows/server.ts`), 113 ins / 55 del. Problem był tylko w **workflows** bo miało:
- 13-named-import barrel z `./handlers.server`
- 4 server-only utility imports na top-level
- Re-exports `dispatchToN8n`, `fetchWorkflowForPublicTrigger`

Pozostałe features (blog, surveys, shop-products, etc.) miały tylko **direct leaf imports** z `lib/server-auth.server` + `lib/supabase/server-start.server` — TanStack Start strippuje każdy z tych osobno, brak cascade.

Surveys crashowało **tranzytywnie**: `SurveyLinks.tsx` importował `from '@/features/workflows/server'` — pulled cały broken chain workflows.

**Lesson**: gdy widzisz `node:async_hooks` w wielu features, sprawdź czy istnieje **JEDEN feature offender** który tranzytywnie infekuje innych przez cross-feature imports. NIE zakładaj że wszystkie features wymagają fixa.

---

## Related files in project

- `apps/cms/features/workflows/server.ts` — Pattern 3 reference (post Path B fix)
- `apps/cms/features/workflows/handlers.server.ts` — server-only logic (top-level server imports OK bo `.server.ts` Import Protection chroni)
- `apps/cms/features/blog/server.ts` — Pattern 1 reference (direct leaf imports)
- `apps/cms/lib/supabase/server-start.server.ts` — leaf utility, Pure server side
- `apps/cms/lib/server-auth.server.ts` — leaf utility, requireAuthContext
- `apps/cms/vite.config.ts` — `optimizeDeps.exclude`, `resolve.dedupe`, virtual module stub plugin
- `docs/sessions/2026-05-01-server-boundary-refactor.md` — pełen historia sesji
