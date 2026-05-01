# Session: Server/Client Boundary Refactor (2026-05-01)

## Status końcowy: ✅ Naprawione 1-file fixem (Path B)

Po dropie 4 falsy starts, prawdziwy fix to **dynamic imports w createServerFn handler lambdas** w `features/workflows/server.ts` (commit `f3420ff`).

## Problem

Lazy split route components (`/admin/workflows/$id`, `/admin/surveys/$id`, `/admin/workflows/executions/$id`) crashowały z:

```
Module "node:async_hooks" externalized for browser compatibility.
Cannot access "node:async_hooks.AsyncLocalStorage" in client code.
  at request-response.js (@tanstack/start-server-core)
```

## Root cause (zidentyfikowany przez ag-analyst-agent)

`features/workflows/server.ts` był **JEDYNYM offenderem**. Top-level miał:
- 13-named-import barrel z `./handlers.server`
- 4 server-only utilities: `createServiceClient`, `WORKFLOW_TEMPLATES`, `validateSurveyLinkIdInPayload`, `validateAllSteps`

ESM evaluation kaskady przy lazy chunk load (np. `WorkflowEditor` → `TestModePanel` → `from '../server'` → workflows/server.ts → handlers.server.ts → start-server-core/request-response.js → `new AsyncLocalStorage()`) propagowała poza TanStack Start `.server.ts` strip boundary.

`features/blog/server.ts` i `features/surveys/server.ts` miały top-level imports tylko bezpośrednio z `.server.ts` files (createServerClient z server-start.server, requireAuthContext z server-auth.server) — TanStack Start strippuje te z lazy chunks. **Tylko workflows/server.ts** miał barrel pattern który strip nie obejmował transitively.

Surveys crash był **tranzytywne**: `SurveyLinks.tsx` (komponent w SurveyBuilder lazy chunk) importował `from '@/features/workflows/server'` (cross-feature) — pulled cały workflows chain.

## Fix (Path B — `f3420ff`)

Jedyna zmiana: `apps/cms/features/workflows/server.ts`. **1 plik, 113 ins / 55 del**.

```ts
// Top-level (clean):
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ok, err, errAsync, ResultAsync } from 'neverthrow'
import { fromSupabase, fromSupabaseVoid } from '@/lib/result-helpers'
import { createWorkflowSchema, ... } from './validation'  // schemas
import { toWorkflow } from './types'  // pure utility
import { messages } from '@/lib/messages'
import { requireAuthContext, type AuthContext } from '@/lib/server-auth.server'
import type { ExecutionFilters, RetryWorkflowResult } from './handlers.server'  // type-only

// Każdy createServerFn handler:
export const getWorkflowsFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { getWorkflowsHandler } = await import('./handlers.server')
    return getWorkflowsHandler()
  }
)
```

`dispatchToN8n` i `fetchWorkflowForPublicTrigger` re-exports stały się async wrapping dynamic import.

## Co NIE było konieczne (drop'd)

### 4 falsy starts (dropped)

1. **Krok 1+2+4** (commit pre-drop): rename `features/*/server.ts` → `*.server.ts`. Import Protection plugin denied imports z route files (createServerFn wrappery MUSZĄ być w plain .ts).

2. **Surveys POC + Phase 3 lib/server-fns** (commit pre-drop): handlers.server.ts split + dynamic imports w surveys + lib/server-fns. Działało ale 18 features wciąż leak — user wybrał inne podejście.

3. **Blog pattern dla 3 routes** (commit pre-drop, c9918bf): props drilling przez WorkflowEditor/SurveyBuilder/ExecutionDetail. **NIEPOTRZEBNE** — Path B sam wystarczył. Komponenty mogą bezpośrednio importować `from '../server'` bo top-level chain jest clean.

## Decyzja architektoniczna — kiedy dynamic import w handler lambda

**Wzorzec do zastosowania**: gdy `features/X/server.ts` importuje top-level z `./handlers.server` (barrel z server-only deps) **i** ten feature ma lazy split route components które importują `from '../server'`.

**Wzorzec NIE potrzebny** gdy:
- `features/X/server.ts` ma top-level imports tylko z `.server.ts` files (TanStack Start strippuje)
- LUB feature nie ma lazy split components

Aktualnie projekt ma **tylko workflows** w stanie wymagającym tego. Inne features (blog, shop-products, surveys, etc.) są clean by design.

## Co zostaje (legitne, ship-able)

