# TanStack Start — Patterns, Decisions & Lessons Learned

> Dokumentacja wzorców wypracowanych podczas migracji Next.js 16 → TanStack Start v1.167 + Vite 8.
> Dotyczy: `apps/cms/` (AAA-T-192..198), `apps/website/` (AAA-T-191), `apps/shop/jacek/`, `apps/shop/kolega/`.
> Ostatnia aktualizacja: 2026-04-16.

---

## Spis treści

1. [Architektura ogólna](#1-architektura-ogólna)
2. [Pattern A vs Pattern B — strategie data fetching](#2-pattern-a-vs-pattern-b--strategie-data-fetching)
3. [createServerFn — serwer w TanStack Start](#3-createserverfn--serwer-w-tanstack-start)
4. [Autentykacja i autoryzacja](#4-autentykacja-i-autoryzacja)
5. [Routing — konwencje plików i nawigacja](#5-routing--konwencje-plików-i-nawigacja)
6. [SEO i caching (ISR replacement)](#6-seo-i-caching-isr-replacement)
7. [Vite config i virtual modules](#7-vite-config-i-virtual-modules)
8. [Supabase w TanStack Start](#8-supabase-w-tanstack-start)
9. [Migracja komponentów z Next.js](#9-migracja-komponentów-z-nextjs)
10. [Deployment (Vercel)](#10-deployment-vercel)
11. [Bugi i gotchas](#11-bugi-i-gotchas)

---

## 1. Architektura ogólna

### Dwie osobne strategie per app

| App | Strategia data fetching | Auth | Supabase client | TanStack Query |
|-----|------------------------|------|-----------------|----------------|
| **CMS** | Pattern A — `useQuery` z server fn jako `queryFn` | `beforeLoad` + `getAuthContextFn()` | `createServerClient()` (cookies z request) | Tak (wszystkie dane) |
| **Website** | Pattern B — `ensureQueryData` w loader + `useLoaderData()` | Brak (publiczny) | `createServiceClient()` (service role, bez cookies) | Tylko blog routes |
| **Shop** | Pattern B | Brak (publiczny) | `createServiceClient()` | Nie |

### Dlaczego dwie strategie?

**CMS (Pattern A):** Auth-required app bez potrzeb SEO. Komponenty same zarządzają swoimi danymi przez `useQuery`. Server fn jako `queryFn` gwarantuje, że request leci z cookies usera. Loader jest opcjonalny (prefetch).

**Website (Pattern B):** Publiczny app z ISR. Dane muszą być w loaderze, bo `head()` potrzebuje ich do SEO meta tags. `ensureQueryData` gwarantuje dane na serwerze (SSR), komponent czyta przez `useLoaderData()`.

### Dlaczego Pattern A ewoluował 4 razy

1. **V1:** Browser client w `queries.ts` jako `queryFn` (jak w Next.js)
2. **V2:** `createServerFn` jako `queryFn` — zepsuło się podczas koegzystencji z Next.js (dual-context bundler)
3. **V3:** Powrót do browser client — działa ale niepotrzebnie trzyma dwa klienty
4. **V4 (finalna):** `createServerFn` jako `queryFn` po usunięciu Next.js z deps — pełne Pattern A

**Lekcja:** Podczas migracji nie próbuj docelowej architektury od razu. Koegzystencja frameworków wymusza kompromisy.

---

## 2. Pattern A vs Pattern B — strategie data fetching

### Pattern A (CMS) — server fn jako queryFn

```tsx
// features/blog/server.ts
export const getBlogPostsFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = createServerClient() // cookies z request
  const { data } = await supabase.from('blog_posts').select('*')
  return data || []
})

// app/routes/admin/blog/index.tsx — route jest minimalny
export const Route = createFileRoute('/admin/blog/')({
  head: () => buildCmsHead(messages.nav.blog),
  component: BlogListPage,
})
function BlogListPage() {
  return <BlogPostList />
}

// features/blog/components/BlogPostList.tsx — komponent zarządza danymi
const { data: posts } = useQuery({
  queryKey: queryKeys.blog.all,
  queryFn: getBlogPostsFn, // server fn bezpośrednio jako queryFn
})
```

**Kiedy używać:** Auth-required apps bez SEO (admin panele, dashboardy).

**Dlaczego:** Komponenty są self-contained — łatwiejsze testowanie, refactoring, reuse. Route nie musi wiedzieć jakie dane komponent potrzebuje.

### Pattern B (Website) — ensureQueryData + useLoaderData

```tsx
// features/blog/server.ts
export const getPublishedBlogPostsFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = createServiceClient() // service role, bez cookies
  const { data } = await supabase.from('blog_posts').select('*').eq('is_published', true)
  return data || []
})

// app/routes/blog/$slug.tsx — route zarządza danymi
export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    const post = await queryClient.ensureQueryData({
      queryKey: queryKeys.blog.detail(params.slug),
      queryFn: () => getPublishedBlogPostFn({ data: { slug: params.slug } }),
    })
    if (!post) throw notFound()
    return { post }
  },
  head: ({ loaderData }) => {
    // SEO meta tags z danych — dlatego loader musi je dostarczyć
    return buildWebsiteHead(loaderData.post.title, loaderData.post.excerpt)
  },
  headers: () => CACHE_BLOG,
  component: BlogPostPage,
})

function BlogPostPage() {
  const { post } = Route.useLoaderData() // dane z loadera, bez useQuery
}
```

**Kiedy używać:** Publiczne apps z SEO (marketing, blog, e-commerce).

**Dlaczego:** `head()` potrzebuje `loaderData` do meta tags. `headers()` ustawia Cache-Control (ISR replacement). Dane muszą być dostępne na serwerze.

### Wyjątek: Website blog z useQuery

Blog routes na website używają `ensureQueryData` w loaderze + `useQuery` w komponencie:

```tsx
// app/routes/blog/index.tsx
loader: async ({ context: { queryClient } }) => {
  await queryClient.ensureQueryData({
    queryKey: queryKeys.blog.all,
    queryFn: getPublishedBlogPostsFn,
  })
},
component: function BlogPage() {
  const { data: posts } = useQuery({
    queryKey: queryKeys.blog.all,
    queryFn: getPublishedBlogPostsFn,
  })
}
```

**Dlaczego:** Blog potrzebuje client-side filtrowania/sortowania po załadowaniu. `useLoaderData` jest statyczne — nie odświeża się.

---

## 3. createServerFn — serwer w TanStack Start

### Zawsze POST

```tsx
// ✅ Zawsze
export const myFn = createServerFn({ method: 'POST' }).handler(...)

// ❌ Nigdy — domyślny GET serializuje dane w URL → 431 na dużych payloadach
export const myFn = createServerFn().handler(...)
```

**Dlaczego:** Domyślny GET serializuje input jako URL query params. Blog content, landing page blocks, Tiptap JSON — wszystko to przekracza limit URL. Zamiast zgadywać "czy ten payload będzie duży", zawsze POST.

### inputValidator — function wrapper obowiązkowy

```tsx
// ✅ Działa
.inputValidator((input: { title: string }) => createSurveySchema.parse(input))

// ❌ Silent failure — handler nigdy nie jest wywołany
.inputValidator(createSurveySchema)
```

**Dlaczego:** TanStack Start's RPC layer nie wywołuje `.parse()` na surowym obiekcie Zod schema. Musi być opakowany w funkcję.

### Struktura plików

```
features/{name}/
├── server.ts         # createServerFn — jedyny plik z kodem serwerowym
├── components/       # React komponenty
├── queries.ts        # [LEGACY] browser client queries — usuwane
├── queries.server.ts # [LEGACY] server queries (Next.js RSC) — usuwane
├── actions.ts        # [LEGACY] 'use server' actions — zastąpione przez server.ts
├── types.ts          # TypeScript typy
└── validation.ts     # Zod schemas
```

**Konwencja:** Plik z server functions to `server.ts` (NIE `server-fns.ts`). Znajduje się w feature directory (NIE `lib/server-fns/`), z wyjątkiem cross-feature infra (auth, admin-layout, dashboard) które zostaje w `lib/server-fns/`.

### Server fn nie rzuca wyjątków do klienta

```tsx
// createServerFn na 500 zwraca undefined, NIE rzuca
const result = await myServerFn({ data: input })
// result może być undefined!

// ✅ Zawsze sprawdzaj null
if (!result) return { success: false, error: 'Server error' }
```

**Dlaczego:** TanStack Start RPC nie propaguje server errors jako exceptions. Kod robiący `result.success` crashuje z TypeError na undefined.

---

## 4. Autentykacja i autoryzacja

### CMS: beforeLoad zamiast middleware

```tsx
// app/routes/__root.tsx
export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const auth = await getAuthContextFn()
    return { auth }
  },
})

// app/routes/admin.tsx
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    if (!context.auth?.userId) throw redirect({ to: '/login' })
  },
})
```

**Dlaczego NIE requestMiddleware:**
- `requestMiddleware` działa TYLKO server-side (SSR requests)
- NIE uruchamia się na client-side navigation (kliknięcia linków w React)
- `beforeLoad` = izomorficzne — SSR + client navigation pokryte

### Dwa poziomy auth context

```tsx
// lib/server-auth.ts

// Minimalny — userId + tenantId (większość features)
export function requireAuthContext(): ResultAsync<AuthContext, string>

// Pełny — + isSuperAdmin, roleName, permissions (users, roles, tenant management)
export function requireAuthContextFull(): ResultAsync<AuthContextFull, string>
```

**Dlaczego dwa:** `getAuthFull()` robi dodatkowy query do `user_roles` + `tenant_roles` + `role_permissions`. Nie ma sensu tego robić dla każdego GET surveys.

### neverthrow pipeline w server functions

```tsx
export const createSurveyFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { title: string }) => createSurveySchema.parse(input))
  .handler(async ({ data }) => {
    const result = await requireAuthContext()
      .andThen((auth) => insertSurvey(auth, data))

    return result.match(
      (survey) => ({ success: true, surveyId: survey.id }),
      (error) => ({ success: false, error })
    )
  })
```

**Dlaczego:** `ok().andThen().match()` zamiast try/catch. Każdy krok w pipeline może zwrócić `err()` — chain automatycznie się zatrzymuje. Finalne `.match()` gwarantuje, że oba przypadki (success/error) są obsłużone.

### Website: createServiceClient (bez auth)

```tsx
// lib/supabase/service.ts
export function createServiceClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Dlaczego service role a nie anon:** Website jest publiczny — nie ma cookie session. Service role + RLS `is_published = true` daje bezpieczny dostęp do publicznych danych. Musi być wywołany WEWNĄTRZ `createServerFn`, nigdy na module level.

---

## 5. Routing — konwencje plików i nawigacja

### Struktura routów

```
app/routes/
├── __root.tsx                    # Root layout (HTML shell)
├── login.tsx                     # /login
├── admin.tsx                     # /admin layout (sidebar, auth guard)
├── admin/
│   ├── index.tsx                 # /admin (dashboard)
│   ├── blog/
│   │   ├── index.tsx             # /admin/blog
│   │   ├── $postId.tsx           # /admin/blog/:postId
│   │   └── new.tsx               # /admin/blog/new
│   └── surveys/
│       ├── index.tsx             # /admin/surveys
│       ├── $surveyId.tsx         # /admin/surveys/:surveyId
│       └── new.tsx               # /admin/surveys/new
```

### Krytyczne konwencje

**`admin.tsx` nie `_admin.tsx`:**
- Underscore prefix = pathless layout (nie dodaje segmentu URL)
- `_admin/index.tsx` mapuje na URL `/`, NIE `/admin/`
- Używamy `admin.tsx` (bez underscore) żeby dodać segment `/admin/`

**Static file = layout, nie strona:**
- `executions.tsx` staje się layoutem dla `executions/*` routes
- Wymaga `<Outlet />` — bez niego child routes nie renderują się
- Jeśli chcesz standalone stronę, użyj `executions/index.tsx`

**Dot notation = parent-child nesting:**
- `survey.$token.success.tsx` jest DZIECKIEM `survey.$token.tsx`
- Dziecko renderuje się w `<Outlet />` parenta
- Jeśli parent nie ma Outlet, dziecko nigdy nie pojawi się na ekranie

**Rozwiązanie dla survey flow:**
```
survey.$token.tsx           # Layout z <Outlet /> (kontener)
survey.$token.index.tsx     # Formularz ankiety (główna treść)
survey.$token.success.tsx   # Strona sukcesu (dziecko)
```

### Hook mapping Next.js → TanStack

```tsx
useRouter()          → useNavigate()
usePathname()        → useRouterState({ select: s => s.location.pathname })
useSearchParams()    → useSearch({ strict: false })
router.push('/path') → navigate({ to: '/path' })
redirect('/path')    → throw redirect({ to: '/path' })
next/link <Link>     → @tanstack/react-router <Link> (href → to)
next/image           → @unpic/react <Image> (lub native <img>)
```

### validateSearch — search params w URL

Trzy kroki żeby filtry URL działały type-safe:

```tsx
// Krok 1: validateSearch na route
export const Route = createFileRoute('/admin/intake')({
  validateSearch: (search: Record<string, unknown>): {
    status?: string
    survey?: string
  } => ({
    status: search.status as string | undefined,
    survey: search.survey as string | undefined,
  }),
})

// Krok 2: navigate z `to` (pin-uje typ search params)
navigate({
  to: '/admin/intake',
  search: (prev) => ({ ...prev, status: value || undefined }),
  replace: true,
})

// Krok 3: Link/redirect z search={}
<Link to="/admin/intake" search={{}}>Intake</Link>
```

**Dlaczego:** Bez `validateSearch` TanStack Router typuje search jako `{}`. Functional updater `(prev: {}) => { key: value }` daje TS error `not assignable to never`.

---

## 6. SEO i caching (ISR replacement)

### head() — replacement dla Next.js metadata

```tsx
// CMS — prosty, bez SEO
export const Route = createFileRoute('/admin/blog/')({
  head: () => buildCmsHead(messages.nav.blog), // noindex, nofollow
})

// Website — pełne SEO z loaderData
export const Route = createFileRoute('/blog/$slug')({
  head: ({ loaderData }) => ({
    ...buildWebsiteHead(title, description, ogImage, keywords),
    meta: [
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: post.published_at },
    ],
  }),
})
```

### headers() — replacement dla Next.js ISR revalidate

```tsx
// lib/cache-headers.ts
export const CACHE_BLOG = {
  'Cache-Control': 'public, max-age=10, s-maxage=60, stale-while-revalidate=3600',
} as const

export const CACHE_STATIC = {
  'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
} as const

// Route
export const Route = createFileRoute('/blog/$slug')({
  headers: () => CACHE_BLOG,
})
```

**Mapowanie:**
| Next.js | TanStack Start |
|---------|---------------|
| `revalidate = 60` | `headers: () => CACHE_BLOG` (s-maxage=60) |
| `revalidate = 3600` | `headers: () => CACHE_STATIC` (s-maxage=3600) |
| `revalidate = 0` (dynamic) | brak `headers()` |

### SEO elements łatwo zgubione przy migracji

Checklist z naszej migracji:
- [ ] `metadataBase` → absolutne URL-e w OG images (`BASE_URL` z env)
- [ ] Organization JSON-LD (schema.org) — w `__root.tsx`
- [ ] `google-site-verification` z site_settings
- [ ] keywords merge (page + site defaults)
- [ ] `og:type` — każdy route ustawia osobno (NIE w shared helper)
- [ ] `robots.txt` i `sitemap.xml` jako route files (`robots[.txt].tsx`, `sitemap[.xml].tsx`)

---

## 7. Vite config i virtual modules

### Wymagany virtual module stub (tylko CMS)

```tsx
// vite.config.ts
{
  name: 'tanstack-start-virtual-modules-stub',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id === 'tanstack-start-injected-head-scripts:v') {
      return '\0tanstack-start-injected-head-scripts:v'
    }
  },
  load(id: string) {
    if (id === '\0tanstack-start-injected-head-scripts:v') {
      // React Refresh preamble — bez tego infinite loading na WSZYSTKICH stronach
      const preamble = command === 'serve'
        ? 'import RefreshRuntime from "/@react-refresh";...'
        : undefined
      return `export const injectedHeadScripts = ${JSON.stringify(preamble)}`
    }
  },
}
```

**Dlaczego:** Żaden plugin TanStack (react-start, start-plugin-core, router-plugin) nie rejestruje tego virtual module. Vite's `import-analysis` natrafia na `import("tanstack-start-injected-head-scripts:v")` w `@tanstack/start-server-core/router-manifest.js` ZANIM plugin TanStack go zarejestruje.

**Dlaczego preamble:** Zwrócenie `undefined` lub pustego stringa powoduje, że `window.__vite_plugin_react_preamble_installed__` nie jest ustawione → React Refresh nie działa → hook state updates nigdy nie re-renderują → infinite loading.

**Dlaczego shop apps tego nie potrzebują:** Nie trafiają na ten code path w swoim buildzie (mniejsza baza komponentów, inny tree-shaking).

### optimizeDeps.exclude

```tsx
optimizeDeps: {
  exclude: ['@tanstack/start-server-core', '@tanstack/react-start', '@tanstack/react-router'],
},
```

**Dlaczego:** Te pakiety używają `#virtual` imports rozwiązywanych przez plugin tanstackStart w build time. Pre-bundling (Vite dep optimizer) uruchamia się ZANIM context pluginu jest gotowy — exclude zapobiega rozwiązywaniu ich za wcześnie.

### nitro() tylko w build mode

```tsx
plugins: [
  ...(command === 'build' ? [nitro()] : []),
  // ...
]
```

**Dlaczego:** `nitro()` jest wymagany do generowania Vercel serverless functions. Ale w dev mode powoduje `ERR_LOAD_URL`. Więc warunkowo — tylko `build`.

---

## 8. Supabase w TanStack Start

### Trzy klienty, trzy konteksty

| Klient | Plik | Kontekst | Kiedy |
|--------|------|----------|-------|
| `createServerClient()` | `lib/supabase/server-start.ts` | Server fn (ma cookies z request) | CMS server fns — auth + tenant-scoped queries |
| `createServiceClient()` | `lib/supabase/service.ts` | Server fn (service role, bez cookies) | Website server fns — publiczne dane |
| `createBrowserClient()` | `lib/supabase/client.ts` | Browser (React component) | [LEGACY] Usunięte z CMS po Pattern A migration |

### Server client — cookies z vinxi/http

```tsx
import { getWebRequest } from 'vinxi/http'

export function createServerClient() {
  const request = getWebRequest()
  return createClient(url, key, {
    cookies: {
      getAll: () => parseCookies(request),
      setAll: (cookies) => { /* setCookie via vinxi/http */ },
    },
  })
}
```

**Dlaczego nie `cookies()` z next/headers:** `next/headers` nie istnieje w TanStack Start. `vinxi/http` to niskopoziomowy HTTP layer, na którym TanStack Start jest zbudowany.

### Service client — WEWNĄTRZ server fn

```tsx
// ✅ Wewnątrz handler — tworzy per-request
export const myFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = createServiceClient()
  // ...
})

// ❌ Na module level — jeden shared instancja, connection pool issues
const supabase = createServiceClient()
export const myFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { data } = await supabase.from(...)
})
```

### Data mapping w server fns

```tsx
// ❌ Zwraca surowe dane z Supabase — komponenty crashują
export const getPipelineResponsesFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { data } = await supabase.from('responses').select('*, surveys(*)')
  return data
})

