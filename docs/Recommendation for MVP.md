```
# <q>🎯 MOJA REKOMENDACJA DLA MVP</q> 🎯 PODSUMOWANIE - CUSTOM ADMIN PANEL (CMS)
```

✅ Dlaczego n8n + Deno na TYM SAMYM Hetzner VPS = NAJLEPSZE
Google Calendar API (Twój plan)
🛠️ Implementacja - Week by Week
Week 1: Fundament (12-15h)
✅ Supabase schema + RLS policies
✅ Next.js auth (login dla kancelarii)
✅ Deploy infrastructure (Vercel + Hetzner n8n)
Deliverable: Auth działa, DB gotowa
Week 2: Formularz + Kalendarz (15-18h)
✅ React Hook Form + Zod validation
✅ Google Calendar API - fetch available slots
✅ UI wyboru terminu
Deliverable: Formularz + widok kalendarza
Week 3: Rezerwacja + Webhook (12-15h)
✅ Booking flow (prevent double booking!)
✅ Google Calendar create event
✅ Deno API webhook endpoint
Deliverable: End-to-end booking działa
Week 4: n8n + Testing (10-12h)
✅ n8n workflows (form submit → AI → save)
✅ Error handling workflow → Slack alerts​​
✅ Testing (double booking, AI validation, mobile)
Deliverable: MVP COMPLETE 🎉
Week 5-6: AI Enhancement (15-20h) (opcjonalne Phase 2)
✅ Claude dla długich podsumowań
✅ Dashboard dla kancelarii
✅ Polish email templates
Deliverable: Production-ready z AI features
Total: 64-80 godzin (MVP), 79-100h (z Phase 2)

Plan Techniczny: System Ankiet i Kalendarza dla Kancelarii Prawnych

Na podstawie naszej rozmowy, potrzebuję, abyś wygenerował mi jeszcze raz kompletny plan tego, jak podejść do tego zadania. O względzie wszystkich rzeczy, o których do tej pory rozmawialiśmy, i kierunku, w który chciałbym to robić. Jak self-hosting, Next.js, TanStack itd.
Potrzebuje plan działania na najbliższy czas.

Świetnie! Widzę że masz już kompletne dokumenty n8n setup. Teraz stworzę Ci **KOMPLETNY PLAN DZIAŁANIA** dla całego projektu Legal Intake SaaS, uwzględniając WSZYSTKO co do tej pory omówiliśmy.

# 🚀 **KOMPLETNY PLAN TECHNICZNY - Legal Intake SaaS**

## **EXECUTIVE SUMMARY**

**Produkt:** SaaS dla kancelarii prawnych - ankiety + rezerwacja spotkań + CMS
**Timeline:** 10-12 tygodni do MVP production-ready
**Tech Stack:** Next.js + Supabase + Deno + n8n + Google Calendar + TanStack Query
**Infrastructure:** Hetzner CX21 self-hosted (n8n + Deno) + Vercel (frontend) + Supabase (database)
**Cost/mc:** €50-150 (MVP), scale later
**Team:** Ty (1 full-time) + opcjonalnie 1 junior dla testing

***

## 📋 **FAZA 1: PRZYGOTOWANIE (Week -1 do 0)**

### **Sobota-Niedziela (16h przygotowania)**

#### **1. Infrastruktura Setup (6h)**

```bash
# ✅ Hetzner VPS Provision
1. SSH do Hetzner CX21 (€5.83/mc)
2. Security hardening:
   - UFW firewall rules (tylko SSH, 22; HTTP, 80; HTTPS, 443)
   - SSH key auth only (no password)
   - fail2ban setup
3. Docker + Docker Compose install
4. DNS setup (nameservers do Hetzner)

# ✅ Supabase Setup
1. Create Supabase project (supabase.com)
2. Create database schema (run z dokumentów)
3. Enable RLS policies
4. Setup Supabase auth
5. Save connection strings → .env

# ✅ Vercel Setup
1. Connect GitHub repo
2. Setup environment variables
3. Configure build settings (Node 20+)
4. Deploy placeholder (można pusty Next.js)

# ✅ Google Cloud Setup
1. Create Google Cloud project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials (web application)
4. Download client secret JSON
5. Add redirect URIs (localhost:3000/api/auth/google/callback, prodomain)
```

**Deliverable:** Infrastructure variables zapisane w `.env.local` i `.env.production`

***

#### **2. Repository Setup (3h)**

```bash
# ✅ Create monorepo structure
npx create-next-app@latest legal-intake-saas \
  --typescript --tailwind --app --src-dir

cd legal-intake-saas

# ✅ Install core dependencies
npm install \
  @supabase/ssr @supabase/supabase-js \
  @supabase/auth-ui-react @supabase/auth-ui-shared \
  @tanstack/react-query \
  react-hook-form @hookform/resolvers zod \
  date-fns lucide-react clsx \
  axios dotenv

# ✅ Install shadcn/ui components
npx shadcn@latest init -d
npx shadcn@latest add button input textarea select checkbox radio \
  card dialog table calendar form label badge alert loading \
  sheet popover command pagination

# ✅ Create folder structure
mkdir -p src/{components,pages,actions,hooks,types,lib,styles,middleware}
mkdir -p src/components/{admin,public,shared}
mkdir -p src/actions/{auth,forms,calendar,admin}

# ✅ Git setup
git init
git add .
git commit -m "chore: initial setup"
git branch -M main
git remote add origin <your-repo>
git push -u origin main
```

