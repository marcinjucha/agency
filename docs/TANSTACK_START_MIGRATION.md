# Migracja Next.js → TanStack Start

Dokument opisuje migrację `apps/shop/jacek/` z Next.js 16 (App Router) na TanStack Start v1.167 + Vite 8. Lekcje dotyczą całego monorepo i przyszłych migracji (kolega, tata).

## Kluczowe różnice architektoniczne

| Aspekt | Next.js | TanStack Start |
|--------|---------|----------------|
| Build tool | Turbopack/webpack (wewnętrzny) | Vite (explicit) |
| Routing | `app/` directory, RSC | `routes/` directory, file-based |
| Data fetching | async Server Components | `loader()` + `createServerFn()` |
| Server-only code | Domyślnie (RSC) | Explicit via `createServerFn()` |
| Client-only code | `'use client'` directive | Nie istnieje — wszystko jest izomorficzne |
| Caching/ISR | `unstable_cache`, `revalidate` | HTTP `Cache-Control` headers na route |
| Metadata/SEO | `export const metadata`, `generateMetadata()` | `head()` na route + `<HeadContent />` |
| CSS | PostCSS (`@tailwindcss/postcss`) | Vite plugin (`@tailwindcss/vite`) |
| Images | `next/image` (optymalizacja) | Plain `<img>` |
| Fonts | `next/font/google` (auto-optimize) | `@fontsource/*` npm packages |
| Config | `next.config.ts` | `vite.config.ts` + `tanstackStart()` |
| Entry points | Automatyczne | Explicit: `router.tsx`, `ssr.tsx`, `client.tsx` |

## Problemy i rozwiązania

### P1: Loadery crashują na kliencie (CRITICAL)

**Problem:** TanStack Start jest izomorficzny — loadery uruchamiają się zarówno na serwerze jak i na kliencie. Kod wywołujący `process.env.TENANT_ID` lub tworzący Supabase client z server-side env vars crashuje na kliencie.

**Objaw:** Runtime error "Missing TENANT_ID environment variable" po client-side navigation.

**Rozwiązanie:** Każdy loader wywołujący server-only code musi używać `createServerFn()`:

```tsx
// ZŁE — crashuje na kliencie
export const Route = createFileRoute('/')({
  loader: async () => {
    const products = await getPublishedProducts() // process.env.TENANT_ID wewnątrz
    return { products }
  },
})

// DOBRE — createServerFn gwarantuje server-only execution
const fetchProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const products = await getPublishedProducts()
  return { products }
})

export const Route = createFileRoute('/')({
  loader: () => fetchProducts(),
})
```

**Reguła:** Jeśli loader dotyka `process.env`, bazy danych, albo czegokolwiek server-only → `createServerFn()`.

---

### P2: Vite 7 nie montuje SSR middleware (CRITICAL)

**Problem:** Dev server startuje, `routeTree.gen.ts` generuje się, ale wszystkie route'y zwracają 404 ("Cannot GET /"). SSR handler jest poprawny (sprawdzony programatycznie), ale middleware nie jest montowany do Vite dev server.

**Root cause:** W `@tanstack/start-plugin-core` dev server plugin, warunek w `configureServer()`:
```js
if (!isRunnableDevEnvironment(serverEnv) || "dispatchFetch" in serverEnv) return;
```
Na Vite 7 middleware nie jest montowany z powodu incompatibility w Environment API. Na Vite 8 działa poprawnie.

**Debugowanie, które to ujawniło:**
```js
// Programatycznie przez Vite 8 — status 200 (działa)
const mod = await ssrEnv.runner.import('virtual:tanstack-start-server-entry')
const resp = await mod.default.fetch(new Request('http://localhost:3002/'))
// resp.status === 200, body = poprawny HTML

// Przez curl na Vite 7 — status 404 (middleware nie zamontowany)
curl http://localhost:3002/  // "Cannot GET /"
```

**Rozwiązanie:** Wymagany `vite@^8.0.0` w `package.json`. Vite 8 poprawnie montuje SSR middleware.

---

### P3: `app.config.ts` nie istnieje w TanStack Start v1.167

**Problem:** Wiele tutoriali i starszych przykładów pokazuje `app.config.ts` z `defineConfig` z `@tanstack/react-start/config`. Ten moduł nie istnieje w v1.167.

