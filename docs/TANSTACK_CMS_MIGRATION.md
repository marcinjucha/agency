# CMS → TanStack Start Migration

> **Zadanie Notion:** [AAA-T-192] Migracja CMS: Core Setup + Auth + Layout → TanStack Start
> **Branch:** `feature/aaa-t-192-migration-cms-tanstack-start`
> **Data startu:** 2026-04-15
> **Cel:** Zastąpienie Next.js 16 App Router przez TanStack Start (Vite 8) w `apps/cms/`

---

## Strategia migracji

**In-place** — Next.js i TanStack Start koegzystują w tym samym `apps/cms/` podczas migracji.

| Aspekt | Next.js (tymczasowo) | TanStack Start (docelowo) |
|--------|---------------------|--------------------------|
| Port dev | 3001 (`npm run dev`) | 3004 (`npm run dev:vite`) |
| Entry points | `app/layout.tsx`, `middleware.ts` | `app/router.tsx`, `app/ssr.tsx`, `app/client.tsx` |
| Routes | `app/admin/**`, `app/api/**`, `app/login/` | `app/routes/**` |
| Tailwind | `@tailwindcss/postcss` (postcss.config.mjs) | `@tailwindcss/vite` (vite.config.ts) |
| Auth | `middleware.ts` + `requireAuth()` | `createMiddleware` + `createServerFn` |
| Server code | `'use server'` + Server Actions | `createServerFn()` z `vinxi/http` |

**Platformа:** Vercel (TanStack Start oficjalnie wspierany od Nov 2025, `target: 'vercel'` w vite.config.ts).

---

## Plan iteracyjny

### Iteracja 1 — Scaffold ✅ DONE (2026-04-15)

**Cel:** `vite dev --port 3004` startuje, `routeTree.gen.ts` generuje się

| Deliverable | Status |
|-------------|--------|
| `vite.config.ts` — tanstackStart + tailwindcss + tsConfigPaths + React Compiler | ✅ |
| `app/router.tsx` — `getRouter()` z routeTree.gen.ts | ✅ |
| `app/ssr.tsx` — `createStartHandler` + `defaultStreamHandler` | ✅ |
| `app/client.tsx` — `hydrateRoot` + `StartClient` | ✅ |
| `app/routes/__root.tsx` — html dark, HeadContent, globals.css?url, Outlet | ✅ |
| `app/routes/index.tsx` — PoC placeholder route | ✅ |
| `package.json` — `type:module`, `dev:vite`/`build:vite` scripts, TanStack deps | ✅ |
| `tsconfig.json` — `moduleDetection: force`, routeTree.gen.ts w include | ✅ |

**Weryfikacja:** `vite dev` startuje na 3004, `routeTree.gen.ts` wygenerowany, Next.js na 3001 niezmieniony.

**Kluczowe decyzje:**
- `routesDirectory: 'routes'` izoluje TanStack router od `app/admin/`, `app/api/` (Next.js)
- Skrypty `dev:vite`/`build:vite` OBOK istniejących `dev`/`build` (koegzystencja)
- `globals.css?url` — ten sam plik CSS dla obu frameworków (bez duplikacji)
- Root `package.json` już miał `"overrides": {"vite": "^8.0.0"}` — nie trzeba było zmieniać
- `plugins: [{name: "next"}]` i `.next/types/**/*.ts` zachowane w tsconfig — Next.js type safety

---

### Iteracja 2 — Auth Middleware + Login ✅ DONE (2026-04-15)

**Cel:** Login → dashboard, logout → login, protected routes redirect

| Deliverable | Status |
|-------------|--------|
| `lib/supabase/server-start.ts` — createServerClient z `@tanstack/start-server-core` cookies | ✅ |
| `lib/server-fns/auth.ts` — `getAuthContextFn`, `loginFn` (Zod), `logoutFn` | ✅ |
| `lib/head.ts` — `buildCmsHead()` z noindex/nofollow | ✅ |
| `app/routes/login.tsx` — formularz logowania z `loginFn` | ✅ |
| `app/routes/_admin.tsx` — pathless layout z `beforeLoad` redirect | ✅ |
| `app/routes/_admin/index.tsx` — chroniony dashboard placeholder | ✅ |
| `router.tsx` — `RouterContext` type, `context: { auth: null }` | ✅ |
| `__root.tsx` — `createRootRouteWithContext<RouterContext>()`, `beforeLoad` → `getAuthContextFn()` | ✅ |