// ✅ Mapuje na typed domain objects — komponenty dostają oczekiwany kształt
export const getPipelineResponsesFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { data } = await supabase.from('responses').select('*, surveys(*)')
  return (data || []).map(toPipelineResponse)
})
```

**Dlaczego:** Gdy migrowaliśmy z browser client queries na server fns, surowe dane z Supabase różnią się od zmapowanych obiektów. Komponenty oczekujące `response.survey.title` dostawały `response.surveys.title` (Supabase relation name). Mapowanie musi być w server fn.

---

## 9. Migracja komponentów z Next.js

### Checklist per komponent

- [ ] Usuń `'use client'` — TanStack Start jest client-first, dyrektywa jest bezużyteczna
- [ ] Zamień `next/link` → `@tanstack/react-router Link` (`href` → `to`)
- [ ] Zamień `next/image` → `@unpic/react Image` lub native `<img>`
- [ ] Zamień `next/dynamic` → `React.lazy()` + `<Suspense>` (next/dynamic powoduje "Rendered more hooks")
- [ ] Zamień `useRouter()` → `useNavigate()`
- [ ] Zamień `usePathname()` → `useRouterState({ select: s => s.location.pathname })`
- [ ] Zamień `NEXT_PUBLIC_*` → `import.meta.env.VITE_*` (Vite env vars)
- [ ] Zamień `process.env.*` → `import.meta.env.*` w client code (process.env undefined w Vite)
- [ ] Zamień Server Actions (`'use server'`) → `createServerFn()` w `server.ts`
- [ ] Zamień `revalidatePath()` → `queryClient.invalidateQueries()`

### Dependency injection dla shared components

Komponenty używane przez oba frameworki (np. `BlogPostEditor`) nie mogą importować z `server.ts` ani `actions.ts`:

```tsx
// ✅ Route przekazuje mutation functions jako props
function BlogEditPage() {
  return (
    <BlogPostEditor
      postId={params.postId}
      onSave={(data) => updateBlogPostFn({ data })}
      onDelete={(id) => deleteBlogPostFn({ data: { id } })}
    />
  )
}