**Rozwiązanie:** Używać standardowego `vite.config.ts` z pluginem `tanstackStart()`:

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tanstackStart({
      srcDirectory: 'app',        // domyślnie 'src'
      tsr: { appDirectory: 'app' },
    }),
    viteReact({ ... }),
    tailwindcss(),
  ],
})
```

---

### P4: `srcDirectory` domyślnie to `src/`, nie `app/`

**Problem:** Plugin szuka entry points (`router.tsx`, `ssr.tsx`, `client.tsx`) w `src/` domyślnie. Nasz projekt trzyma je w `app/`. Bez `srcDirectory: 'app'` error: "Could not resolve entry for router entry: router in .../src".

**Rozwiązanie:** `tanstackStart({ srcDirectory: 'app' })` w `vite.config.ts`.

---

### P5: `Meta` → `HeadContent`, `Scripts` z `@tanstack/react-router`

**Problem:** Wiele tutoriali pokazuje `import { Meta, Scripts } from '@tanstack/react-start'`. W v1.167 `Meta` nie istnieje — nazywa się `HeadContent` i jest eksportowany z `@tanstack/react-router`.

**Rozwiązanie:**
```tsx
import { HeadContent, Scripts, Outlet, ScrollRestoration } from '@tanstack/react-router'

// W root layout:
<head>
  <HeadContent />
</head>
<body>
  <Outlet />
  <Scripts />
</body>
```

---

### P6: Router factory musi eksportować `getRouter()`, nie `createRouter()`

**Problem:** `routeTree.gen.ts` auto-generuje `import type { getRouter } from './router.tsx'`. Jeśli eksportujemy `createRouter()`, TypeScript zgłasza type mismatch.

**Rozwiązanie:**
```tsx
// app/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {   // NIE createRouter()
  return createRouter({ routeTree, scrollRestoration: true })
}
```

---

### P7: `ssr.tsx` wymaga `createServerEntry` wrapper

**Problem:** Dev server plugin wywołuje `(await import(serverEntry)).default.fetch(request)`. Eksportowanie gołego `RequestHandler` nie działa — potrzebny obiekt `{ fetch: handler }`.

**Rozwiązanie:** Skopiować wzór z default entry pakietu:
```tsx
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const fetch = createStartHandler(defaultStreamHandler)

export function createServerEntry(entry) {
  return { async fetch(...args) { return await entry.fetch(...args) } }
}

export default createServerEntry({ fetch })
```

---

### P8: `client.tsx` — `StartClient` bez propsów

**Problem:** `StartClient` w v1.167 nie przyjmuje propsów (router jest rozwiązywany wewnętrznie). Stare tutoriale pokazują `<StartClient router={router} />`.

**Rozwiązanie:**
```tsx
import { StartClient } from '@tanstack/react-start/client'
import { hydrateRoot } from 'react-dom/client'
import { startTransition, StrictMode } from 'react'