- **Pattern A migration** (17 features): handlers.server.ts split, dead code cleanup
- **Retry endpoint fix** (T-210 prod-breaking): createServerFn zamiast retry.ts API route
- **OAuth callbacks**: `server.handlers.GET` zamiast `loader` pattern
- **Vite config**: `optimizeDeps.exclude` rozszerzone (router-core), `resolve.dedupe: ['react', 'react-dom']`, html-to-text chain cut
- **Pure server utilities** rename: `lib/server-auth.ts` + `lib/supabase/server-start.ts` → `.server.ts`
- **Path B** (this fix): dynamic imports w workflows/server.ts handler lambdas

## Files commit list (28 commits, 4543c2f..f3420ff)

```
f3420ff fix(workflows): dynamic imports in createServerFn lambdas (Path B — final fix)
7dc5652 fix(boundary): update 38 import paths to server-auth.server + server-start.server
c6b4d5f fix(boundary): rename server-auth + server-start to .server.ts
3b12aa8 fix(vite): dedupe react/react-dom — single instance across optimizeDeps
0a18787 fix(email): cut html-to-text chain — local constants + server-only render
8d943f7 fix(vite): expand optimizeDeps.exclude to @tanstack/router-core
a449acd refactor(api): OAuth callbacks use server.handlers.GET (idiomatic)
550cbb3 refactor(shop-marketplace): server-only adapters with .server.ts suffix
ba08d90 chore(users): remove dead queries.ts (Next.js residue)
4f796e6 chore(tenants): remove dead queries.ts (Next.js residue)
118b06b refactor(legal-pages): Pattern A migration + remove dead queries
412a353 chore(intake): remove dead queries.ts + extract pure helper to utils/
6b9d4ec chore(media): remove dead async queries — keep TanStack key factories
8bafb36 refactor(site-settings): Pattern A migration
d8daff2 refactor(shop-marketplace): Pattern A migration + remove dead queries
bb49794 refactor(shop-categories): Pattern A migration + remove dead queries.server.ts
826e131 refactor(shop-products): migrate to Pattern A — remove queries.ts
714a10d refactor(surveys): migrate live queries to Pattern A + remove dead code
3762361 chore(blog): remove dead queries.ts + queries.server.ts (Next.js residue)
34118db chore(roles): remove dead queries.ts (Next.js browser client residue)
02d2f5f chore(appointments): remove dead queries.ts + actions.ts (Next.js residue)
eced8f3 refactor(calendar): rename oauth.ts to oauth.server.ts + remove dead queries
a15ec7e chore(landing): remove dead queries.ts (Next.js browser client residue)
6608a1e chore(email): remove orphan async Server Component + unused queries.server
50f5ecb fix(workflows): retry endpoint as createServerFn + Pattern A migration
a729856 refactor(responses): migrate to Pattern A with handlers.server.ts
a7ac2f0 refactor(docforge-licenses): migrate to Pattern A with handlers.server.ts
```

## Memory entries dla future sessions

Pattern do zapamiętania (na ai-extract-memory):

1. **TanStack Start lazy chunks**: top-level barrel imports z `*.handlers.server.ts` (lub plików tranzytywnie z server-only) propagują ESM side effects PAST `.server.ts` strip boundary. Fix: dynamic `await import('./handlers.server')` wewnątrz createServerFn handler lambda.

2. **Top-level `import { ... } from '@/lib/supabase/server-start.server'` JEST OK** dla `features/X/server.ts` — TanStack Start strippuje te z lazy chunks. PROBLEM tylko gdy server.ts re-eksportuje BARREL z `./handlers.server` (który sam importuje server-start).

3. **createServerFn modules MUSZĄ być w plain `.ts` (NIE `.server.ts`)** — Import Protection plugin denied imports z route files (UI loaders). `.server.ts` suffix jest dla **pure server utilities** (createServerClient, requireAuthContext etc.).

4. **Cross-feature imports propagują crash**: jeśli komponent z feature A importuje `from '@/features/B/server'` i B jest broken — A też crashuje (przykład: SurveyLinks → workflows).

5. **Diagnostic**: gdy widzisz `node:async_hooks` crash, NIE zakładaj że wszystkie features wymagają fixa. ag-analyst-agent może zidentyfikować JEDEN offender (np. workflows) który propaguje crash do innych features tranzytywnie.

## Future cleanup (Notion task — opcjonalne)

Jeśli inne features kiedyś dodadzą barrel import pattern w server.ts (jak workflows miały) — zastosować ten sam pattern (dynamic import w lambda). Aktualnie nie wymagane — blog/surveys/shop-products/etc. mają czyste top-level chains.