// ❌ Komponent importuje bezpośrednio z server.ts — wiąże się z frameworkiem
import { updateBlogPostFn } from '../server'
function BlogPostEditor() {
  const save = () => updateBlogPostFn(...)
}
```

**Dlaczego:** `server.ts` importy są framework-bound. Props oddzielają komponent od frameworka. W praktyce ten pattern był krytyczny podczas koegzystencji Next.js + TanStack Start — ten sam komponent musiał działać w obu.

### Router queryClient context

```tsx
// app/router.tsx
export function getRouter() {
  const queryClient = new QueryClient()
  return createRouter({
    routeTree,
    context: { queryClient },
  })
}

// W loaderach — type-safe dostęp
loader: ({ context: { queryClient } }) => {
  return queryClient.ensureQueryData({...})
}
```

**Dlaczego:** Eliminuje importy `queryClient` w route files. Deklarowany w `routeTree.gen.ts` via `RootRoute['types']['routerContext']`. Każdy loader ma type-safe `context.queryClient`.

---

## 10. Deployment (Vercel)

### nitro() plugin wymagany

Bez `nitro()` w vite plugins (build mode), Vercel nie generuje serverless functions → 404 na wszystkich SSR routes. Lokalnie działa bez niego.

```tsx
plugins: [
  ...(command === 'build' ? [nitro()] : []),
]
```

**Vercel Framework Preset:** "TanStack Start" (built-in).

### Env vars

```
# Vite client-side (dostępne w bundle)
VITE_SUPABASE_URL=...

