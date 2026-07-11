import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@agency/ui'
import { MoreHorizontal, Pencil, Copy, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { resolveClientTheme, THEME_COLOR_TOKEN_KEYS } from '@/lib/theme'
import type { ThemeWithUsage } from '../types'
import { deleteThemeFn, duplicateThemeFn } from '../server'

// ---------------------------------------------------------------------------
// Theme Manager (iter D3a) — one library card.
//
// Hero = a horizontal strip of the 9 RESOLVED tokens (not a photo). Per-card ⋯
// menu (Edytuj / Duplikuj / Usuń). Delete is GUARDED: if the theme is used by
// clients (or the server reports a tenant-default reference) the delete is
// refused and a blocking dialog lists the dependents. Mutations are local to the
// card (useMutation) and invalidate at the ROOT key `themes.all`.
// ---------------------------------------------------------------------------

interface ThemeCardProps {
  theme: ThemeWithUsage
}

export function ThemeCard({ theme }: ThemeCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Non-null → the blocking dialog is open; number = dependents to warn about.
  const [blockedCount, setBlockedCount] = useState<number | null>(null)

  const usedByClients = theme.usedBy.clients
  // Total known dependents from the list (clients + campaigns). The tenant-default
  // reference is only known server-side, so the server guard remains the backstop.
  const usedByCount = theme.usedBy.clients + theme.usedBy.campaigns

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const result = await duplicateThemeFn({ data: { id: theme.id } })
      if (!result?.success) throw new Error(result?.error ?? messages.themes.duplicateFailed)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all })
      // Refresh the email block editor's resolved-theme cache (see ThemeEditor).
      queryClient.invalidateQueries({ queryKey: queryKeys.email.resolvedTheme })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteThemeFn({ data: { id: theme.id } }),
    onSuccess: (result) => {
      if (result?.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.themes.all })
        // Refresh the email block editor's resolved-theme cache (see ThemeEditor).
        queryClient.invalidateQueries({ queryKey: queryKeys.email.resolvedTheme })
        return
      }
      // Server-side guard (also counts the tenant-default reference the list's
      // usedBy line doesn't surface) — surface the blocking dialog. `'usedBy' in
      // result` narrows the discriminated union (the `error: string` arm can't be
      // excluded by an `=== 'themeInUse'` check alone).
      if (result && !result.success && 'usedBy' in result) {
        setBlockedCount(
          result.usedBy.clients + result.usedBy.tenants + result.usedBy.campaigns,
        )
      }
    },
  })

  function onDeleteClick() {
    setMenuOpen(false)
    // Fast path — the list already knows this theme is used by clients/campaigns.
    if (usedByCount > 0) {
      setBlockedCount(usedByCount)
      return
    }
    setConfirmOpen(true)
  }

  const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: theme.tokens })

  return (
    <Card className="h-full overflow-hidden">
      {/* Hero — resolved 9-token swatch strip */}
      <div
        className="flex h-14 w-full"
        role="img"
        aria-label={`${messages.themes.swatchGridTitle}: ${theme.name}`}
      >
        {THEME_COLOR_TOKEN_KEYS.map((token) => (
          <span
            key={token}
            className="h-full flex-1"
            style={{ backgroundColor: resolved[token] }}
            title={`${messages.email.themeTokenLabels[token]} — ${resolved[token]}`}
          />
        ))}
      </div>

      <CardContent className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <Link
            to={routes.admin.theme(theme.id)}
            className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="line-clamp-2 font-semibold text-foreground hover:underline">
              {theme.name}
            </p>
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {usedByClients > 0
              ? messages.themes.usedByClients(usedByClients)
              : messages.themes.unused}
          </p>
        </div>

        {/* ⋯ actions menu */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              aria-label={messages.themes.actionsLabel}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            <MenuButton
              icon={Pencil}
              label={messages.themes.edit}
              onClick={() => {
                setMenuOpen(false)
                navigate({ to: routes.admin.theme(theme.id) })
              }}
            />
            <MenuButton
              icon={Copy}
              label={messages.themes.duplicate}
              disabled={duplicateMutation.isPending}
              onClick={() => {
                setMenuOpen(false)
                duplicateMutation.mutate()
              }}
            />
            <MenuButton
              icon={Trash2}
              label={messages.themes.delete}
              destructive
              onClick={onDeleteClick}
            />
          </PopoverContent>
        </Popover>
      </CardContent>

      {/* Delete confirm (only reachable when not in use) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.themes.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {messages.themes.deleteConfirmDescription(theme.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {messages.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete blocked — theme still referenced */}
      <AlertDialog
        open={blockedCount !== null}
        onOpenChange={(open) => !open && setBlockedCount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.themes.deleteBlockedTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {messages.themes.deleteBlockedDescription(blockedCount ?? 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedCount(null)}>
              {messages.common.close}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: typeof Pencil
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={
        destructive
          ? 'w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive'
          : 'w-full justify-start gap-2'
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  )
}
