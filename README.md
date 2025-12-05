# Legal-Mind

> AI-Powered Legal Intake Platform for Law Firms

Legal-Mind is a SaaS platform that helps law firms automate client intake through AI-powered survey forms and intelligent calendar booking.

## 🏗️ Architecture

**Turborepo Monorepo** with 2 Next.js applications:

- **`apps/website`** - Public landing page + client survey forms
- **`apps/cms`** - Admin panel for law firms

**Shared packages:**
- `@legal-mind/ui` - Component library (shadcn/ui)
- `@legal-mind/database` - Supabase types and queries
- `@legal-mind/validators` - Zod validation schemas

## 🚀 Tech Stack

- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS
- **State Management:** TanStack Query (CMS only)
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Automation:** n8n + OpenAI
- **Calendar:** Google Calendar API
- **Deployment:** Vercel (2 projects)
- **Monorepo:** Turborepo

## 📋 Features

### For Law Firms (CMS)
- ✅ Create custom intake surveys
- ✅ AI-powered client qualification
- ✅ View and manage responses
- ✅ Google Calendar integration
- ✅ Dashboard analytics

### For Clients (Website)
- ✅ Fill out survey forms (no account needed)
- ✅ Automatic AI analysis
- ✅ Book appointments instantly
- ✅ Email confirmations

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Supabase CLI (for local development)
- Docker (for n8n)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd legal-mind
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Supabase**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start
```

4. **Configure environment variables**

Create `.env.local` files in both apps:

**`apps/website/.env.local`**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**`apps/cms/.env.local`**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

5. **Run database migrations**
```bash
supabase db reset
```

6. **Start development servers**
```bash
# Start all apps
npm run dev

# Website: http://localhost:3000
# CMS: http://localhost:3001
```

## 📁 Project Structure

```
legal-mind/
├── apps/
│   ├── website/              # Public app
│   │   ├── app/
│   │   │   ├── (marketing)/  # Landing pages
│   │   │   └── survey/       # Survey forms
│   │   └── features/
│   │
│   └── cms/                  # Admin app
│       ├── app/
│       │   ├── login/        # Auth
│       │   └── admin/        # Protected routes
│       ├── features/
│       └── middleware.ts     # Auth protection
│
├── packages/
│   ├── ui/                   # Shared components
│   ├── database/             # Supabase types
│   └── validators/           # Zod schemas
│
├── supabase/
│   └── migrations/           # Database schema
│
└── docs/
    └── ARCHITECTURE.md       # Architecture documentation
```

## 🧪 Development

### Available Commands

```bash
# Development
npm run dev              # Start all apps in dev mode
npm run dev:website      # Start website only
npm run dev:cms          # Start CMS only

# Building
npm run build            # Build all apps
npm run build:website    # Build website only
npm run build:cms        # Build CMS only

# Testing & Linting
npm run test             # Run all tests
npm run lint             # Lint all apps
npm run format           # Format code with Prettier

# Supabase
npm run db:reset         # Reset database (warning: deletes all data)
npm run db:types         # Generate TypeScript types from DB
```

### Folder Structure Pattern

We follow the **ADR-005** pattern:
- `app/` - Routing only (page.tsx, layout.tsx)
- `features/` - Business logic (components, actions, queries)
- `components/` - UI components
- `lib/` - Utilities

Example:
```typescript
// app/admin/surveys/page.tsx (routing)
import { SurveyList } from '@/features/surveys/components/SurveyList'

export default function SurveysPage() {
  return <SurveyList />
}

// features/surveys/components/SurveyList.tsx (logic)
'use client'
import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'

export function SurveyList() {
  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys
  })
  // ... component logic
}
```

## 🚢 Deployment

### Vercel Setup

**Project 1: Website**
```bash
vercel --cwd apps/website

# Settings in Vercel Dashboard:
# - Root Directory: apps/website
# - Build Command: cd ../.. && turbo run build --filter=@legal-mind/website
# - Install Command: npm install
```

**Project 2: CMS**
```bash
vercel --cwd apps/cms

# Settings in Vercel Dashboard:
# - Root Directory: apps/cms
# - Build Command: cd ../.. && turbo run build --filter=@legal-mind/cms
# - Install Command: npm install
```

### Environment Variables (Production)

Set these in Vercel Dashboard for each project:

**Website:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `N8N_WEBHOOK_URL`

**CMS:**
- All website variables +
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `OPENAI_API_KEY`

## 📖 Documentation

- [Architecture Documentation](./docs/ARCHITECTURE.md) - Detailed architecture overview
- [Implementation Plan](./.claude/plans/wise-growing-meadow.md) - Complete implementation plan
- [ADR-001: Monorepo Structure](./adr/001-monorepo-structure.md) - Turborepo decision
- [ADR-005: App vs Features Separation](./adr/005-app-vs-features-separation.md) - Folder structure

## 🔒 Security

- **Authentication:** Supabase Auth (email/password + Google OAuth)
- **Authorization:** Row Level Security (RLS) policies
- **Multi-tenancy:** Tenant isolation enforced at DB level
- **API Protection:** Middleware guards all admin routes
- **Secrets:** Environment variables (never committed to git)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add amazing feature'`
3. Push to the branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📝 License

[To be decided]

## 🙋 Support

For questions or issues:
- Check [Architecture Documentation](./docs/ARCHITECTURE.md)
- Review [ADR documents](./adr/)
- Contact the team

---

**Built with ❤️ for law firms who want to modernize client intake**
