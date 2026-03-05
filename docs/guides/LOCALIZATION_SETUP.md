# Localization Setup - Installation & Configuration

Complete setup guide for next-intl localization in Halo Efekt website.

## Files Created

This localization system requires the following files that have been created:

### Configuration Files
- **apps/website/i18n.config.ts** - Routing and locale configuration
- **apps/website/middleware.ts** - Locale detection middleware

### Translation Messages
- **apps/website/messages/pl.json** - Polish translations
- **apps/website/messages/en.json** - English translations

### Helper Utilities
- **apps/website/lib/localization.ts** - Convenience functions for localization

### Documentation
- **apps/website/LOCALIZATION_QUICKSTART.md** - Quick reference guide
- **apps/website/docs/LOCALIZATION.md** - Complete documentation
- **apps/website/LOCALIZATION_SETUP.md** - This file

## Installation Steps

### Step 1: Install next-intl Package

```bash
cd /Users/marcinjucha/Prywatne/projects/halo-efekt

# Add next-intl to website app dependencies
npm install next-intl --workspace=@agency/website
```

### Step 2: Update Next.js Configuration

Add to `apps/website/next.config.ts`:

```typescript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.config.ts')

const nextConfig = {
  // ... existing config
}

export default withNextIntl(nextConfig)
```

### Step 3: Create Root Layout with Localization

Update or create `apps/website/app/[locale]/layout.tsx`:

```typescript
import { getLocale } from '@/lib/localization'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params
}: LayoutProps) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      <body>
        {children}
      </body>
    </html>
  )
}
```

### Step 4: Update Existing Pages

Move existing pages into `app/[locale]/` directory:

```
Before:
app/
├── page.tsx
├── pricing/
│   └── page.tsx

After:
app/
└── [locale]/
    ├── page.tsx
    ├── pricing/
    │   └── page.tsx
```

### Step 5: Use Translations in Components

Server Components:
```typescript
import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations()
  return <h1>{t('hero.headline')}</h1>
}
```

Client Components:
```typescript
'use client'
import { useTranslations } from 'next-intl'

export function Component() {
  const t = useTranslations()
  return <button>{t('nav.getStarted')}</button>
}
```

## Environment Setup

No environment variables needed for basic setup.

### Optional: Custom Messages Path

If you want messages in a different location, update `i18n.config.ts`:

```typescript
// apps/website/next.config.ts
const withNextIntl = createNextIntlPlugin(
  './i18n.config.ts',
  './locales' // Custom path
)
```

## Verification

### 1. Check Files Exist

```bash
# Check configuration
ls -la apps/website/i18n.config.ts
ls -la apps/website/middleware.ts

# Check messages
ls -la apps/website/messages/
# Should see: en.json, pl.json

# Check utilities
ls -la apps/website/lib/localization.ts
```

### 2. Validate JSON Syntax

```bash
# Validate Polish messages
node -e "console.log(JSON.parse(require('fs').readFileSync('apps/website/messages/pl.json')))"

# Validate English messages
node -e "console.log(JSON.parse(require('fs').readFileSync('apps/website/messages/en.json')))"
```

### 3. Test in Development

```bash
# Start development server
npm run dev:website

# Visit URLs
# Polish: http://localhost:3000
# Polish (explicit): http://localhost:3000/pl/pricing
# English: http://localhost:3000/en/pricing
```

### 4. Check in Browser Console

Open browser DevTools and check:
1. Network tab - requests should include locale in URL
2. HTML - `<html lang="pl">` or `<html lang="en">`
3. No errors about missing translations

## Next Steps

### 1. Update Root Layout

Create the locale-aware root layout as shown in Step 3 above.

### 2. Organize Pages

Move all pages to `app/[locale]/` directory structure:

```bash
# Example: move homepage
mv apps/website/app/page.tsx apps/website/app/[locale]/page.tsx

# Example: move pricing
mkdir -p apps/website/app/[locale]/pricing
mv apps/website/app/pricing/page.tsx apps/website/app/[locale]/pricing/
```

### 3. Add Language Switcher

Create a language switcher component to let users change locale:

