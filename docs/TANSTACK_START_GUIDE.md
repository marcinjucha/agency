# TanStack Start — Praktyczny przewodnik

> Dokumentacja wzorców używanych w migracji CMS Halo Efekt.  
> Aktualizowana w miarę migracji kolejnych features.

---

## 1. Model wykonania — najważniejszy koncept

```
┌─────────────────────────────────────────────────────────────┐
│  ISOMORPHIC BY DEFAULT: kod działa na serwerze I kliencie   │
└─────────────────────────────────────────────────────────────┘
```

**Co to znaczy w praktyce:**

| Gdzie jest kod | Gdzie się wykonuje |
|---|---|
| `function formatDate(d: Date)` | Serwer + Klient |
| `Route.beforeLoad = async () => ...` | Serwer (SSR) + Klient (nawigacja) |
| `createServerFn().handler(async () => ...)` | **Tylko serwer** — na kliencie = RPC fetch |
| `createServerOnlyFn(() => ...)` | **Tylko serwer** — na kliencie rzuca błąd |
| `useEffect(() => ...)` | **Tylko klient** — po hydration |

### Pułapka #1: loaderze nie są server-only

```ts
// ❌ ZŁE — process.env jest widoczny w bundle klienta!
export const Route = createFileRoute('/admin')({
  loader: async () => {
    const secret = process.env.SUPABASE_SERVICE_KEY // 💥 wyciek do klienta
    return await fetch(`/api/data?key=${secret}`)
  },
})

// ✅ DOBRE — createServerFn izoluje kod serwerowy
const getDataFn = createServerFn().handler(async () => {
  const secret = process.env.SUPABASE_SERVICE_KEY // bezpieczne
  return await fetch(`/api/data?key=${secret}`)
})

export const Route = createFileRoute('/admin')({
  loader: () => getDataFn(), // isomorphic call → RPC na kliencie
})
```

### Pułapka #2: NEXT_PUBLIC_ vs VITE_

```ts
// W createServerFn (serwer-only) — NEXT_PUBLIC_ działa
process.env.NEXT_PUBLIC_SUPABASE_URL // ✅ server-only

// W komponentach (klient) — trzeba VITE_ prefix
import.meta.env.VITE_SUPABASE_URL    // ✅ client bundle

// Nasze podejście: trzymamy NEXT_PUBLIC_ bo clienta budujemy przez @supabase/ssr
// z createServerFn — nigdy bezpośrednio w loaderach
```

---

## 2. createServerFn — zamiennik `'use server'`

### Przed (Next.js):
```ts
'use server'
export async function createSurvey(data: FormData) {
  const supabase = await createClient() // next/headers
  const { userId, tenantId } = await requireAuth('surveys.manage')
  // ...
}
```

### Po (TanStack Start):
```ts
// lib/server-fns/surveys.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createStartClient } from '@/lib/supabase/server-start'

const createSurveySchema = z.object({ name: z.string().min(1) })

export const createSurveyFn = createServerFn()
  .inputValidator(createSurveySchema)         // Zod validation (nie .validator!)
  .handler(async ({ data }) => {
    const supabase = createStartClient()       // @tanstack/start-server-core cookies
    // ...
    return { success: true as const }
  })
```

### Wywołanie z komponentu:
```ts
// W komponencie — jak zwykła funkcja
const result = await createSurveyFn({ data: { name: 'Nowa ankieta' } })

// Z TanStack Query
const { mutate } = useMutation({ mutationFn: createSurveyFn })
mutate({ data: { name: 'Nowa ankieta' } })
```

### Typy zwracane — wzorzec discriminated union:
```ts
// ✅ Typed success/failure — nie rzucaj wyjątków (clean code)
export const loginFn = createServerFn()
  .handler(async (): Promise<{ success: true } | { success: false; error: string }> => {
    // ...
  })

// Wywołanie
const result = await loginFn()
if (!result.success) showError(result.error)
```

---

## 3. Routing — mapowanie Next.js → TanStack Start

### Konwencje plików:

