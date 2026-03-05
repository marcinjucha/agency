# Localization Quick Start

Quick reference for using translations in Halo Efekt.

## TL;DR - Use Translations in 30 Seconds

### Server Component
```typescript
import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations()
  return <h1>{t('hero.headline')}</h1>
}
```

### Client Component
```typescript
'use client'
import { useTranslations } from 'next-intl'

export function Button() {
  const t = useTranslations()
  return <button>{t('nav.getStarted')}</button>
}
```

## Available Translation Keys

See `messages/pl.json` and `messages/en.json` for all keys. Common ones:

```
nav.home              Navigation home link
nav.pricing           Navigation pricing link
nav.about             Navigation about link
nav.contact           Navigation contact link
nav.getStarted        "Get started" button

hero.headline         Hero section headline
hero.subheading       Hero section subheading
hero.ctaPrimary       Primary call-to-action button
hero.ctaSecondary     Secondary button

problems.headline     Problems section title
benefits.headline     Benefits section title
features.headline     Features section title

pricing.headline      Pricing section title
pricing.monthlyLabel  "per month" label

common.learnMore      Generic "Learn more" text
common.getStarted     Generic "Get started" text
```

## Get Current Locale

### Server Components
```typescript
import { getLocale } from '@/lib/localization'

export default async function Layout({ children }) {
  const locale = await getLocale()
  return <html lang={locale}>{children}</html>
}
```

### Client Components
```typescript
'use client'
import { useLocale } from 'next-intl'

export function Component() {
  const locale = useLocale()  // 'pl' or 'en'
  return <div>{locale}</div>
}
```

## Validate User Input

```typescript
import { isValidLocale } from '@/lib/localization'

const userLocale = searchParams.lang
if (isValidLocale(userLocale)) {
  // Safe to use
  doSomething(userLocale)
}
```

## Add New Translation Key

1. Add to `messages/pl.json`:
```json
"mySection": {
  "myKey": "Polish text"
}
```

2. Add to `messages/en.json`:
```json
"mySection": {
  "myKey": "English text"
}
```

3. Use in component:
```typescript
const t = useTranslations()
return <div>{t('mySection.myKey')}</div>
```

## Add New Language

1. Create `messages/[language].json` with all translations
2. Update `i18n.config.ts`:
   ```typescript
   locales: ['pl', 'en', 'de']  // Add new locale
   ```
3. Update `lib/localization.ts` helper functions (optional)
4. Test with `npm run dev:website`

## Language Switcher

```typescript
'use client'
import Link from 'next/link'
import { useLocale, usePathname } from 'next-intl'

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()

  // Remove locale prefix from pathname
  const newPathname = pathname.replace(`/${locale}`, '')

  return (
    <div>
      <Link href={`/pl${newPathname}`}>Polski</Link>
      <Link href={`/en${newPathname}`}>English</Link>
    </div>
  )
}
```

## Type Safety

The system is type-safe at runtime:
```typescript
const t = useTranslations()
t('nav.home')         // ✅ Works
t('nonexistent.key')  // ❌ Runtime error
```

## URL Patterns

- `/` - Polish home (default)
- `/pricing` - Polish pricing
- `/en` - English home
- `/en/pricing` - English pricing
- `/en/survey/abc123` - English survey with token

## Files to Know

| File | Purpose |
|------|---------|
| `i18n.config.ts` | Locale configuration |
| `middleware.ts` | Locale detection & routing |
| `messages/pl.json` | Polish translations |
| `messages/en.json` | English translations |
| `lib/localization.ts` | Helper utilities |
| `docs/LOCALIZATION.md` | Full documentation |

## Common Issues

**Missing translation key warning?**
- Add key to all language files with identical structure

**Locale not changing in URL?**
- Check browser has cookies enabled
- Clear browser cache
- Restart dev server

**JSON syntax error?**
- Use JSONLint to validate `messages/*.json` files

## Need More Help?

See full guide: `/docs/LOCALIZATION.md`
