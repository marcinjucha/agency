

import { useState } from 'react'
import {
  Button,
  Card,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@agency/ui'
import { Monitor } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { messages } from '@/lib/messages'
import type { Activation } from '../types'

// ---------------------------------------------------------------------------
// Freshness helpers
// ---------------------------------------------------------------------------

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

function freshnessDotColor(lastSeenAt: string): string {
  const elapsed = Date.now() - new Date(lastSeenAt).getTime()
  if (elapsed < ONE_DAY_MS) return 'bg-emerald-400'
  if (elapsed < SEVEN_DAYS_MS) return 'bg-amber-400'
  return 'bg-red-400'
}

function freshnessLabel(lastSeenAt: string): string {
  const elapsed = Date.now() - new Date(lastSeenAt).getTime()
  if (elapsed < ONE_DAY_MS) return messages.docforgeLicenses.freshnessActive24h
  if (elapsed < SEVEN_DAYS_MS) return messages.docforgeLicenses.freshnessActive7d
  return messages.docforgeLicenses.freshnessInactive
}

function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pl })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ActivationCardProps {
  activation: Activation
  onDeactivate: (activationId: string) => void
  isDeactivating: boolean
}

export function ActivationCard({ activation, onDeactivate, isDeactivating }: ActivationCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const displayName = activation.machine_name || activation.machine_id.slice(0, 12)

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3">
        {/* Machine info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              {activation.machine_name || messages.docforgeLicenses.machineNameLabel}
            </span>
            {/* Freshness dot */}
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${freshnessDotColor(activation.last_seen_at)}`}
              aria-label={freshnessLabel(activation.last_seen_at)}
              role="img"
            />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground truncate" title={activation.machine_id}>
            {activation.machine_id}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {messages.docforgeLicenses.lastSeenAtLabel}: {formatRelativeTime(activation.last_seen_at)}
          </p>
        </div>

        {/* Deactivate button */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeactivating}
            aria-label={`${messages.docforgeLicenses.deactivateButton} ${displayName}`}
          >
            {messages.docforgeLicenses.deactivateButton}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{messages.docforgeLicenses.deactivateConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {messages.docforgeLicenses.deactivateConfirmDescription(displayName)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeactivate(activation.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {messages.docforgeLicenses.deactivateButton}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function ActivationsEmptyState() {
  return (
    <p className="py-6 text-center text-sm italic text-muted-foreground">
      {messages.docforgeLicenses.noActiveDevices}
    </p>
  )
}
