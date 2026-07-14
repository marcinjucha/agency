import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button, CollapsibleCard } from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { getCampaignEffectiveSendFn } from '../admin'

// ---------------------------------------------------------------------------
// CampaignEffectiveSendCard — READ-ONLY "Ten launch wysyła" surface.
//
// Council 2026-07-14 "surface-and-defer": NOT an editor. A read-only mirror of
// what a bonus-email send actually uses (effective sender + appearance
// cross-reference + template slug), with deep-links back to the real editors.
// The one hazard it surfaces is the silent degrade to the shared agency account.
//
// Editing stays at source: sender in VentureClientEditor, template in
// /admin/email-templates, appearance in the adjacent CampaignThemeCard.
// ---------------------------------------------------------------------------

interface CampaignEffectiveSendCardProps {
  campaignId: string
  clientId: string
}

export function CampaignEffectiveSendCard({
  campaignId,
  clientId,
}: CampaignEffectiveSendCardProps) {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.venture.effectiveSend(campaignId),
    queryFn: () => getCampaignEffectiveSendFn({ data: { campaignId } }),
  })

  return (
    <CollapsibleCard title={messages.venture.effectiveSendTitle} defaultOpen>
      {isLoading || !data ? (
        <p className="text-xs text-muted-foreground">{messages.common.loading}</p>
      ) : !data.success || !data.data ? (
        <p role="status" className="text-xs text-muted-foreground">
          {data.error ?? messages.venture.effectiveSendLoadFailed}
        </p>
      ) : (
        <div className="space-y-5">
          {/* Row 1 — effective sender + shared-fallback hazard note */}
          <Row label={messages.venture.effectiveSenderRowLabel}>
            <p className="text-sm text-foreground">{data.data.senderLabel}</p>
            <p className="font-mono text-xs text-muted-foreground">{data.data.senderEmail}</p>
            {data.data.isSharedFallback && (
              <div
                role="status"
                className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
              >
                {messages.venture.effectiveSenderSharedFallbackNote}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => navigate({ to: routes.admin.ventureClient(clientId) })}
                  className="mt-1 block h-auto w-fit p-0 text-xs"
                >
                  {messages.venture.effectiveSenderFixLink}
                </Button>
              </div>
            )}
          </Row>

          {/* Row 2 — appearance cross-reference (no CampaignThemeCard duplication) */}
          <Row label={messages.venture.effectiveThemeRowLabel}>
            <p className="text-xs text-muted-foreground">
              {messages.venture.effectiveThemeCrossRef}
            </p>
          </Row>

          {/* Row 3 — bonus template slug label + deep-link (a label, not a picker) */}
          <Row label={messages.venture.effectiveTemplateRowLabel}>
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">
                {messages.venture.effectiveTemplateSends}{' '}
              </span>
              <code className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-xs">
                {data.data.templateType}
              </code>
            </p>
            {!data.data.templateExists && (
              <p className="mt-1 text-xs text-muted-foreground">
                {messages.venture.effectiveTemplateMissingNote}
              </p>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() =>
                navigate({ to: routes.admin.emailTemplate(data.data!.templateType) })
              }
              className="mt-1 block h-auto w-fit p-0 text-xs"
            >
              {messages.venture.effectiveTemplateEditLink}
            </Button>
          </Row>
        </div>
      )}
    </CollapsibleCard>
  )
}

// Small labeled row — label (muted, secondary) above read-only value content.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
