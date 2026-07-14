import { useQuery } from '@tanstack/react-query'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { renderCampaignBonusEmailPreviewFn } from '../admin'

// ---------------------------------------------------------------------------
// CampaignBonusEmailPreview — the REAL bonus email a send would deliver, for the
// "Podgląd e-mail" tab of the campaign "Wygląd kampanii" card.
//
// Replaces the generic theme-swatch mock (which coloured the header from the
// `headerBackground` role and thus LIED when the selected template's header is
// token-bound to `primary`). Renders the byte-identical send output via
// `renderCampaignBonusEmailPreviewFn` (same shared theme + body mechanism as
// ingest) inside a sandboxed iframe — same approach as features/email EmailPreview.
//
// Needs a SAVED campaign (campaignId): the card only mounts this when a persisted
// id exists; the unsaved/new case keeps the swatch fallback (never calls the fn).
// Reflects the LAST SAVED campaign state — invalidated with the venture root on
// save, exactly like the effective-send card.
// ---------------------------------------------------------------------------

interface CampaignBonusEmailPreviewProps {
  campaignId: string
}

export function CampaignBonusEmailPreview({ campaignId }: CampaignBonusEmailPreviewProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.venture.bonusEmailPreview(campaignId),
    queryFn: () => renderCampaignBonusEmailPreviewFn({ data: { campaignId } }),
  })

  const frame = (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <PreviewBody data={data} isLoading={isLoading} isError={isError} />
    </div>
  )

  return frame
}

function PreviewBody({
  data,
  isLoading,
  isError,
}: {
  data:
    | { success: boolean; data?: { html: string }; error?: string }
    | undefined
  isLoading: boolean
  isError: boolean
}) {
  // Error takes precedence. A hard transport failure surfaces two ways:
  // `isError` (TanStack rejects the undefined a createServerFn returns on a 500 —
  // it does NOT throw), OR a settled query with no data. Both route to the same
  // error note — never the loading pulse (which would hang forever).
  if (isError || (!isLoading && !data)) {
    return <PreviewNote text={messages.venture.bonusEmailPreviewError} status />
  }
  if (isLoading || !data) {
    return <PreviewNote text={messages.venture.bonusEmailPreviewLoading} pulse />
  }
  if (!data.success || !data.data) {
    return (
      <PreviewNote text={data.error ?? messages.venture.bonusEmailPreviewError} status />
    )
  }
  if (!data.data.html) {
    return <PreviewNote text={messages.venture.bonusEmailPreviewEmpty} />
  }
  return (
    <iframe
      srcDoc={data.data.html}
      title={messages.venture.bonusEmailPreviewFrameTitle}
      className="h-[520px] w-full border-0 bg-white"
      // Fully locked (opaque origin, no scripts, no same-origin). The srcDoc is
      // static email HTML with inline styles + images — no active content — so it
      // renders identically under sandbox="" while removing all iframe privileges.
      sandbox=""
    />
  )
}

function PreviewNote({
  text,
  pulse,
  status,
}: {
  text: string
  pulse?: boolean
  status?: boolean
}) {
  return (
    <p
      {...(status ? { role: 'status' } : {})}
      className={`flex h-[520px] items-center justify-center px-6 text-center text-sm text-muted-foreground${
        pulse ? ' animate-pulse' : ''
      }`}
    >
      {text}
    </p>
  )
}