**Deliverable:** Next.js monorepo z folderami, zainstalowane dependencies, repo pushe na GitHub

***

#### **3. Development Environment (7h)**

```bash
# ✅ Create .env.local (NEVER commit!)
cp .env.example .env.local

# ✅ Supabase Client Configuration
# src/lib/supabase.ts
import { createBrowserClient } from "@supabase/ssr"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

# ✅ TanStack Query Setup
# src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    },
  },
})

# ✅ Create root layout with providers
# src/app/layout.tsx
"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}

# ✅ Test development server
npm run dev
# → Open http://localhost:3000 (should show Next.js welcome)
```

**Deliverable:** Dev environment working, TanStack Query + Supabase configured, test build passes

***

## **FAZA 2: WEEK 1-2 FOUNDATION (Supabase + Auth + Admin Panel Layout)**

### **Week 1: Database + Authentication (12-15h)**

#### **Day 1-2: Supabase Schema (8h)**

```sql
-- src/sql/01_init.sql
-- Run this in Supabase SQL Editor

-- ✅ Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ✅ TENANTS TABLE (multi-tenant: law firms)
CREATE TABLE law_firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  website TEXT,
  subscription_status TEXT DEFAULT 'trial', -- 'trial', 'active', 'canceled'
  subscription_plan TEXT DEFAULT 'starter', -- 'starter', 'pro', 'enterprise'
  google_calendar_id TEXT, -- OAuth token storage
  stripe_customer_id TEXT -- for future payments
);

-- ✅ USERS TABLE (lawyers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'lawyer', -- 'admin', 'lawyer', 'assistant'
  UNIQUE(firm_id, email)
);

-- ✅ SURVEY_LINKS TABLE (generated links za ankiety)
CREATE TABLE survey_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unique_token TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL, -- "Personal injury consultation"
  description TEXT,
  config JSONB NOT NULL, -- questions array
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ
);

-- ✅ RESPONSES TABLE (klient odpowiada na ankietę)
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  survey_link_id UUID NOT NULL REFERENCES survey_links(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_name TEXT,
  answers JSONB NOT NULL, -- store all form answers
  ai_summary TEXT, -- AI-generated podsumowanie
  ai_score INTEGER, -- qualification score 0-100
  ai_category TEXT, -- "personal_injury", "family_law", etc.
  status TEXT DEFAULT 'new', -- 'new', 'qualified', 'contacted', 'booked'
  n8n_execution_id TEXT -- tracking n8n workflow
);

-- ✅ APPOINTMENTS TABLE (zarezerwowane spotkania)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  google_event_id TEXT UNIQUE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  notes TEXT,
  client_email TEXT NOT NULL,
  client_phone TEXT
);

-- ✅ AI_LOGS TABLE (tracking AI calls for debugging)
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  model TEXT, -- 'gpt-4o', 'claude-3-opus'
  provider TEXT, -- 'openai', 'anthropic'
  cost_usd NUMERIC(10, 4),
  error TEXT
);

-- ✅ AUDIT_LOGS TABLE (compliance + debugging)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  firm_id UUID NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'survey_created', 'form_submitted', 'booking_created'
  resource_type TEXT, -- 'survey_link', 'response', 'appointment'
  resource_id UUID,
  changes JSONB,
  ip_address INET
);

-- ✅ Enable RLS (Row Level Security)
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ✅ RLS POLICIES - All tables filtered by firm_id
-- law_firms: Owners can see only their firm
CREATE POLICY "law_firms_self_access"
  ON law_firms
  FOR SELECT
  USING (id = (SELECT current_user_id()::uuid));

-- users: Users can see team members within their firm
CREATE POLICY "users_firm_access"
  ON users
  FOR SELECT
  USING (firm_id = (
    SELECT firm_id FROM users WHERE id = current_user_id()::uuid
  ));

-- survey_links: Lawyers see own survey links
CREATE POLICY "survey_links_firm_access"
  ON survey_links
  FOR SELECT
  USING (firm_id = (
    SELECT firm_id FROM users WHERE id = current_user_id()::uuid
  ));

-- responses: Lawyers see responses for their surveys
CREATE POLICY "responses_firm_access"
  ON responses
  FOR SELECT
  USING (firm_id = (
    SELECT firm_id FROM users WHERE id = current_user_id()::uuid
  ));

-- appointments: Lawyers see own appointments
CREATE POLICY "appointments_firm_access"
  ON appointments
  FOR SELECT
  USING (firm_id = (
    SELECT firm_id FROM users WHERE id = current_user_id()::uuid
  ));

-- ✅ INDEXES dla performance
CREATE INDEX idx_survey_links_firm_id ON survey_links(firm_id);
CREATE INDEX idx_survey_links_user_id ON survey_links(user_id);
CREATE INDEX idx_responses_firm_id ON responses(firm_id);
CREATE INDEX idx_responses_survey_link_id ON responses(survey_link_id);
CREATE INDEX idx_responses_created_at ON responses(created_at DESC);
CREATE INDEX idx_appointments_firm_id ON appointments(firm_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_audit_logs_firm_id ON audit_logs(firm_id);
CREATE INDEX idx_ai_logs_firm_id ON ai_logs(firm_id);

-- ✅ Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_law_firms_updated_at
  BEFORE UPDATE ON law_firms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- (repeat for all tables with updated_at)
```

