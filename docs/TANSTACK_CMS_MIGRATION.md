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

### Iteracja 2 — Auth Middleware + Login ⬜ TODO

**Cel:** Login → dashboard, logout → login, protected routes redirect

| Deliverable | Status |
|-------------|--------|
| `lib/supabase/server-start.ts` — createServerClient z Web API Request (vinxi/http) | ⬜ |
| `lib/middleware/auth.ts` — createMiddleware: cookie → session → `{userId, tenantId, isSuperAdmin}` | ⬜ |
| `app/start.ts` — globalny requestMiddleware | ⬜ |
| `lib/server-fns/auth.ts` — `loginFn`, `logoutFn` jako createServerFn + Zod | ⬜ |
| `app/routes/login.tsx` — formularz logowania | ⬜ |
| `app/routes/_admin.tsx` — pathless layout z beforeLoad redirect | ⬜ |
| `app/routes/_admin/index.tsx` — chroniony dashboard placeholder | ⬜ |

**Acceptance criteria:**
- `/login` renderuje formularz
- Submit poprawnych danych → redirect do `/admin` (cookie ustawiony)
- Wejście na `/admin` bez sesji → redirect do `/login`
- Logout → cookie wyczyszczony → `/login`
- Auth middleware wstrzykuje `{userId, tenantId, isSuperAdmin}` do context

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
| **AAA-T-?** Migracja Surveys & Intake | features/surveys, features/intake, app/admin/surveys, app/admin/intake, app/admin/responses | — |
| **AAA-T-?** Migracja Workflows & Calendar | features/workflows, features/calendar, API routes workflows/trigger | Survey & Intake |
| **AAA-T-?** Migracja Content | features/blog, features/landing, features/media, features/email | — |
| **AAA-T-?** Migracja Shop & Marketplace | features/shop-*, features/site-settings | — |
| **Cleanup** | Usunięcie Next.js: next.config.ts, middleware.ts, postcss.config.mjs, next-env.d.ts | Wszystkie powyższe |

---

## Konwencje migracji per-feature

Przy migracji każdego feature (osobne taski):

1. **Server Actions → createServerFn**
   ```ts
   // Przed (Next.js)
   'use server'
   export async function createSurvey(data: FormData) {
     const { supabase, tenantId } = await requireAuth('surveys.manage')
     ...
   }
   
   // Po (TanStack Start)
   export const createSurveyFn = createServerFn()
     .middleware([authMiddleware])
     .validator(z.object({ ... }))
     .handler(async ({ data, context }) => {
       const { supabase, tenantId } = context.auth
       ...
     })
   ```

2. **Queries — bez zmian** (TanStack Query nie jest dep Next.js)

3. **Components — usunąć `'use client'`** (TanStack Start jest client-first)

4. **next/link → Link z @tanstack/react-router** (`href` → `to`)

5. **next/image → `<img>` lub @unpic/react**

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
| `cookies()` z `next/headers` nie działa w TanStack Start | `getWebRequest()` z `vinxi/http` + ręczne parsowanie cookies |
| `'use server'` directive → build error | `createServerFn()` zamiast `'use server'` |
| `'use client'` directive → zbędny | Usuń — TanStack Start jest client-first |
| `unstable_cache` / ISR przez `revalidate` | `headers: () => ({ 'Cache-Control': '...' })` w route |
| `next/font/google` | `@fontsource/*` CSS import |
| `NEXT_PUBLIC_*` env vars | `process.env.*` w `createServerFn` (server-only) |
| React Compiler — `babel-plugin-react-compiler` | Już w root devDeps — `viteReact({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } })` |
| Vite 8 wymagany | Root `overrides: { vite: "^8.0.0" }` już ustawiony |
