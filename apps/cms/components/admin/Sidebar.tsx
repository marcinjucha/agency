'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Inbox, Calendar, Settings, LogOut, Mail, Globe, Newspaper, Images, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

type MenuItem = { href: string; label: string; icon: typeof LayoutDashboard }
type MenuGroup = { label?: string; items: MenuItem[] }

const menuGroups: MenuGroup[] = [
  {
    items: [
      { href: routes.admin.root, label: messages.nav.dashboard, icon: LayoutDashboard },
    ],
  },
  {
    label: messages.nav.groupIntake,
    items: [
      { href: routes.admin.surveys, label: messages.nav.surveys, icon: FileText },
      { href: routes.admin.intake, label: messages.nav.intake, icon: Inbox },
      { href: routes.admin.calendar, label: messages.nav.calendar, icon: Calendar },
    ],
  },
  {
    label: messages.nav.groupContent,
    items: [
      { href: routes.admin.landingPage, label: messages.nav.landingPage, icon: Globe },
      { href: routes.admin.blog, label: messages.nav.blog, icon: Newspaper },
      { href: routes.admin.media, label: messages.nav.media, icon: Images },
      { href: routes.admin.legalPages, label: messages.nav.legalPages, icon: Scale },
    ],
  },
  {
    label: messages.nav.groupSystem,
    items: [
      { href: routes.admin.emailTemplates, label: messages.nav.emailTemplates, icon: Mail },
      { href: routes.admin.settings, label: messages.nav.settings, icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push(routes.login)
    router.refresh()
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground">Halo Efekt</h1>
        <p className="text-muted-foreground text-sm mt-1">{messages.nav.adminPanel}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-4">
        {menuGroups.map((group, groupIdx) => (
          <div key={group.label ?? groupIdx}>
            {group.label && (
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            </div>
          </div>
        ))}
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
