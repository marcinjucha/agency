# AI Agency

> AI-Powered Agency Platform for Service Providers

AI Agency is a SaaS platform that helps service providers automate client intake through AI-powered survey forms and intelligent calendar booking.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.local.example` to `.env.local` in both apps and fill in your values:

```bash
cp apps/website/.env.local.example apps/website/.env.local
cp apps/cms/.env.local.example apps/cms/.env.local
```

**Already configured** with production values! ✅

### 3. Start Development Servers

**Option A: Run Both Apps**
```bash
npm run dev
```
- Website: http://localhost:3000
- CMS: http://localhost:3001

**Option B: Run Individual Apps**
```bash
npm run dev:website   # Website only
npm run dev:cms       # CMS only
```

**Option C: Use VSCode Tasks**
- Press `Cmd+Shift+B` (macOS) or `Ctrl+Shift+B` (Windows)
- Select "Dev: All Apps" or "Dev: CMS" or "Dev: Website"

### 4. Open in VSCode

```bash
code agency.code-workspace
```

This opens a multi-root workspace with all packages visible in sidebar.

---

## 🏗️ Architecture

**Turborepo Monorepo** with 2 Next.js applications:

- **`apps/website`** - Public landing page + client survey forms
- **`apps/cms`** - Admin panel for law firms

**Shared packages:**
- `@agency/ui` - Component library (shadcn/ui)
- `@agency/database` - Supabase types and queries
- `@agency/validators` - Zod validation schemas

---

## 🚢 Deployment

**Live URLs:**
- Website: https://agency-website.vercel.app
- CMS: https://agency-cms.vercel.app/login

**Auto-deployment:**
Push to `main` branch → Vercel automatically deploys

**Manual deployment:**
```bash
vercel --cwd apps/website --prod
vercel --cwd apps/cms --prod
```

---

## 🎯 Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **State:** TanStack Query (CMS), React Hook Form
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Automation:** n8n + OpenAI
- **Calendar:** Google Calendar API
- **Deployment:** Vercel (2 projects)
- **Monorepo:** Turborepo

---

## 📋 Features

### For Service Providers (CMS)
- ✅ Create custom intake surveys
- ✅ Manage questions (7 types)
- ✅ View responses with AI qualification
- ✅ Google Calendar integration
- ✅ Dashboard analytics

### For Clients (Website)
- ✅ Fill out survey forms (no account needed)
- ✅ Automatic AI analysis
- ✅ Book appointments instantly
- ✅ Email confirmations

---

## 📁 Project Structure

```
agency/
├── apps/
│   ├── website/              # Public app (port 3000)
│   │   ├── app/
│   │   │   ├── (marketing)/  # Landing pages
│   │   │   └── survey/       # Survey forms
│   │   └── features/
│   │
│   └── cms/                  # Admin app (port 3001)
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
└── supabase/
    └── migrations/           # Database schema
```

---

## 🧪 Development

### Available Commands

```bash
# Development
npm run dev              # Start all apps
npm run dev:website      # Start website (localhost:3000)
npm run dev:cms          # Start CMS (localhost:3001)

# Building
npm run build            # Build all apps
npm run build:website    # Build website only
npm run build:cms        # Build CMS only

# Testing & Linting
npm run test             # Run all tests
npm run lint             # Lint all apps
npm run format           # Format code with Prettier

# Supabase
npm run db:types         # Generate TypeScript types from DB
```

### VSCode Tasks

Press `Cmd+Shift+P` and type "Tasks: Run Task":
- **Dev: All Apps** - Start both servers
- **Dev: CMS** - Start CMS only
- **Dev: Website** - Start Website only
- **Build: All** - Build all apps
- **Build: CMS** - Build CMS only
- **Build: Website** - Build Website only

---

## 🔐 Authentication

### First User Setup

Before you can login, create a user in Supabase:

1. Go to [Supabase Auth](https://app.supabase.com/project/zsrpdslhnuwmzewwoexr/auth/users)
2. Click "Add User" → Create with email/password
3. Run SQL from `supabase/seed_first_user.sql`
4. Login at http://localhost:3001/login

See `supabase/seed_first_user.sql` for detailed instructions.

---

## 📖 Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design overview
- [Deployment](./docs/DEPLOYMENT.md) - Vercel setup guide
- [Implementation Status](./docs/IMPLEMENTATION_STATUS.md) - Current progress

### Architecture Decisions

See [/docs/adr/](./docs/adr/) for all Architecture Decision Records:

**Active ADRs:**
- [ADR-006: Agency Project Structure](./docs/adr/006-agency-project-structure.md) - Monorepo, features/, state management, database patterns
- [ADR-007: N8n Background Processing](./docs/adr/007-n8n-background-processing.md) - AI workflow automation, queue mode, Claude Haiku

**Historical Reference:**
- [ARCHIVED-001: Monorepo Structure](./docs/adr/ARCHIVED-001-monorepo-structure.md) - Turborepo patterns from Multi-tenant CMS
- [ARCHIVED-005: App vs Features](./docs/adr/ARCHIVED-005-app-vs-features-separation.md) - Folder structure pattern (now in ADR-006 Section 2)

---

## 🔧 Troubleshooting

### CMS won't start

```bash
cd apps/cms
npm install
npm run dev
```

### TypeScript errors

```bash
npm run db:types  # Regenerate types from Supabase
```

### Build fails

```bash
npm run clean  # Clear .next folders
npm install    # Reinstall dependencies
npm run build  # Try again
```

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Make changes
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Create Merge Request on GitLab

---

## 📝 License

[To be decided]

---

## 🙋 Support

**Live Apps:**
- Website: https://agency-website.vercel.app
- CMS: https://agency-cms.vercel.app

**Supabase:**
- Dashboard: https://app.supabase.com/project/zsrpdslhnuwmzewwoexr

**Repository:**
- GitLab: https://gitlab.com/friendly-coders/agency

---

**Built with ❤️ for service providers who want to modernize client intake**
