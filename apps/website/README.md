# Legal Mind - Website App

Public-facing marketing website and client survey forms.

## URLs

- **Development:** http://localhost:3000
- **Production:** https://legal-mind-website.vercel.app (or custom domain)

## Features

- Marketing pages (homepage, pricing, about, contact)
- Client survey forms (dynamic `/survey/[token]` routes)
- Calendar booking interface
- No authentication required (public access)

## Development

```bash
# From monorepo root
npm run dev:website

# Or directly
cd apps/website
npm run dev
```

## Build

```bash
# From monorepo root
npm run build:website

# Or with Turbo
npx turbo run build --filter=@legal-mind/website
```

## Environment Variables

See `.env.local.example` for required variables.

## Deployment

Deployed automatically via Vercel when pushing to `main` branch.

Manual deployment:
```bash
vercel --cwd apps/website --prod
```

See `/docs/DEPLOYMENT.md` for full instructions.
