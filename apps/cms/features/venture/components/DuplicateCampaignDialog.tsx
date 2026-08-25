import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import type { AdminCampaign } from '../types'

interface DuplicateCampaignDialogProps {
  campaign: AdminCampaign | null
  isPending: boolean
  onConfirm: (id: string) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Confirmation for duplicating a campaign.
 *
 * The dialog exists to state the contract, not to ask "are you sure": the copy
 * deliberately drops the webhook secret, the ESP audience and the published
 * state, and an operator who discovers that only afterwards has already lost
 * trust in the action. Everything the copy carries and drops is listed here.
 */
export function DuplicateCampaignDialog({
  campaign,
  isPending,
  onConfirm,
  onOpenChange,
}: DuplicateCampaignDialogProps) {
  return (
    <AlertDialog open={campaign !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.venture.duplicateTitle}</AlertDialogTitle>
          <AlertDialogDescription>{messages.venture.duplicateDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium text-foreground">
              {messages.venture.duplicateCopiedTitle}:
            </span>{' '}
            <span className="text-muted-foreground">{messages.venture.duplicateCopiedItems}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">
              {messages.venture.duplicateSkippedTitle}:
            </span>{' '}
            <span className="text-muted-foreground">{messages.venture.duplicateSkippedItems}</span>
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => campaign && onConfirm(campaign.id)}
          >
            {messages.venture.duplicateConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