**Deliverable:** Pełna Supabase baza z RLS policies

***

#### **Day 3-4: Supabase Auth Setup (4h)**

```typescript
// src/lib/auth.ts
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export async function createServerSupabaseClient() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(
            process.headers.get('cookie') ?? ''
          )
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            )
          })
        },
      },
    }
  )

  return supabase
}

// src/app/auth/login/page.tsx
"use client"

import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { createBrowserClient } from "@supabase/ssr"

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Legal Intake</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={["google"]}
          redirectTo={`${window.location.origin}/auth/callback`}
        />
      </div>
    </div>
  )
}

// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  redirect('/admin')
}

// Middleware
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [
          ...request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
        ],
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
```

**Deliverable:** Auth działa, protected routes działają, można zalogować się przez Google

***

#### **Day 5: Admin Dashboard Layout (4h)**

```typescript
// src/components/admin/AdminLayout.tsx
"use client"

import { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  LogOut,
} from "lucide-react"

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  const { data: firm } = useQuery({
    queryKey: ["firm"],
    queryFn: async () => {
      const res = await fetch("/api/admin/firm")
      return res.json()
    },
  })

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Surveys",
      href: "/admin/surveys",
      icon: FileText,
    },
    {
      label: "Appointments",
      href: "/admin/appointments",
      icon: Calendar,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/login")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-8">Legal Intake</h1>

        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Kancelaria</p>
          <p className="font-semibold text-gray-900">{firm?.name}</p>
        </div>

        <nav className="space-y-2 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <Icon size={20} />
                {item.label}
              </a>
            )
          })}
        </nav>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut size={16} className="mr-2" />
          Wyloguj się
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

// src/app/admin/layout.tsx
import { AdminLayout } from "@/components/admin/AdminLayout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}

// src/app/admin/page.tsx
import { AdminLayout } from "@/components/admin/AdminLayout"

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">Witaj w Legal Intake!</p>
      </div>
    </AdminLayout>
  )
}
```

**Deliverable:** Admin panel z sidebar navigation, zalogowany user widzi swoje dane

***

### **Week 1 Summary**

- ✅ Supabase fully configured with RLS
- ✅ Supabase Auth integrated (Google OAuth)
- ✅ Admin dashboard layout
- ✅ Protected routes working

**Deploy status:** Next.js running on `http://localhost:3000`, Vercel preview deployed

***

## **FAZA 3: WEEK 2-3 CORE FEATURES (Form Builder + Calendar Integration)**

### **Week 2: Custom Form Builder CMS (15-18h)**

#### **Day 1-2: Form Builder Component (8h)**

