Thought for 2s# Obszerny przewodnik po Next.js Cache

Next.js oferuje zaawansowany system cachowania, który znacząco poprawia wydajność aplikacji. W Next.js 16 wprowadzono nowe, bardziej elastyczne API cachowania oparte na dyrektywie `"use cache"`.

---

## 1. Podstawy Cachowania w Next.js

### Rodzaje cache w Next.js:

| Typ Cache | Opis | Lokalizacja
|-----|-----|-----
| **Request Memoization** | Deduplikacja requestów w ramach jednego renderowania | Serwer
| **Data Cache** | Trwałe cachowanie danych między requestami | Serwer
| **Full Route Cache** | Cachowanie całych stron (HTML + RSC Payload) | Serwer
| **Router Cache** | Cachowanie odwiedzonych segmentów po stronie klienta | Klient


---

## 2. Cache Components (Next.js 16+)

Nowa dyrektywa `"use cache"` pozwala na explicite oznaczanie co ma być cachowane.

### Włączanie Cache Components

```javascript
// next.config.mjs
const nextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

### Cachowanie na poziomie pliku

```typescriptreact
// app/products/page.tsx
'use cache'

export default async function ProductsPage() {
  const products = await fetch('https://api.example.com/products')
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Cachowanie na poziomie komponentu

```typescriptreact
// components/featured-products.tsx
export async function FeaturedProducts() {
  'use cache'

  const products = await fetch('https://api.example.com/featured')
  const data = await products.json()

  return (
    <section>
      <h2>Polecane produkty</h2>
      {data.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  )
}
```

### Cachowanie na poziomie funkcji

```typescriptreact
// lib/data.ts
export async function getProducts() {
  'use cache'

  const response = await fetch('https://api.example.com/products')
  return response.json()
}

export async function getProductById(id: string) {
  'use cache'

  const response = await fetch(`https://api.example.com/products/${id}`)
  return response.json()
}
```

---

## 3. Cykl życia cache - `cacheLife`

Definiuj jak długo dane mają być cachowane:

### Wbudowane profile

```typescriptreact
import { cacheLife } from 'next/cache'

export async function getStaticData() {
  'use cache'
  cacheLife('max') // Cachuj jak najdłużej

  return fetch('https://api.example.com/static-data')
}

export async function getDynamicData() {
  'use cache'
  cacheLife('hours') // Cachuj przez kilka godzin

  return fetch('https://api.example.com/dynamic-data')
}
```

### Dostępne profile:

| Profil | Czas cache | Użycie
|-----|-----|-----
| `'max'` | Maksymalny | Dane statyczne, rzadko zmieniane
| `'days'` | Dni | Dane aktualizowane codziennie
| `'hours'` | Godziny | Dane aktualizowane kilka razy dziennie
| `'minutes'` | Minuty | Dane często aktualizowane
| `'seconds'` | Sekundy | Dane prawie real-time


### Własna konfiguracja

```typescriptreact
import { cacheLife } from 'next/cache'

export async function getCustomCachedData() {
  'use cache'
  cacheLife({
    stale: 300,      // 5 minut - dane "stale" mogą być serwowane
    revalidate: 60,  // 1 minuta - po tym czasie rewalidacja w tle
    expire: 3600,    // 1 godzina - maksymalny czas życia
  })

  return fetch('https://api.example.com/data')
}
```

---

## 4. Cache Tags - `cacheTag`

Taguj dane dla precyzyjnej rewalidacji:

```typescriptreact
import { cacheTag } from 'next/cache'

export async function getProduct(id: string) {
  'use cache'
  cacheTag('products', `product-${id}`)

  const response = await fetch(`https://api.example.com/products/${id}`)
  return response.json()
}

export async function getProductsByCategory(category: string) {
  'use cache'
  cacheTag('products', `category-${category}`)

  const response = await fetch(`https://api.example.com/products?category=${category}`)
  return response.json()
}
```

---

## 5. Rewalidacja Cache

### `revalidateTag()`- Rewalidacja po tagu

```typescriptreact
// app/actions.ts
'use server'

import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string, data: ProductData) {
  await db.products.update({ where: { id }, data })

  // Rewaliduj z profilem cacheLife dla SWR behavior
  revalidateTag(`product-${id}`, 'max')
  revalidateTag('products', 'hours')
}

// Lub z własnym czasem rewalidacji
export async function updateCategory(category: string) {
  await db.categories.update({ where: { name: category } })

  revalidateTag(`category-${category}`, { revalidate: 3600 })
}
```

### `revalidatePath()`- Rewalidacja po ścieżce

```typescriptreact
'use server'

import { revalidatePath } from 'next/cache'

export async function createPost(data: PostData) {
  await db.posts.create({ data })

  // Rewaliduj konkretną stronę
  revalidatePath('/blog')

  // Rewaliduj z layoutem
  revalidatePath('/blog', 'layout')

  // Rewaliduj wszystkie strony pod ścieżką
  revalidatePath('/blog', 'page')
}
```

### `updateTag()`- Nowe API (Server Actions only)

Zapewnia semantykę "read-your-writes":

```typescriptreact
'use server'

import { updateTag } from 'next/cache'

export async function updateUserProfile(userId: string, data: UserData) {
  await db.users.update({ where: { id: userId }, data })

  // Użytkownik natychmiast zobaczy swoje zmiany
  updateTag(`user-${userId}`)
}
```

### `refresh()`- Odświeżanie danych bez cache

```typescriptreact
'use server'

import { refresh } from 'next/cache'

export async function syncWithExternalService() {
  // Pobierz świeże dane bez dotykania cache
  refresh()
}
```

---

## 6. Fetch API z Cachowaniem

### Podstawowe użycie

```typescriptreact
// Domyślnie cachowane
const data = await fetch('https://api.example.com/data')