**Acceptance criteria:**
- `/login` renderuje formularz
- Submit poprawnych danych → redirect do `/admin` (cookie ustawiony)
- Wejście na `/admin` bez sesji → redirect do `/login`
- Logout → cookie wyczyszczony → `/login`
- Auth middleware wstrzykuje `{userId, tenantId, isSuperAdmin}` do context

**Decyzja architektoniczna: `beforeLoad` zamiast global middleware**
- `requestMiddleware` w `app/start.ts` działa TYLKO server-side (SSR requests)
- NIE uruchamia się dla client-side navigations (kliknięcia linku w React)
- `beforeLoad` w `__root.tsx` + `_admin.tsx` = pełne pokrycie (SSR + client nav)
- `getAuthContextFn()` staje się RPC fetch na kliencie — cache'owany przez TanStack Router

**Kluczowe różnice vs Next.js:**
```ts
// Next.js (stare)
import { cookies } from 'next/headers'
const cookieStore = await cookies()
createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll() } })

// TanStack Start (nowe)
import { getWebRequest } from 'vinxi/http'
const request = getWebRequest()
createServerClient(url, key, { cookies: { getAll: () => parseCookies(request) } })
```

---

### Iteracja 3 — Admin Layout + RBAC + Dashboard ⬜ TODO

**Cel:** Pełny admin layout z sidebar, RBAC context, real data z Supabase

| Deliverable | Status |
|-------------|--------|
| `components/admin/SidebarV2.tsx` — sidebar z @tanstack/react-router Link | ⬜ |
| `_admin.tsx` upgrade — Sidebar + PermissionsProvider + QueryClientProvider | ⬜ |
| `_admin/index.tsx` — dashboard z tenant-scoped query | ⬜ |
| `__root.tsx` — Sentry error boundary (`@sentry/tanstackstart-react`) | ⬜ |
| `package.json` — `@sentry/tanstackstart-react`, `@unpic/react` | ⬜ |

**Acceptance criteria:**
- `/admin` pokazuje sidebar + dashboard
- Sidebar aktywny link poprawnie podświetlony (useRouterState zamiast usePathname)
- PermissionsProvider dostępny w dashboard
- Dashboard pokazuje co najmniej jedną query z tenant_id
- Sentry/GlitchTip łapie błędy
- `@unpic/react` zainstalowany (gotowy do zastąpienia next/image)

**Hook mapping (Next.js → TanStack):**
```ts
useRouter()          → useNavigate()
usePathname()        → useRouterState({ select: s => s.location.pathname })
useSearchParams()    → useSearch({ strict: false })
router.push('/path') → navigate({ to: '/path' })
redirect('/path')    → throw redirect({ to: '/path' })
```

---

## Po Iteracji 3 — Kolejne etapy (osobne taski)

> Te etapy są poza scope AAA-T-192 — każdy będzie osobnym zadaniem Notion.

| Etap | Zakres | Blokuje |
|------|--------|---------|
| **AAA-T-193** Migracja Surveys & Intake | features/surveys, features/intake, app/admin/surveys, app/admin/intake, app/admin/responses | ✅ DONE (2026-04-15) |
| **AAA-T-?** Migracja Workflows & Calendar | features/workflows, features/calendar, API routes workflows/trigger | Survey & Intake |
| **AAA-T-?** Migracja Content | features/blog, features/landing, features/media, features/email | — |
| **AAA-T-?** Migracja Shop & Marketplace | features/shop-*, features/site-settings | — |
| **Cleanup** | Usunięcie Next.js: next.config.ts, middleware.ts, postcss.config.mjs, next-env.d.ts | Wszystkie powyższe |

---

## Konwencje migracji per-feature (AAA-T-193 learnings)

Przy migracji każdego feature (osobne taski):

1. **Server Actions → `features/{name}/server-fns.ts`** (NIE `lib/server-fns/`)
   - `lib/server-fns/` = infrastruktura cross-feature (auth, admin-layout, dashboard)
   - Feature business logic → `features/{name}/server-fns.ts` (obok `actions.ts`)
   ```ts
   // Po (TanStack Start) — features/surveys/server-fns.ts
   export const createSurveyFn = createServerFn()
     .inputValidator((input: { title: string }) => createSurveySchema.parse(input))
     .handler(async ({ data }): Promise<{ success: boolean; surveyId?: string; error?: string }> => {
       const auth = await getAuth()  // inline, nie middleware (auth middleware = Iter 3 zadania)
       if (!auth) return { success: false, error: 'Not authenticated' }
       // ... logika DB
     })
   ```
   Auth pattern (do czasu authMiddleware): lokalny `getAuth()` → `createStartClient()` + `auth.getUser()` + `users.tenant_id`