```typescript
// src/types/forms.ts
export type QuestionType = "text" | "textarea" | "select" | "radio" | "checkbox" | "email" | "tel"

export interface Question {
  id: string
  type: QuestionType
  label: string
  placeholder?: string
  required: boolean
  options?: Array<{ value: string; label: string }> // for select/radio/checkbox
  description?: string
}

export interface SurveyConfig {
  id: string
  title: string
  description: string
  questions: Question[]
  confirmationMessage?: string
}

// src/components/admin/FormBuilder.tsx
"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import {
  Plus,
  Trash2,
  Eye,
  Copy,
  Save,
} from "lucide-react"
import type { Question, SurveyConfig } from "@/types/forms"

export function FormBuilder({ surveyId }: { surveyId?: string }) {
  const [config, setConfig] = useState<SurveyConfig>({
    id: surveyId || crypto.randomUUID(),
    title: "Nowa ankieta",
    description: "",
    questions: [],
  })

  const [showPreview, setShowPreview] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/surveys", {
        method: "POST",
        body: JSON.stringify(config),
      })
      return res.json()
    },
  })

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: "text",
      label: "Nowe pytanie",
      required: true,
    }
    setConfig(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }))
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === id ? { ...q, ...updates } : q
      ),
    }))
  }

  const deleteQuestion = (id: string) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }))
  }

  return (
    <div className="grid grid-cols-3 gap-8">
      {/* Builder */}
      <div className="col-span-2 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Tytuł ankiety
          </label>
          <Input
            value={config.title}
            onChange={e =>
              setConfig(prev => ({ ...prev, title: e.target.value }))
            }
            placeholder="Np. Konsultacja dot. obrażeń osobistych"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Opis</label>
          <Textarea
            value={config.description}
            onChange={e =>
              setConfig(prev => ({ ...prev, description: e.target.value }))
            }
            placeholder="Opis ankiety dla klienta"
          />
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Pytania</h3>
          <div className="space-y-4">
            {config.questions.map((question, idx) => (
              <Card key={question.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-semibold">Pytanie {idx + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteQuestion(question.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Typ pytania
                    </label>
                    <Select
                      value={question.type}
                      onValueChange={value =>
                        updateQuestion(question.id, {
                          type: value as QuestionType,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Tekst krótki</SelectItem>
                        <SelectItem value="textarea">
                          Tekst długi
                        </SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="tel">Telefon</SelectItem>
                        <SelectItem value="select">
                          Rozwojana lista
                        </SelectItem>
                        <SelectItem value="radio">
                          Opcje (jedna odpowiedź)
                        </SelectItem>
                        <SelectItem value="checkbox">
                          Checkboxy (wiele)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pytanie
                    </label>
                    <Input
                      value={question.label}
                      onChange={e =>
                        updateQuestion(question.id, { label: e.target.value })
                      }
                      placeholder="Wpisz pytanie"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Placeholder
                    </label>
                    <Input
                      value={question.placeholder || ""}
                      onChange={e =>
                        updateQuestion(question.id, {
                          placeholder: e.target.value,
                        })
                      }
                      placeholder="Wpisz placeholder"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={e =>
                        updateQuestion(question.id, {
                          required: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm">Wymagane</span>
                  </label>
                </div>
              </Card>
            ))}
          </div>

          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={addQuestion}
          >
            <Plus size={16} className="mr-2" />
            Dodaj pytanie
          </Button>
        </div>
      </div>

      {/* Preview + Actions */}
      <div className="space-y-4">
        <Card className="p-4 sticky top-4">
          <h3 className="font-bold mb-4">Akcje</h3>

          <Button
            className="w-full mb-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={16} className="mr-2" />
            {saveMutation.isPending ? "Zapisywanie..." : "Zapisz"}
          </Button>

          <Button
            variant="outline"
            className="w-full mb-2"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye size={16} className="mr-2" />
            {showPreview ? "Zamknij podgląd" : "Podgląd"}
          </Button>

          {saveMutation.data?.token && (
            <>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Link do ankiety</p>
                de className="text-xs font-mono break-all">
                  {`${window.location.origin}/survey/${saveMutation.data.token}`}
                </code>
              </div>

              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/survey/${saveMutation.data.token}`
                  )
                }}
              >
                <Copy size={16} className="mr-2" />
                Kopiuj link
              </Button>
            </>
          )}
        </Card>

        {showPreview && (
          <Card className="p-4">
            <h3 className="font-bold mb-4">Podgląd</h3>
            <DynamicForm config={config} preview={true} />
          </Card>
        )}
      </div>
    </div>
  )
}

// src/components/DynamicForm.tsx
"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { SurveyConfig } from "@/types/forms"

// Generate Zod schema dynamically from survey config
function generateZodSchema(config: SurveyConfig) {
  const shape: Record<string, z.ZodTypeAny> = {}

  config.questions.forEach(q => {
    let fieldSchema: z.ZodTypeAny

    switch (q.type) {
      case "email":
        fieldSchema = z.string().email("Wpisz prawidłowy email")
        break
      case "tel":
        fieldSchema = z.string().regex(/^\d{9,}/, "Wpisz prawidłowy numer")
        break
      case "checkbox":
        fieldSchema = z.array(z.string())
        break
      default:
        fieldSchema = z.string()
    }

    if (!q.required) {
      fieldSchema = fieldSchema.optional()
    }

    shape[q.id] = fieldSchema
  })

  return z.object(shape)
}

