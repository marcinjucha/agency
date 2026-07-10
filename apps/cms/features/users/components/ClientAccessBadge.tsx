import { useQuery } from '@tanstack/react-query'
import { Badge } from '@agency/ui'
import { Globe, Building2 } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
// Plain .ts wrapper only (never assignment-handlers.server.ts) — import-protection.
import { getUserClientAssignmentsFn } from '@/features/venture/assignments'
import { isUnscopedAccess } from '@/features/venture/utils/client-access'

// ---------------------------------------------------------------------------
// At-a-glance client-access indicator (iter 3b). Shows "Wszyscy klienci" for an
// unscoped user (owner/admin/super_admin) with NO query, and "N klientów" for a
// scoped user — the count comes from getUserClientAssignmentsFn, keyed under the
// venture root so an assignment save (which invalidates venture.all) refreshes it.
//
// Only mounted where the venture (bonus_funnel) feature is enabled — the caller
// gates rendering so non-venture tenants see no client-access noise.
// ---------------------------------------------------------------------------

interface ClientAccessBadgeProps {
  userId: string
  isSuperAdmin: boolean
  /** Legacy users.role (owner/admin/member) — the server's scoping determinant. */
  roleName: string | null
}

export function ClientAccessBadge({ userId, isSuperAdmin, roleName }: ClientAccessBadgeProps) {
  // roleName prop holds the coarse users.role — the authoritative scope signal.
  const unscoped = isUnscopedAccess({ isSuperAdmin, role: roleName })

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.venture.assignments(userId),
    queryFn: async () => {
      const result = await getUserClientAssignmentsFn({ data: { userId } })
      if (!result?.success) {
        throw new Error(result?.error ?? messages.users.loadAssignmentsFailed)
      }
      return result.data ?? []
    },
    // Unscoped users see everything — no per-client count to fetch.
    enabled: !unscoped,
  })

  if (unscoped) {
    return (
      <Badge
        variant="outline"
        className="whitespace-nowrap bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      >
        <Globe className="mr-1 h-3 w-3" />
        {messages.users.allClientsAccess}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
        <Building2 className="mr-1 h-3 w-3" />
        …
      </Badge>
    )
  }

  const count = error ? 0 : (data?.length ?? 0)

  return (
    <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
      <Building2 className="mr-1 h-3 w-3" />
      {messages.users.clientsCount(count)}
    </Badge>
  )
}