# Server-only (createServerFn, NIE w client bundle)
SUPABASE_SERVICE_ROLE_KEY=...
N8N_WEBHOOK_URL=...
```

**Zmiana z Next.js:** `NEXT_PUBLIC_*` → `VITE_*` dla client-side vars. Server-side vars dostępne przez `process.env.*` wewnątrz `createServerFn`.

---

## 11. Bugi i gotchas

### Krytyczne (powodują crash lub infinite loading)

| Bug | Objawy | Przyczyna | Fix |
|-----|--------|-----------|-----|
| Virtual module stub bez preamble | Infinite loading na WSZYSTKICH stronach CMS | `window.__vite_plugin_react_preamble_installed__` nie ustawione | Zwróć React Refresh preamble code w stub, nie `undefined` |
| `'use server'` w `actions.ts` | Silent failure — handler nigdy wywołany | Next.js directive niezrozumiała dla TanStack Start | Migruj na `createServerFn()` w `server.ts` |
| `next/dynamic` w TanStack Start | "Rendered more hooks than during previous render" | Next.js dynamic import powoduje niestabilną liczbę hooków | `React.lazy()` + `<Suspense>` |
| `npm install` po usunięciu next | Downgrade TanStack Start (1.167 → 1.120) | npm przelicza dependency tree przy zmianie lockfile | `rm -rf node_modules && npm ci` z oryginalnym lockfile |
| `@tiptap/html` bez happy-dom | 500 na każdym route importującym generateHTML | Vite SSR wybiera server entry wymagające DOM environment | Dodaj `happy-dom` do deps |
| pnpm z TanStack Start monorepo | Wszystkie routes 404 | Duplicate `@tanstack/*` w root + app node_modules | Używaj npm, nie pnpm |

### Subtlne (silent failures, wrong data)

| Bug | Objawy | Przyczyna | Fix |
|-----|--------|-----------|-----|
| Server fn zwraca undefined na 500 | `TypeError: Cannot read property 'success' of undefined` | RPC nie propaguje server errors | Zawsze null-check result przed `.success` |
| `inputValidator(zodSchema)` bez wrappera | Handler nigdy wywołany, brak erroru | RPC nie wywołuje `.parse()` na raw schema | Function wrapper: `(input) => schema.parse(input)` |
| Default GET na createServerFn | 431 Request Header Fields Too Large | Dane serializowane w URL params | Zawsze `{ method: 'POST' }` |
| JSON.stringify content przed server fn | Zod validation fails | Schema oczekuje object, dostaje string | Pass objects as-is |
| `useState` z async `prefetchQuery` | Pusty state na pierwszym renderze | `prefetchQuery` non-blocking, cache pusty synchronicznie | `useQuery` lub `useSuspenseQuery` zamiast `useState(cache)` |
| Browser client empty na SSR | Puste dane na serwerze | `createBrowserClient()` na serwerze nie ma cookies | Intencjonalne dla CMS Pattern A — `useQuery` wypełnia na kliencie |
| Tiptap `useEditor` ignoruje content prop | Editor nie aktualizuje się po async load | `useEditor()` czyta `content` tylko raz | `useEffect` z `editor.commands.setContent()` |
| `useQuery` przed `QueryClientProvider` | SSR crash | W `__root.tsx` QueryClient jeszcze nie jest w tree | `Route.useLoaderData()` w root, `useQuery` w child routes |

### Migracyjne (specyficzne dla Next.js → TanStack)

| Problem | Gdzie | Fix |
|---------|-------|-----|
| `messages.navigation.xxx` nie istnieje | Agent hallucynował key name | Zawsze `grep messages.ts` — CMS używa `messages.nav` |
| `export { X } from 'module'` w Server Actions | Turbopack barrel re-export bug | `import { X }; export const Y = X` |
| Legacy Next.js files obok TanStack routes | Validator fałszywie flaguje dead code | Oba potrzebne do pełnej migracji — nie kasuj legacy files |
| `next` package removed → stale caches | Phantom import errors | `rm -rf .vite .vinxi .next && npm install` |
| SEO elements zgubione | Brak meta tags po migracji | Checklist w sekcji 6 |

---

## Podsumowanie decyzji architektonicznych

| Decyzja | Wybór | Alternatywa | Dlaczego ten wybór |
|---------|-------|-------------|-------------------|
| Data fetching CMS | Pattern A (useQuery + server fn) | Pattern B (loader + useLoaderData) | CMS nie potrzebuje SSR data ani SEO; komponenty self-contained |
| Data fetching Website | Pattern B (loader + useLoaderData) | Pattern A | SEO wymaga danych w `head()`; ISR przez `headers()` |
| Auth mechanism | `beforeLoad` w route tree | `requestMiddleware` | requestMiddleware pomija client-side navigation |
| Auth level | Dwa poziomy (basic + full RBAC) | Jeden uniwersalny | Dodatkowy query na permissions niepotrzebny dla GET endpoints |
| Error handling | neverthrow `Result` pipeline | try/catch | Type-safe error chaining; `.match()` wymusza obsługę obu ścieżek |
| Supabase client (CMS) | `createServerClient` (cookies) | `createServiceClient` | Auth-required — potrzebuje user session |
| Supabase client (Website) | `createServiceClient` (service role) | `createServerClient` | Publiczny — brak cookie session |
| Env vars | `VITE_*` (client) + `process.env` (server) | `NEXT_PUBLIC_*` | Vite convention; `process.env` undefined w client bundle |
| ISR replacement | `headers()` z Cache-Control | Custom cache layer | Native HTTP caching; Vercel CDN honoruje s-maxage |
| Package manager | npm | pnpm | pnpm tworzy duplicate TanStack instances → SSR routing broken |
| React memoization | React Compiler (auto) | Manual useCallback/useMemo | Compiler auto-memoizes; manual memoization = dead code |