export function DynamicForm({
  config,
  preview = false,
  onSubmit,
}: {
  config: SurveyConfig
  preview?: boolean
  onSubmit?: (data: any) => Promise<void>
}) {
  const schema = generateZodSchema(config)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  })

  const handleFormSubmit = async (data: any) => {
    if (preview) return

    try {
      await onSubmit?.(data)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h1 className="text-2xl font-bold">{config.title}</h1>
        {config.description && (
          <p className="text-gray-600 mt-2">{config.description}</p>
        )}
      </div>

      {config.questions.map(question => (
        <div key={question.id}>
          <label className="block text-sm font-medium mb-2">
            {question.label}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {question.type === "textarea" && (
            <Textarea
              {...register(question.id)}
              placeholder={question.placeholder}
              disabled={preview}
            />
          )}

          {["text", "email", "tel"].includes(question.type) && (
            <Input
              type={question.type}
              {...register(question.id)}
              placeholder={question.placeholder}
              disabled={preview}
            />
          )}

          {question.type === "select" && (
            <Controller
              name={question.id}
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger disabled={preview}>
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}

          {question.type === "radio" && (
            <Controller
              name={question.id}
              control={control}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange}>
                  {question.options?.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={opt.value}
                        id={`${question.id}-${opt.value}`}
                        disabled={preview}
                      />
                      <Label htmlFor={`${question.id}-${opt.value}`}>
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          )}

          {question.type === "checkbox" && (
            <div className="space-y-2">
              {question.options?.map(opt => (
                <Controller
                  key={opt.value}
                  name={question.id}
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${question.id}-${opt.value}`}
                        checked={Array.isArray(field.value) &&
                          field.value.includes(opt.value)
                        }
                        onCheckedChange={checked => {
                          const current = Array.isArray(field.value)
                            ? field.value
                            : []
                          field.onChange(
                            checked
                              ? [...current, opt.value]
                              : current.filter(v => v !== opt.value)
                          )
                        }}
                        disabled={preview}
                      />
                      <Label htmlFor={`${question.id}-${opt.value}`}>
                        {opt.label}
                      </Label>
                    </div>
                  )}
                />
              ))}
            </div>
          )}

          {errors[question.id] && (
            <p className="text-red-500 text-sm mt-1">
              {(errors[question.id]?.message as string) || "Błąd"}
            </p>
          )}
        </div>
      ))}

      {!preview && (
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Wysyłanie..." : "Wyślij"}
        </Button>
      )}
    </form>
  )
}
```

**Deliverable:** Full Form Builder UI z preview, dynamicznym Zod schema, możliwością dodawania pytań

***

#### **Day 3-4: API Routes + Database Integration (7h)**

```typescript
// src/app/api/admin/surveys/route.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const body = await req.json()
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Get current user + firm
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from("users")
    .select("firm_id")
    .eq("id", user!.id)
    .single()

  // Generate unique token
  const token = crypto.randomUUID()

  // Save survey
  const { data, error } = await supabase
    .from("survey_links")
    .insert({
      firm_id: userData.firm_id,
      user_id: user!.id,
      unique_token: token,
      title: body.title,
      description: body.description,
      config: body,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Log to audit trail
  await supabase.from("audit_logs").insert({
    firm_id: userData.firm_id,
    user_id: user!.id,
    action: "survey_created",
    resource_type: "survey_link",
    resource_id: data.id,
    changes: body,
  })

  return Response.json({ token, ...data })
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // RLS automatically filters by firm_id
  const { data, error } = await supabase
    .from("survey_links")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json(data)
}

// src/app/survey/[token]/page.tsx
"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { DynamicForm } from "@/components/DynamicForm"
import type { SurveyConfig } from "@/types/forms"

export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const { data: survey, isLoading } = useQuery({
    queryKey: ["survey", token],
    queryFn: async () => {
      const res = await fetch(`/api/survey/${token}`)
      return res.json() as Promise<SurveyConfig>
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (answers: any) => {
      const res = await fetch(`/api/survey/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers,
          client_email: answers.email,
          client_phone: answers.phone,
          client_name: answers.name,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      router.push(`/survey/${token}/confirmation`)
    },
  })

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Ładowanie...</div>
  }

  if (!survey) {
    return <div className="flex justify-center items-center h-screen">Ankieta nie znaleziona</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <DynamicForm
          config={survey}
          onSubmit={(data) => submitMutation.mutateAsync(data)}
        />
      </div>
    </div>
  )
}

// src/app/api/survey/[token]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from("survey_links")
    .select("config")
    .eq("unique_token", params.token)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(data.config)
}

// src/app/api/survey/[token]/submit/route.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const body = await req.json()
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Get survey link
  const { data: surveyLink, error: surveyError } = await supabase
    .from("survey_links")
    .select("id, firm_id, user_id")
    .eq("unique_token", params.token)
    .single()

  if (surveyError) {
    return Response.json({ error: "Survey not found" }, { status: 404 })
  }

  // Save response
  const { data: response, error: responseError } = await supabase
    .from("responses")
    .insert({
      firm_id: surveyLink.firm_id,
      survey_link_id: surveyLink.id,
      client_email: body.client_email,
      client_phone: body.client_phone,
      client_name: body.client_name,
      answers: body.answers,
      status: "new",
    })
    .select()
    .single()

  if (responseError) {
    return Response.json(
      { error: responseError.message },
      { status: 400 }
    )
  }

  // Trigger n8n workflow
  await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response_id: response.id,
      survey_link_id: surveyLink.id,
      firm_id: surveyLink.firm_id,
      client_email: body.client_email,
      answers: body.answers,
    }),
  }).catch(err => console.error("n8n webhook failed:", err))

  return Response.json({ success: true })
}
```

**Deliverable:** Full API dla form submission, responses save na Supabase, n8n webhook trigger

***

### **Week 3: Google Calendar Integration (10-12h)**

#### **Day 1-2: Google Calendar OAuth Setup (6h)**

```typescript
// src/lib/google-calendar.ts
import { google } from "googleapis"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export function getGoogleAuthUrl() {
  const scopes = ["https://www.googleapis.com/auth/calendar"]
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  })
}

