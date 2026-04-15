import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Calendar,
  Settings,
  LogOut,
  Mail,
  Globe,
  Newspaper,
  Images,
  Scale,
  ShoppingBag,
  Tags,
  Store,
  Zap,
  History,
  Users,
  Shield,
  Building2,
  KeyRound,
} from 'lucide-react'
import { usePermissions } from '@/contexts/permissions-context'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { getRequiredPermission, isFeatureEnabled, type PermissionKey } from '@/lib/permissions'
import { TenantSwitcher } from '@/features/tenants/components/TenantSwitcher'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MenuItem = { href: string; label: string; icon: typeof LayoutDashboard }

type MenuGroup = {
  label?: string
  items: MenuItem[]
  /** If set, group is visible only when user has ANY of these permissions. */
  requiredPermissions?: PermissionKey[]
}

export type SidebarV2Props = {
  /** Caller manages logout so SidebarV2 has no navigation side-effects (SRP). */
  onLogout: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Menu config — OCP: extend by adding entries here, no logic changes needed
// ---------------------------------------------------------------------------

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
    label: messages.nav.groupShop,
    items: [
      { href: routes.admin.shopProducts, label: messages.nav.shopProducts, icon: ShoppingBag },
      { href: routes.admin.shopCategories, label: messages.nav.shopCategories, icon: Tags },
      { href: routes.admin.shopMarketplace, label: messages.nav.shopMarketplace, icon: Store },
    ],
  },
  {
    label: messages.nav.groupAutomation,
    items: [
      { href: routes.admin.workflows, label: messages.nav.workflows, icon: Zap },
      { href: routes.admin.executionsList, label: messages.nav.workflowExecutions, icon: History },
    ],
  },
  {
    label: messages.nav.groupSystem,
    items: [
      { href: routes.admin.emailTemplates, label: messages.nav.emailTemplates, icon: Mail },
      { href: routes.admin.settings, label: messages.nav.settings, icon: Settings },
    ],
  },
  {
    label: messages.nav.groupManagement,
    requiredPermissions: ['system.users', 'system.roles', 'system.tenants', 'system.docforge_licenses'],
    items: [
      { href: routes.admin.users, label: messages.nav.users, icon: Users },
      { href: routes.admin.roles, label: messages.nav.roles, icon: Shield },
      { href: routes.admin.tenants, label: messages.tenants.title, icon: Building2 },
      { href: routes.admin.docforgeLicenses, label: messages.docforgeLicenses.navLabel, icon: KeyRound },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SidebarV2({ onLogout }: SidebarV2Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { hasPermission, isSuperAdmin, enabledFeatures } = usePermissions()

  const filteredGroups = buildFilteredGroups(pathname, isSuperAdmin, enabledFeatures, hasPermission)

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <TenantSwitcher />

      <nav className="flex-1 overflow-y-auto px-3 space-y-4" aria-label="Nawigacja główna">
        {filteredGroups.map((group, groupIdx) => (
          <MenuGroupSection key={group.label ?? groupIdx} group={group} pathname={pathname} />
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut size={18} aria-hidden="true" />
          <span>{messages.nav.logout}</span>
        </button>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MenuGroupSection({
  group,
  pathname,
}: {
  group: MenuGroup
  pathname: string
}) {
  return (
    <div>
      {group.label && (
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {group.label}
        </p>
      )}
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <MenuItemLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  )
}

function MenuItemLink({
  item,
  pathname,
}: {
  item: MenuItem
  pathname: string
}) {
  const Icon = item.icon
  const isActive =
    item.href === routes.admin.executionsList
      ? pathname.startsWith(routes.admin.executionsList)
      : pathname === item.href

  return (
    <Link
      to={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Filtering logic (pure, extracted for testability)
// ---------------------------------------------------------------------------

function buildFilteredGroups(
  pathname: string,
  isSuperAdmin: boolean,
  enabledFeatures: PermissionKey[],
  hasPermission: (key: PermissionKey) => boolean,
): MenuGroup[] {
  return menuGroups
    .map((group) => {
      const visibleItems = group.items.filter((item) => {
        if (!isSuperAdmin && !isFeatureEnabled(item.href, enabledFeatures)) return false
        const required = getRequiredPermission(item.href)
        if (!required) return true
        return hasPermission(required)
      })
      return { ...group, items: visibleItems }
    })
    .filter((group) => {
      if (group.items.length === 0) return false
      if (group.requiredPermissions) {
        return group.requiredPermissions.some((p) => hasPermission(p))
      }
      return true
    })
}
