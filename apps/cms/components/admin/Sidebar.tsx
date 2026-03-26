'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Inbox, CalendarCheck, Calendar, Settings, LogOut, Mail, Globe, Newspaper, Images, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { messages } from '@/lib/messages'

const menuItems = [
  { href: '/admin', label: messages.nav.dashboard, icon: LayoutDashboard },
  { href: '/admin/surveys', label: messages.nav.surveys, icon: FileText },
  { href: '/admin/responses', label: messages.nav.responses, icon: Inbox },
  { href: '/admin/appointments', label: messages.nav.appointments, icon: CalendarCheck },
  { href: '/admin/calendar', label: messages.nav.calendar, icon: Calendar },
  { href: '/admin/email-templates', label: messages.nav.emailTemplates, icon: Mail },
  { href: '/admin/landing-page', label: messages.nav.landingPage, icon: Globe },
  { href: '/admin/blog', label: messages.nav.blog, icon: Newspaper },
  { href: '/admin/media', label: messages.nav.media, icon: Images },
  { href: '/admin/legal-pages', label: messages.nav.legalPages, icon: Scale },
  { href: '/admin/settings', label: messages.nav.settings, icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground">Halo Efekt</h1>
        <p className="text-muted-foreground text-sm mt-1">{messages.nav.adminPanel}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut size={18} />
          <span>{messages.nav.logout}</span>
        </button>
      </div>
    </aside>
  )
}