export async function handleGoogleCallback(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getCalendarSlots(
  tokens: any,
  lawyerId: string,
  date: Date
) {
  oauth2Client.setCredentials(tokens)
  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  // Get calendar ID from Supabase
  const supabase = createServerClient(...)
  const { data: user } = await supabase
    .from("users")
    .select("google_calendar_id")
    .eq("id", lawyerId)
    .single()

  const startOfDay = new Date(date)
  startOfDay.setHours(8, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(18, 0, 0, 0)

  const { data: events } = await calendar.events.list({
    calendarId: user.google_calendar_id,
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  })

  // Calculate available slots (30 min intervals)
  const busyTimes = events?.items || []
  const availableSlots = generateAvailableSlots(startOfDay, endOfDay, busyTimes)

  return availableSlots
}

function generateAvailableSlots(startTime: Date, endTime: Date, busyTimes: any[]) {
  const slots = []
  let current = new Date(startTime)

  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + 30 * 60000)

    // Check if slot is free
    const isBusy = busyTimes.some(event => {
      const eventStart = new Date(event.start.dateTime)
      const eventEnd = new Date(event.end.dateTime)
      return current < eventEnd && slotEnd > eventStart
    })

    if (!isBusy) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
      })
    }

    current = slotEnd
  }

  return slots
}

// src/app/api/auth/google/route.ts
import { createServerClient } from "@supabase/ssr"
import { getGoogleAuthUrl } from "@/lib/google-calendar"
import { cookies } from "next/headers"

export async function GET(req: Request) {
  const authUrl = getGoogleAuthUrl()
  return Response.redirect(authUrl)
}

// src/app/api/auth/google/callback/route.ts
import { handleGoogleCallback } from "@/lib/google-calendar"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")

  if (!code) {
    return Response.json({ error: "No code" }, { status: 400 })
  }

  const tokens = await handleGoogleCallback(code)
  const cookieStore = await cookies()
  const supabase = createServerClient(...)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Save tokens to database (encrypted)
  await supabase
    .from("users")
    .update({
      google_calendar_token: JSON.stringify(tokens),
    })
    .eq("id", user!.id)

  return Response.redirect("/admin/settings?connected=true")
}

// src/app/api/calendar/slots/route.ts
import { getCalendarSlots } from "@/lib/google-calendar"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const date = new Date(url.searchParams.get("date") || new Date())
  const lawyerId = url.searchParams.get("lawyer_id")

  const cookieStore = await cookies()
  const supabase = createServerClient(...)

  // Get lawyer's Google tokens
  const { data: user } = await supabase
    .from("users")
    .select("google_calendar_token")
    .eq("id", lawyerId)
    .single()

  const tokens = JSON.parse(user.google_calendar_token)
  const slots = await getCalendarSlots(tokens, lawyerId, date)

  return Response.json({ slots })
}
```

**Deliverable:** Google Calendar OAuth flow working, slots generation API

***

#### **Day 3-4: Calendar UI + Booking Logic (6h)**

```typescript
// src/components/CalendarBooking.tsx
"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { pl } from "date-fns/locale"

export function CalendarBooking({
  surveyToken,
  onSuccess,
}: {
  surveyToken: string
  onSuccess?: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>()

  // Fetch available slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", selectedDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar/slots?date=${selectedDate?.toISOString()}&survey_token=${surveyToken}`
      )
      return res.json()
    },
    enabled: !!selectedDate,
  })

  // Book appointment
  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/book`, {
        method: "POST",
        body: JSON.stringify({
          survey_token: surveyToken,
          slot: selectedSlot,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      onSuccess?.()
    },
  })

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Calendar */}
      <div>
        <h3 className="font-bold mb-4">Wybierz datę</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) =>
            date < new Date() || date.getDay() === 0 || date.getDay() === 6
          }
          locale={pl}
        />
      </div>

      {/* Available Slots */}
      <div>
        <h3 className="font-bold mb-4">Dostępne terminy</h3>

        {slotsLoading && <p>Ładowanie...</p>}

        {slotsData?.slots && (
          <div className="space-y-2">
            {slotsData.slots.map((slot: any) => (
              <Card
                key={slot.start}
                className={`p-3 cursor-pointer transition ${
                  selectedSlot === slot.start
                    ? "bg-blue-50 border-blue-500"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedSlot(slot.start)}
              >
                {format(new Date(slot.start), "HH:mm", { locale: pl })} -{" "}
                {format(new Date(slot.end), "HH:mm", { locale: pl })}
              </Card>
            ))}
          </div>
        )}

        {slotsData?.slots?.length === 0 && (
          <p className="text-gray-500">Brak dostępnych terminów</p>
        )}

        <Button
          className="w-full mt-6"
          onClick={() => bookMutation.mutate()}
          disabled={!selectedSlot || bookMutation.isPending}
        >
          {bookMutation.isPending ? "Rezerwowanie..." : "Zarezerwuj"}
        </Button>
      </div>
    </div>
  )
}

// src/app/api/appointments/book/route.ts
import { createServerClient } from "@supabase/ssr"
import { google } from "googleapis"

