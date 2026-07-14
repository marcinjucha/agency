import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import type { EmailTemplate } from '../types'
import { deleteEmailTemplateFn, getEmailTemplateUsageFn } from '../server'

interface DeleteTemplateDialogProps {
  template: EmailTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  // Optional callback fired after a successful delete — list page does not need
  // it (mutation invalidates the query) but editor route uses it to navigate
  // back to the list after deletion.
  onDeleted?: () => void
}

export function DeleteTemplateDialog({
  template,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTemplateDialogProps) {
  const queryClient = useQueryClient()

  // Delete-guard: how many campaigns explicitly selected this template. The FK is
  // ON DELETE SET NULL, so delete is SAFE (never blocked) but silently un-assigns
  // those campaigns — the operator must be warned first. Only queried while the
  // dialog is open for a real template.
  const { data: usage } = useQuery({
    queryKey: [...queryKeys.email.templates, 'usage', template?.type],
    queryFn: () => getEmailTemplateUsageFn({ data: { type: template!.type } }),
    enabled: open && !!template,
  })
  const campaignCount = usage?.campaigns ?? 0

  const mutation = useMutation({
    mutationFn: async (type: string) => {
      const result = await deleteEmailTemplateFn({ data: { type } })
      if (!result.success) {
        throw new Error(result.error ?? messages.email.deleteFailed)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.templates })
      onDeleted?.()
      onOpenChange(false)
    },
  })

  const handleConfirm = () => {
    if (!template) return
    mutation.mutate(template.type)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.email.deleteDialogTitle}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {template && (
                <p>
                  {messages.email.deleteConfirmTemplateLabel}{' '}
                  <strong className="text-foreground">
                    {template.label ?? template.type}
                  </strong>
                  {' ('}
                  {messages.email.deleteConfirmKeyLabel}{' '}
                  <code className="text-xs">{template.type}</code>
                  {').'}
                </p>
              )}
              <p>{messages.email.deleteWarning}</p>
              {campaignCount > 0 && (
                <p className="font-medium text-destructive">
                  {messages.email.deleteCampaignUsageWarning(campaignCount)}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : messages.email.deleteFailed}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {messages.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={mutation.isPending || !template}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? messages.common.saving : messages.email.deleteAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