```
Next.js App Router          TanStack Start (app/routes/)
─────────────────────────   ──────────────────────────────────
app/layout.tsx              routes/__root.tsx
app/page.tsx                routes/index.tsx
app/admin/page.tsx          routes/_admin/index.tsx
app/admin/layout.tsx        routes/_admin.tsx  (pathless layout)
app/blog/[slug]/page.tsx    routes/blog.$slug.tsx
app/api/foo/route.ts        routes/api/foo.ts  (server.handlers)
```

### Pathless layout (underscore prefix):
```ts
// routes/_admin.tsx — chroni wszystko pod /admin/*
// URL NIE zawiera "_admin" — to tylko layout wrapper
export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ context }) => {
    if (!context.auth) throw redirect({ to: '/login' })
  },
  component: AdminLayout,  // wrapper z Sidebar, Providers
})

// routes/_admin/surveys.tsx → URL: /admin/surveys (bez "_admin")
// routes/_admin/responses.tsx → URL: /admin/responses
```

### Dynamic params:
```ts
// routes/surveys.$id.tsx
export const Route = createFileRoute('/surveys/$id')({
  loader: ({ params }) => getSurveyFn({ data: { id: params.id } }),
})

function SurveyPage() {
  const survey = Route.useLoaderData()
  const { id } = Route.useParams()
}
```

---

## 4. Auth pattern — Router Context

### Dlaczego `beforeLoad` a nie middleware?

```
┌─────────────────────────────────────────┐
│  requestMiddleware (app/start.ts)        │
│  → tylko server-side HTTP requests       │
│  → NIE uruchamia się dla client nav      │
└─────────────────────────────────────────┘
              vs
┌─────────────────────────────────────────┐
│  beforeLoad w __root.tsx                 │
│  → SSR (server) + client navigation      │
│  → auth state zawsze server-authoritative│
│  → wynik cache'owany przez TanStack Router│
└─────────────────────────────────────────┘
```

### Pełny przepływ auth:

```ts
// 1. router.tsx — typ kontekstu
export type RouterContext = {
  auth: { userId: string; tenantId: string; isSuperAdmin: boolean } | null
}

// 2. __root.tsx — hydratacja kontekstu przy każdej nawigacji
export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const auth = await getAuthContextFn() // createServerFn → RPC na kliencie
    return { auth }                        // propaguje do wszystkich child routes
  },
})

// 3. _admin.tsx — guard
export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ context }) => {
    if (!context.auth) throw redirect({ to: '/login' })
    // context.auth jest typed: { userId, tenantId, isSuperAdmin }
  },
})

// 4. Dowolny child route — dostęp do auth
function SurveyPage() {
  const { auth } = Route.useRouteContext()
  // auth.tenantId, auth.userId, auth.isSuperAdmin
}
```

### Loader data vs Route context:
```ts
// context: dostępny przez cały drzewo (auth, permissions)
// loaderData: specyficzne dla route (dane strony)

export const Route = createFileRoute('/_admin/surveys')({
  // loader = dane specyficzne dla tej strony
  loader: () => getSurveysFn(),

  // beforeLoad może rozszerzyć context
  beforeLoad: ({ context }) => {
    if (!context.auth) throw redirect({ to: '/login' })
  },

  component: SurveysPage,
})

function SurveysPage() {
  const surveys = Route.useLoaderData()    // dane surveys
  const { auth } = Route.useRouteContext() // auth z __root
}
```

---

## 5. Supabase SSR — cookie adapter

### Problem: `cookies()` z `next/headers` nie działa w TanStack Start

```ts
// ❌ Next.js only
import { cookies } from 'next/headers'
const cookieStore = await cookies()

// ✅ TanStack Start — lib/supabase/server-start.ts
import { getCookies, setCookie } from '@tanstack/start-server-core'

export function createStartClient() {
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        const cookies = getCookies()
        // getCookies() zwraca Record<string, string>, supabase/ssr potrzebuje {name, value}[]
        return Object.entries(cookies).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => setCookie(name, value, options))
      },
    },
  })
}
```

**Dwa klienty koegzystują podczas migracji:**
- `lib/supabase/server.ts` — dla Next.js Server Actions/Components
- `lib/supabase/server-start.ts` — dla TanStack Start createServerFn