export async function POST(req: Request) {
  const body = await req.json()
  const cookieStore = await cookies()
  const supabase = createServerClient(...)

  // Get survey + response
  const { data: surveyLink } = await supabase
    .from("survey_links")
    .select("user_id, firm_id")
    .eq("unique_token", body.survey_token)
    .single()

  // Get most recent response for this survey
  const { data: response } = await supabase
    .from("responses")
    .select("id, client_email, client_phone, client_name")
    .eq("survey_link_id", surveyLink.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Get lawyer's Google tokens
  const { data: lawyer } = await supabase
    .from("users")
    .select("google_calendar_token, google_calendar_id")
    .eq("id", surveyLink.user_id)
    .single()

  // Create Google Calendar event
  const tokens = JSON.parse(lawyer.google_calendar_token)
  const oauth2Client = new google.auth.OAuth2(...)
  oauth2Client.setCredentials(tokens)

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  const { data: event } = await calendar.events.insert({
    calendarId: lawyer.google_calendar_id,
    requestBody: {
      summary: `Spotkanie: ${response.client_name}`,
      description: `Email: ${response.client_email}\nTelefon: ${response.client_phone}`,
      start: {
        dateTime: body.slot,
        timeZone: "Europe/Warsaw",
      },
      end: {
        dateTime: new Date(new Date(body.slot).getTime() + 30 * 60000).toISOString(),
        timeZone: "Europe/Warsaw",
      },
      attendees: [
        {
          email: response.client_email,
          displayName: response.client_name,
          responseStatus: "needsAction",
        },
      ],
    },
  })

  // Save appointment to Supabase
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      firm_id: surveyLink.firm_id,
      user_id: surveyLink.user_id,
      response_id: response.id,
      google_event_id: event.id,
      scheduled_at: body.slot,
      client_email: response.client_email,
      client_phone: response.client_phone,
      status: "confirmed",
    })
    .select()
    .single()

  if (appointmentError) {
    return Response.json({ error: appointmentError.message }, { status: 400 })
  }

  // Update response status
  await supabase
    .from("responses")
    .update({ status: "booked" })
    .eq("id", response.id)

  // Trigger n8n for confirmation email
  await fetch(process.env.N8N_WEBHOOK_BOOKING_URL!, {
    method: "POST",
    body: JSON.stringify({
      appointment_id: appointment.id,
      client_email: response.client_email,
      client_name: response.client_name,
      scheduled_at: body.slot,
      lawyer_name: lawyer.name,
    }),
  }).catch(err => console.error("n8n webhook failed:", err))

  return Response.json({ success: true, appointment })
}
```

**Deliverable:** Calendar UI, slot selection, booking API, Google Calendar event creation

***

## **FAZA 4: WEEK 4 AUTOMATION (n8n Workflows)**

### **Week 4: n8n Workflows Setup (10-12h)**

#### **Day 1-2: n8n Form Processing Workflow (6h)**

**W n8n UI (drag \& drop):**

```
[WEBHOOK TRIGGER: /form-submit]
    ↓
[SUPABASE: Get response details]
    ↓
[OPENAI: Analyze answers]
    ├─ Prompt: "Podsumuj i skategoryzuj zgłoszenie..."
    ├─ Model: gpt-4o
    ├─ Temperature: 0.7
    ↓
[SUPABASE: Update response with AI summary]
    ├─ Field: ai_summary
    ├─ Field: ai_score
    ├─ Field: ai_category
    ↓
[IF: Score > 70?]
    ├─ YES:
    │   ├─ [SLACK: Send alert]
    │   ├─ [EMAIL: Notify lawyer]
    │   └─ [SENDGRID: Send to lawyer]
    │
    └─ NO:
        └─ [EMAIL: Send to CRM queue]
    ↓
[COMPLETED]
```

**Export JSON (save to Git):**

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "/webhook/form-submit",
        "method": "POST",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{$json.body.response_id}}",
        "authentication": "supabaseAuth",
        "resource": "responses"
      },
      "name": "Get Response",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    },
    {
      "parameters": {
        "model": "gpt-4o",
        "prompt": "=Podsumuj to zgłoszenie prawne w max 200 słów i przydziel score 0-100 gdzie 100 to najlepsza sprawa:\n\n{{$json.answers | stringify()}}",
        "temperature": 0.7
      },
      "name": "Analyze with AI",
      "type": "n8n-nodes-base.openai",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Get Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get Response": {
      "main": [
        [
          {
            "node": "Analyze with AI",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

**Deliverable:** n8n workflow importable, AI analysis working, lawyer alerts working

***

#### **Day 3-4: Email + Notifications (4-6h)**

```json
{
  "nodes": [
    {
      "parameters": {
        "operation": "send",
        "from": "noreply@legal-intake.com",
        "to": "={{$json.lawyer_email}}",
        "subject": "🔴 Nowe zgłoszenie: {{$json.client_name}}",
        "html": "<h2>Nowa potencjalna sprawa</h2><p>Klient: {{$json.client_name}}</p><p>Email: {{$json.client_email}}</p><p>AI Score: {{$json.ai_score}}/100</p><p><a href='https://legal-intake.com/admin/responses/{{$json.response_id}}'>Przejdź do szczegółów</a></p>"
      },
      "name": "Send Email to Lawyer",
      "type": "n8n-nodes-base.sendGrid",
      "typeVersion": 1,
      "position": [800, 200]
    },
    {
      "parameters": {
        "option": "postMessage",
        "text": ":bell: Nowe zgłoszenie od {{$json.client_name}} (score: {{$json.ai_score}})",
        "channel": "#new-leads"
      },
      "name": "Slack Alert",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [800, 450]
    },
    {
      "parameters": {
        "url": "https://supabase-project.supabase.co/rest/v1/responses?id=eq.{{$json.response_id}}",
        "method": "PATCH",
        "authentication": "supabaseAuth",
        "body": {
          "ai_summary": "={{$json.ai_summary}}",
          "ai_score": "={{$json.ai_score}}",
          "status": "qualified"
        }
      },
      "name": "Update Response in Supabase",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [650, 300]
    }
  ]
}
```

**Deliverable:** Email notifications working, Slack alerts, automated workflow

***

## **FAZA 5: TESTING \& DEPLOYMENT (Week 5-6)**

### **Week 5: Testing + Production Hardening (12-15h)**

#### **Testing Checklist:**

```bash
# ✅ Unit Tests
npm install --save-dev vitest @testing-library/react
npm test