// Wyłącz cache
const freshData = await fetch('https://api.example.com/data', {
  cache: 'no-store'
})

// Rewalidacja czasowa
const timedData = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // 1 godzina
})

// Z tagami
const taggedData = await fetch('https://api.example.com/data', {
  next: { tags: ['products', 'featured'] }
})
```

### Kombinacja opcji

```typescriptreact
const products = await fetch('https://api.example.com/products', {
  next: {
    revalidate: 60,
    tags: ['products']
  }
})
```

---

## 7. Dynamiczne vs Statyczne Renderowanie

### Wymuszanie dynamicznego renderowania

```typescriptreact
// app/dashboard/page.tsx
export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  // Ta strona zawsze będzie renderowana dynamicznie
  const user = await getCurrentUser()
  return <DashboardContent user={user} />
}
```

### Wymuszanie statycznego renderowania

```typescriptreact
// app/about/page.tsx
export const dynamic = 'force-static'

export default function About() {
  return <AboutContent />
}
```

### Opcje eksportu

```typescriptreact
// Czas rewalidacji dla całej strony
export const revalidate = 3600 // 1 godzina

// Dynamiczne zachowanie
export const dynamic = 'auto' | 'force-dynamic' | 'force-static' | 'error'

// Dynamiczne parametry
export const dynamicParams = true | false
```

---

## 8. Praktyczne Przykłady

### E-commerce: Lista produktów z cachowaniem

```typescriptreact
// lib/products.ts
import { cacheTag, cacheLife } from 'next/cache'

export async function getProducts(category?: string) {
  'use cache'
  cacheLife('hours')
  cacheTag('products', category ? `category-${category}` : 'all-products')

  const url = category
    ? `https://api.example.com/products?category=${category}`
    : 'https://api.example.com/products'

  const response = await fetch(url)
  return response.json()
}

// app/products/page.tsx
import { getProducts } from '@/lib/products'

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const products = await getProducts(category)

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Blog: Posty z ISR (Incremental Static Regeneration)

```typescriptreact
// lib/posts.ts
import { cacheTag, cacheLife } from 'next/cache'

export async function getPosts() {
  'use cache'
  cacheLife('minutes')
  cacheTag('posts')

  const response = await fetch('https://api.example.com/posts')
  return response.json()
}

export async function getPost(slug: string) {
  'use cache'
  cacheLife('hours')
  cacheTag('posts', `post-${slug}`)

  const response = await fetch(`https://api.example.com/posts/${slug}`)
  return response.json()
}

// app/blog/[slug]/page.tsx
import { getPost, getPosts } from '@/lib/posts'

// Generuj statyczne ścieżki
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map(post => ({ slug: post.slug }))
}

export default async function PostPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)

  return <article>{/* ... */}</article>
}
```

### Dashboard: Dane użytkownika bez cache

```typescriptreact
// app/dashboard/page.tsx
import { cookies } from 'next/headers'

export default async function Dashboard() {
  // cookies() automatycznie oznacza stronę jako dynamiczną
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')

  // Te dane nie będą cachowane
  const userData = await fetch('https://api.example.com/user', {
    headers: { Authorization: `Bearer ${token?.value}` },
    cache: 'no-store'
  })

  return <DashboardContent data={await userData.json()} />
}
```

---

## 9. Debugowanie Cache

### Nagłówki odpowiedzi

Sprawdź nagłówki HTTP aby zobaczyć status cache:

- `x-nextjs-cache: HIT` - Dane z cache
- `x-nextjs-cache: MISS` - Dane pobrane na nowo
- `x-nextjs-cache: STALE` - Stale dane (rewalidacja w tle)


### Logowanie w development

```typescriptreact
// next.config.mjs
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

---

## 10. Best Practices

### Dobre praktyki

```typescriptreact
// 1. Używaj tagów dla granularnej rewalidacji
export async function getProduct(id: string) {
  'use cache'
  cacheTag('products', `product-${id}`)
  // ...
}

// 2. Grupuj powiązane dane pod wspólnymi tagami
cacheTag('store', 'products', `product-${id}`)

// 3. Używaj odpowiednich profili cacheLife
cacheLife('max')     // Dla danych statycznych
cacheLife('hours')   // Dla danych semi-dynamicznych
cacheLife('seconds') // Dla danych real-time
```

### Czego unikać

```typescriptreact
// 1. Nie mieszaj cache z danymi użytkownika
export async function getUserData() {
  'use cache' // ❌ Dane użytkownika nie powinny być cachowane globalnie
  return fetch('/api/user')
}

// 2. Nie cachuj danych wrażliwych
export async function getSecrets() {
  'use cache' // ❌ Nigdy nie cachuj sekretów
  return process.env.SECRET_KEY
}

// 3. Nie zapomnij o rewalidacji przy mutacjach
export async function updateProduct(id: string, data: any) {
  await db.update(data)
  // ❌ Brak rewalidacji = stale dane
}
```

---

## Podsumowanie

| Funkcja | Użycie
|-----|-----|-----
| `'use cache'` | Oznacz co cachować
| `cacheLife()` | Określ jak długo cachować
| `cacheTag()` | Taguj dla rewalidacji
| `revalidateTag()` | Rewaliduj po tagu
| `revalidatePath()` | Rewaliduj po ścieżce
| `updateTag()` | Read-your-writes
| `refresh()` | Odśwież bez cache


Nowy system cachowania w Next.js 16 jest bardziej explicite i daje większą kontrolę nad tym, co i jak długo jest cachowane. Wykorzystuj `"use cache"` tam, gdzie chcesz cachować, i precyzyjnie rewaliduj dane gdy się zmieniają.