2. **Queries — bez zmian** (TanStack Query nie zależy od Next.js)

3. **Components — usunąć `'use client'`** (TanStack Start jest client-first)

4. **`next/link` → `Link` z `@tanstack/react-router`** (`href` → `to`)

5. **`next/image` → `<img>` lub `@unpic/react`**

6. **SurveyBuilder: survey-object prop → surveyId prop**
   - Next.js RSC przekazywał pełny obiekt z serwera (Server Component fetch)
   - TanStack Start: komponent dostaje `surveyId` string, sam fetchuje przez `useQuery`
   - Next.js route page zaktualizowany do `<SurveyBuilder surveyId={id} />` (koegzystencja)

---

## Gotchas per-feature: URL Search Params (validateSearch)

Odkryte podczas AAA-T-193 (intake filters). Dotyczy każdego feature z filtrami URL.

### Problem: `navigate({ search: fn })` type error — `never`

Gdy żaden route w tree nie ma `validateSearch`, TanStack Router typuje search jako `{}`.
Functional updater `(prev: {}) => { key: value }` → TS error: `not assignable to never`.

### Rozwiązanie: 3-krokowy pattern

**Krok 1:** Dodaj `validateSearch` do route z explicit optional return type:
```ts
// app/routes/admin/intake/index.tsx
export const Route = createFileRoute('/admin/intake')({
  validateSearch: (search: Record<string, unknown>): { status?: string; survey?: string; appointmentStatus?: string } => ({
    status: search.status as string | undefined,
    survey: search.survey as string | undefined,
    appointmentStatus: search.appointmentStatus as string | undefined,
  }),
  component: () => <IntakeHub />,
})
```
**WAŻNE:** Explicit return type z `?:` (optional) — inaczej TanStack wymaga wszystkich kluczy w `search={}`.

**Krok 2:** W komponentach z filtrami — dodaj `to` w navigate:
```ts
// features/intake/components/ResponsesTable.tsx
navigate({
  to: '/admin/intake',      // ← pin'uje search type do tego route
  search: (prev) => ({ ...prev, [key]: value || undefined }),
  replace: true,
})
```

**Krok 3:** Linki i redirecty DO intake muszą mieć `search={}`:
```tsx
<Link to={routes.admin.intake} search={{}}>...</Link>
throw redirect({ to: routes.admin.intake, search: {} })
```

### Komponenty z `useSearch` (odczyt)

`useSearch({ strict: false })` — działa bez rejestracji w route. Odczyt przez cast:
```ts
const search = useSearch({ strict: false })
const status = (search as Record<string, unknown>).status as string | undefined
```

---

## Pliki referencyjne

- `apps/shop/jacek/` — kompletna migracja TanStack Start (wzorzec)
- `apps/shop/kolega/` — kompletna migracja TanStack Start (wzorzec)
- `.claude/skills/tanstack-setup/SKILL.md` — vite.config.ts, entry points, gotchas
- `.claude/skills/tanstack-routing/SKILL.md` — createFileRoute, loader, beforeLoad
- `.claude/skills/tanstack-server/SKILL.md` — createServerFn CRITICAL, createMiddleware
- `.claude/skills/tanstack-routing/resources/nextjs-migration-map.md` — pełna mapa konwersji

---

## Znane gotchas

| Problem | Rozwiązanie |
|---------|-------------|
| `cookies()` z `next/headers` nie działa w TanStack Start | `createStartClient()` z `lib/supabase/server-start.ts` (używa `getWebRequest()` z `vinxi/http`) |
| `navigate({ search: fn })` → TS error `never` | Dodaj `validateSearch` do docelowego route z explicit optional return type + `to:` w navigate call + `search={}` w Link/redirect. Patrz sekcja "Gotchas per-feature: URL Search Params" powyżej |
| `'use server'` directive → build error | `createServerFn()` zamiast `'use server'` |
| `'use client'` directive → zbędny | Usuń — TanStack Start jest client-first |
| `unstable_cache` / ISR przez `revalidate` | `headers: () => ({ 'Cache-Control': '...' })` w route |
| `next/font/google` | `@fontsource/*` CSS import |
| `NEXT_PUBLIC_*` env vars | `process.env.*` w `createServerFn` (server-only) |
| React Compiler — `babel-plugin-react-compiler` | Już w root devDeps — `viteReact({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } })` |
| Vite 8 wymagany | Root `overrides: { vite: "^8.0.0" }` już ustawiony |