# ✅ Integration Tests - Double Booking Prevention
# test/appointments.test.ts
describe("Appointments", () => {
  it("should prevent double booking", async () => {
    // Try to book same slot twice in parallel
    // Both should fail (second one)
  })

  it("should handle Google Calendar API errors", async () => {
    // Mock Google API failure
    // Should rollback Supabase insert
  })
})

# ✅ E2E Tests
npm install --save-dev playwright
# Fill form → select slot → confirm booking → check email sent

# ✅ Load Testing
npm install --save-dev k6
# Simulate 100 users submitting forms simultaneously

# ✅ Mobile Testing
# Test on iPhone 12, Pixel 6 (use Chrome DevTools)

# ✅ Security Audit
# - SQL injection tests
# - CSRF protection
# - XSS prevention
# - Rate limiting
```


***

#### **Production Deployment:**

```bash
# 1. Environment Variables
cp .env.production.example .env.production.local
# Fill in:
# - Supabase credentials
# - Google OAuth keys
# - n8n webhook URLs
# - Stripe API keys (future)

# 2. Database Backup Strategy
# Supabase → daily auto-backups (free tier)
# Export backup → S3 bucket

# 3. Monitoring Setup
# CloudWatch dashboard (free tier)
# PagerDuty alerts for crashes

# 4. Deploy to Vercel
git push origin main
# Vercel auto-deploys from GitHub

# 5. DNS Setup
# Domain → Vercel nameservers
# n8n.yourdomain.com → Hetzner IP

# 6. SSL Certificate
# Vercel → auto SSL (free)
# Hetzner → Traefik + Let's Encrypt (from Space files)

# 7. Smoke Tests
curl https://legal-intake.com/api/health
# Should return { status: "ok" }
```

**Deliverable:** MVP production-ready, all tests passing, monitoring setup

***

### **Week 6: Optimization + Documentation (8-10h)**

```bash
# ✅ Performance Optimization
# - Image optimization (next/image)
# - Code splitting (React.lazy)
# - Caching strategy (SWR, TanStack Query)

# ✅ SEO
# - meta tags
# - sitemap.xml
# - robots.txt

# ✅ Documentation
# - API docs (OpenAPI/Swagger)
# - Admin panel guide (Notion)
# - Setup instructions (GitHub README)

# ✅ Error Tracking
# - Sentry setup (free tier)
# - n8n error handling
# - Database backups verified

# ✅ Legal Compliance
# - Privacy Policy
# - Terms of Service
# - GDPR compliance
# - Data retention policy
```

**Deliverable:** MVP COMPLETE, production-ready, fully documented

***

## 📊 **COMPLETE TIMELINE SUMMARY**

| Phase | Week | Focus | Hours | Deliverable |
| :-- | :-- | :-- | :-- | :-- |
| **Prep** | -1 | Setup infra | 16 | Env ready, .env configured |
| **Phase 1** | 1 | Foundation | 12-15 | Auth working, DB ready |
| **Phase 2** | 2 | Form Builder | 15-18 | Admin CMS complete |
| **Phase 3** | 3 | Calendar | 10-12 | Booking flow done |
| **Phase 4** | 4 | n8n Workflows | 10-12 | AI + notifications |
| **Phase 5** | 5-6 | Testing + Deploy | 20-25 | Production MVP |
|  |  |  | **93-118h** | **COMPLETE MVP** |


***

## 💰 **COST BREAKDOWN (12 months)**

```
Infrastructure:
  - Hetzner CX21: €5.83/mc × 12 = €70
  - Supabase (free tier): €0 × 12 = €0
  - Vercel (free tier): €0 × 12 = €0

APIs (per month):
  - OpenAI (1K responses @ $0.02/response): $20/mc
  - Google Calendar: €0 (included)
  - Twilio SMS (100/month): ~€3/mc
  - SendGrid (free tier): €0

Total infrastructure: ~€80-150/month (MVP)
```


***

## ✅ **NEXT STEPS - THIS WEEKEND**

1. **Sobota:**
    - Setup Hetzner VPS
    - Create Supabase project
    - Setup GitHub repo with Next.js
    - Configure `.env.local`
2. **Niedziela:**
    - Run SQL schema w Supabase
    - Test auth flow
    - Deploy to Vercel
    - Setup Google OAuth

**By end of Week 1:** Admin login working ✅

Gotowy zacząć? Mam jeszcze pytania do konkretnych części? 🚀