---

## 6. Hook mapping — Next.js → TanStack

```ts
// Navigation
useRouter()                    → useNavigate()
router.push('/path')           → navigate({ to: '/path' })
router.replace('/path')        → navigate({ to: '/path', replace: true })
redirect('/path')              → throw redirect({ to: '/path' })

// URL state
usePathname()                  → useRouterState({ select: s => s.location.pathname })
useSearchParams()              → useSearch({ strict: false })
router.refresh()               → router.invalidate()

// Links
<Link href="/admin">           → <Link to="/admin">
<Link href="/blog?q=foo">      → <Link to="/blog" search={{ q: 'foo' }}>

// Not found
notFound()                     → throw notFound()

// Params
// Next.js: async function Page({ params }: { params: Promise<{ id: string }> })
// TanStack: Route.useParams() lub loader({ params })
```

---

## 7. Head / SEO

```ts
// lib/head.ts — helper dla CMS (admin = noindex)
export function buildCmsHead(pageTitle?: string) {
  return {
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: pageTitle ? `${pageTitle} | Halo Efekt CMS` : 'Halo Efekt CMS' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }
}

// W route:
export const Route = createFileRoute('/admin/surveys')({
  head: () => ({
    ...buildCmsHead('Ankiety'),
  }),
})
```

**Kluczowa różnica vs Next.js:**
```ts
// Next.js
export const metadata: Metadata = { title: 'Ankiety | CMS' }
export async function generateMetadata({ params }) { ... }

// TanStack Start
export const Route = createFileRoute('/admin/surveys')({
  head: ({ loaderData }) => ({  // może używać loader data!
    ...buildCmsHead(loaderData?.survey?.name ?? 'Ankieta'),
  }),
})
```

---

## 8. Middleware — kiedy używać

```ts
// app/start.ts — globalne middleware (OPCJONALNE)
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  // requestMiddleware: [loggingMiddleware],  // każdy HTTP request (SSR)
  // functionMiddleware: [authMiddleware],    // każdy createServerFn call
}))
```

**Kiedy requestMiddleware:**
- Logi HTTP requestów
- CSP / security headers
- Redirect przed renderowaniem React (performance dla unauth users)
- Rate limiting

**Kiedy NIE używać do auth:**
Nie obsługuje client-side navigation → `beforeLoad` w `__root.tsx` jest wymagany.

---

## 9. Sentry / GlitchTip

```ts
// app/client.tsx — integracja po stronie klienta
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN,
  environment: import.meta.env.MODE, // 'development' | 'production'
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration()],
  tracesSampleRate: 0.1, // 10% w produkcji
})

// app/routes/__root.tsx — error boundary
import { Sentry } from '@sentry/tanstackstart-react'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Sentry.withSentryReactRouterV7Routing(RootLayout),
  // lub użyj ErrorComponent:
  errorComponent: ({ error }) => {
    Sentry.captureException(error)
    return <div>Coś poszło nie tak</div>
  },
})
```

---

## 10. TanStack Query w TanStack Start

TanStack Query **NIE jest** zależnością Next.js — działa identycznie w TanStack Start.

```ts
// QueryClientProvider w _admin.tsx layout (nie w __root.tsx — tylko admin potrzebuje)
function AdminLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }
  }))
  
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}

// Użycie w komponencie — identycznie jak w Next.js
function SurveyList() {
  const { data } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => getSurveysFn(),  // createServerFn zamiast fetch('/api/...')
  })
}
```

**Kluczowa zmiana:** `queryFn` wywołuje `createServerFn` zamiast `fetch()` do API routes.

---

## Powiązane pliki

- `docs/TANSTACK_CMS_MIGRATION.md` — postęp migracji per iteracja
- `.claude/skills/tanstack-setup/SKILL.md` — vite.config.ts, entry points
- `.claude/skills/tanstack-routing/SKILL.md` — routing, beforeLoad, head()
- `.claude/skills/tanstack-server/SKILL.md` — createServerFn, middleware
- `.claude/skills/tanstack-routing/resources/nextjs-migration-map.md` — mapa konwersji