startTransition(() => {
  hydrateRoot(document, <StrictMode><StartClient /></StrictMode>)
})
```

---

### P9: `'use client'` nie istnieje w TanStack Start

**Problem:** Wszystkie komponenty z `'use client'` directive (z Next.js) generują zbędny kod. TanStack Start jest izomorficzny — nie ma podziału server/client components.

**Rozwiązanie:** Usunąć wszystkie `'use client'` directives z plików komponentów.

---

### P10: Tailwind v4 wymaga `@tailwindcss/vite`, nie `@tailwindcss/postcss`

**Problem:** PostCSS approach działa z Next.js, ale oficjalna dokumentacja TanStack Start wymaga Vite plugin approach.

**Rozwiązanie:**
1. Zainstalować `@tailwindcss/vite`
2. Usunąć `@tailwindcss/postcss` i `postcss.config.mjs`
3. Dodać `tailwindcss()` do `vite.config.ts` plugins
4. Importować CSS z `?url` query:

```tsx
/// <reference types="vite/client" />
import appCss from '../globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
})
```

---

### P11: `next/image` → plain `<img>`

**Problem:** `next/image` component nie istnieje poza Next.js. Propsy `fill`, `sizes`, `priority` nie mają odpowiedników.

**Rozwiązanie:**
- `<Image fill>` → `<img className="w-full h-full object-cover">`
- `priority` → `loading="eager"` (above fold) lub `loading="lazy"` (below fold)
- `sizes` → usunąć (browser obsługuje natywnie)
- S3 URLs nie wymagają optymalizacji frameworka

---

### P12: `next/navigation` hooks → TanStack Router

| Next.js | TanStack Router |
|---------|-----------------|
| `useRouter()` | `useNavigate()` |
| `useSearchParams()` | `useSearch({ strict: false })` |
| `usePathname()` | `useRouterState({ select: s => s.location.pathname })` |
| `router.replace('?q=foo')` | `navigate({ search: prev => ({...prev, q: 'foo'}), replace: true })` |
| `searchParams.get('q')` | `search.q as string \| undefined` |
| `notFound()` | `throw notFound()` (z `@tanstack/react-router`) |

---

### P13: `next/font/google` → `@fontsource/*`

**Problem:** Next.js automatycznie optymalizuje fonty (self-hosting, CSS variables). TanStack Start nie ma tego mechanizmu.

**Rozwiązanie:**
```bash
npm install @fontsource/merriweather @fontsource-variable/geist
```
```tsx
// W __root.tsx
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'
import '@fontsource-variable/geist'
```
Uwaga: `@fontsource-variable/geist-sans` NIE istnieje na npm. Prawidłowa nazwa to `@fontsource-variable/geist`.

---

### P14: ISR via HTTP headers zamiast `unstable_cache`

**Problem:** Next.js ISR używa `unstable_cache` z `revalidate` + `tags`. TanStack Start nie ma tego mechanizmu.

**Rozwiązanie:** Route-level `headers()` z `Cache-Control`:
```tsx
export const Route = createFileRoute('/produkty/')({
  loader: () => fetchProducts(),
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
})
```

Opcjonalnie client-side cache:
```tsx
staleTime: 60_000,   // dane świeże przez 60s na kliencie
gcTime: 5 * 60_000,  // w pamięci przez 5 minut
```

---

### P15: `type: "module"` wymagany w `package.json`

**Problem:** `@tanstack/react-start/plugin/vite` jest ESM-only. Bez `"type": "module"` w package.json, Vite nie może załadować configu.

**Objaw:** "This package is ESM only but it was tried to load by `require`"

**Rozwiązanie:** Dodać `"type": "module"` do `package.json`.

---

### P16: Sitemap i robots jako server route handlers

**Problem:** Next.js ma wbudowane `MetadataRoute.Sitemap` i `MetadataRoute.Robots`. TanStack Start nie ma odpowiednika.

**Rozwiązanie:** File routes z `server.handlers`:
```tsx
// app/routes/sitemap[.xml].tsx
export const Route = createFileRoute('/sitemap[.xml]')({
  server: {
    handlers: {
      GET: async () => {
        const xml = `<?xml version="1.0"?>...`
        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        })
      },
    },
  },
})
```
Bracket escape `[.xml]` w nazwie pliku mapuje na literalny `/sitemap.xml` URL.

---

### P17: Monorepo Turborepo — build outputs

**Problem:** Turborepo cache'uje build outputs. TanStack Start buduje do `.output/`, nie `.next/`.

**Rozwiązanie:** W `turbo.json`:
```json
"build": {
  "outputs": [".next/**", "!.next/cache/**", "dist/**", ".output/**", ".vinxi/**"]
}
```

---

## Checklist migracji (do zastosowania przy kolega/tata)

- [ ] `package.json`: usunąć `next`, `next-plausible`, `eslint-config-next`
- [ ] `package.json`: dodać `@tanstack/react-router`, `@tanstack/react-start`, `vite@^8`, `@tailwindcss/vite`, `@fontsource/*`
- [ ] `package.json`: `"type": "module"`, scripts: `vite dev`, `vite build`
- [ ] Stworzyć `vite.config.ts` z `tanstackStart({ srcDirectory: 'app' })` + `tailwindcss()` + `viteReact()`
- [ ] Stworzyć `app/router.tsx` z `getRouter()` (nie `createRouter`)
- [ ] Stworzyć `app/ssr.tsx` z `createServerEntry({ fetch })` pattern
- [ ] Stworzyć `app/client.tsx` z `StartClient` (bez propsów)
- [ ] Usunąć `next.config.ts`, `postcss.config.mjs`
- [ ] `__root.tsx`: `HeadContent` + `Scripts` z `@tanstack/react-router`, CSS via `?url`
- [ ] Route files: `createFileRoute` + `loader` + `head()` + `headers()`
- [ ] Loadery z `process.env` → owinąć w `createServerFn()`
- [ ] Komponenty: `next/image` → `<img>`, `next/link` → TanStack `Link` (prop `to`), usunąć `'use client'`
- [ ] `queries.ts`: usunąć `unstable_cache` wrapper
- [ ] Sitemap/robots: file routes z `server.handlers`
- [ ] `tsconfig.json`: usunąć `next` plugin, dodać `moduleDetection: force`
- [ ] Uruchomić `vite dev` — sprawdzić czy `routeTree.gen.ts` się generuje
- [ ] Smoke test: curl na każdy route