```typescript
'use client'
import Link from 'next/link'
import { useLocale, usePathname } from 'next-intl'

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const newPathname = pathname.replace(`/${locale}`, '')

  return (
    <div className="flex gap-2">
      <Link href={`/pl${newPathname}`} className={locale === 'pl' ? 'font-bold' : ''}>
        Polski
      </Link>
      <Link href={`/en${newPathname}`} className={locale === 'en' ? 'font-bold' : ''}>
        English
      </Link>
    </div>
  )
}
```

### 4. Add Missing Translation Keys

As you build components, add new keys to both `messages/pl.json` and `messages/en.json`:

```json
{
  "newSection": {
    "title": "Title in language"
  }
}
```

## Troubleshooting

### next-intl Not Found Error

**Problem**: `Cannot find module 'next-intl'`

**Solution**:
```bash
npm install next-intl --workspace=@agency/website
npm install
```

### Locale Not in URL

**Problem**: URLs show `/pricing` instead of `/pl/pricing` or `/en/pricing`

**Expected**: This is correct behavior with `localePrefix: 'as-needed'`
- Default locale (pl) doesn't show in URL: `/pricing`
- Other locales show: `/en/pricing`

To always show locale, change in `i18n.config.ts`:
```typescript
localePrefix: 'always'  // Change from 'as-needed'
```

### Messages Not Loading

**Problem**: Keys show as `hero.headline` instead of translated text

**Solutions**:
1. Check `messages/` folder exists
2. Verify JSON syntax with `npm run validate:i18n`
3. Check `i18n.config.ts` has correct locale list
4. Restart dev server

### Missing Key Warnings

**Problem**: Console warnings about missing translation keys

**Solution**: Add key to all language files

```json
// messages/pl.json and messages/en.json
{
  "section": {
    "missingKey": "Translated text here"
  }
}
```

### Type Errors with useTranslations

**Problem**: TypeScript error with translation key

**Solution**: Ensure key exists in message files and restart TypeScript server

## File Checklist

Before running the app, verify:

- [ ] `apps/website/i18n.config.ts` exists (17 lines)
- [ ] `apps/website/middleware.ts` exists (40 lines)
- [ ] `apps/website/messages/pl.json` exists (valid JSON)
- [ ] `apps/website/messages/en.json` exists (valid JSON)
- [ ] `apps/website/lib/localization.ts` exists (150+ lines)
- [ ] `next.config.ts` has withNextIntl plugin
- [ ] `package.json` has next-intl dependency
- [ ] Locale layout at `app/[locale]/layout.tsx`

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev:website

# Check for errors
npm run lint

# Build for production
npm run build:website
```

## What Happens on First Run

1. **Middleware detects locale** from URL or Accept-Language header
2. **Locale set** (defaults to Polish)
3. **Messages loaded** from corresponding JSON file
4. **Components render** with translated strings
5. **Browser caches** locale preference

## Language Switching Flow

1. User clicks language switcher
2. Link href changes locale: `/en/pricing`
3. Middleware detects new locale
4. New messages loaded
5. Page re-renders with new language

## Performance Notes

- **Zero runtime overhead** - all at build time
- **No API calls** - messages bundled with app
- **No layout shift** - translations same size
- **Browser cache** - works per locale URL

## Common Customizations

### Add New Language

1. Create `messages/de.json` with all keys
2. Update `i18n.config.ts`: `locales: ['pl', 'en', 'de']`
3. Update `lib/localization.ts` helper names/flags
4. Test with `npm run dev:website`

### Change Default Locale

In `i18n.config.ts`:
```typescript
defaultLocale: 'en'  // Change from 'pl'
```

### Change URL Strategy

In `i18n.config.ts`:
```typescript
localePrefix: 'always'  // All URLs show locale: /pl/, /en/
```

## Support & Resources

- **Quick Reference**: `LOCALIZATION_QUICKSTART.md`
- **Full Guide**: `docs/LOCALIZATION.md`
- **Official Docs**: https://next-intl-docs.vercel.app/
- **Examples**: Check `messages/` folder for key structure

## Next Integration Points

Once localization is running, integrate with:
- [ ] Navbar component (use LanguageSwitcher)
- [ ] Marketing sections (use useTranslations())
- [ ] Survey form (use localized questions)
- [ ] API routes (handle locale in requests)
- [ ] Email templates (use locale for language selection)
