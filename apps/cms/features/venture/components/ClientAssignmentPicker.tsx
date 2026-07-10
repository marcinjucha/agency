import { useQuery } from '@tanstack/react-query'
import {
  Checkbox,
  Label,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@agency/ui'
import { Building2 } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
// Plain .ts wrapper only — importing admin-handlers.server.ts here would be
// denied by TanStack Start import-protection in the client build.
import { listClientsFn } from '../admin'

// ---------------------------------------------------------------------------
// Controlled multi-select of the tenant's venture clients (iter 3b).
//
// The list is `listClientsFn` — the SAME RLS-scoped admin read the campaign
// editor uses. For an unscoped actor (owner/admin) it returns EVERY client in
// their tenant, i.e. exactly "clients from the admin's own organization". No new
// list is built.
//
// Fully controlled (value / onChange) — the array lives in the parent's RHF
// `Controller` field, never in `register` (register keeps only the last value
// for arrays — ag-design-patterns). Handles all four data states:
// loading / error / empty / success.
// ---------------------------------------------------------------------------

interface ClientAssignmentPickerProps {
  /** Currently-selected client ids (controlled). */
  value: string[]
  onChange: (clientIds: string[]) => void
  disabled?: boolean
  /** DOM id of the group label, wired to aria-labelledby for the checkbox group. */
  labelId?: string
  /**
   * Super_admin Scope Bar target — the EDITED user's tenant. When editing a user
   * in ANOTHER organization, the picker must list THAT org's clients, not the
   * super_admin's own. Honored server-side only for a super_admin; omitted =
   * caller's own tenant. Also scopes the cache key so cross-tenant edits don't
   * collide (still under the venture root → venture.all invalidation refreshes it).
   */
  tenantId?: string
}

export function ClientAssignmentPicker({
  value,
  onChange,
  disabled = false,
  labelId,
  tenantId,
}: ClientAssignmentPickerProps) {
  const {
    data: clients,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.venture.clients, tenantId ?? 'self'],
    queryFn: async () => {
      const result = await listClientsFn(
        tenantId ? { data: { tenantId } } : undefined,
      )
      if (!result?.success) {
        throw new Error(result?.error ?? messages.venture.loadClientsFailed)
      }
      return result.data ?? []
    },
  })

  if (isLoading) return <LoadingState variant="skeleton-list" />

  if (error) {
    return (
      <ErrorState
        title={messages.venture.loadClientsFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="inline"
      />
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title={messages.users.noClientsToAssign}
        description={messages.users.noClientsToAssignDescription}
        variant="inline"
      />
    )
  }

  const selected = new Set(value)

  function toggle(clientId: string, checked: boolean) {
    if (checked) {
      if (!selected.has(clientId)) onChange([...value, clientId])
    } else {
      onChange(value.filter((id) => id !== clientId))
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2"
    >
      {clients.map((client) => {
        const checkboxId = `client-assignment-${client.id}`
        const isChecked = selected.has(client.id)
        return (
          <div
            key={client.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
          >
            <Checkbox
              id={checkboxId}
              checked={isChecked}
              disabled={disabled}
              onCheckedChange={(checked) => toggle(client.id, checked === true)}
            />
            <Label
              htmlFor={checkboxId}
              className="flex flex-1 cursor-pointer items-center gap-2 font-normal"
            >
              <span className="truncate text-foreground">{client.name}</span>
              <span className="text-xs text-muted-foreground">/{client.slug}</span>
            </Label>
          </div>
        )
      })}
    </div>
  )
}
