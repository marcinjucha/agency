import { useQuery } from '@tanstack/react-query'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { renderCampaignBonusEmailPreviewFn } from '../admin'
import type { CampaignThemeOverride } from '../types'
// Type-only: the discriminated union is the handler's exported return contract —
// erased at build, so no server code reaches the client bundle. Keep it `import type`.
import type { CampaignBonusEmailPreview as CampaignBonusEmailPreviewData } from '../admin-handlers.server'

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
//
// `themeOverride` (optional) is the IN-FLIGHT (unsaved) campaign theme tier from the
// editor: when provided, the preview reflects the picked-but-not-saved theme WITHOUT
// a DB write (approach B). Its serialization keys the query so a theme change
// refetches; when omitted the preview shows the LAST SAVED campaign theme (key
// `__saved__`). The query stays nested under the venture root, so `venture.all`
// invalidation (template/variable/campaign edits) still refreshes it.
// ---------------------------------------------------------------------------

interface CampaignBonusEmailPreviewProps {
  campaignId: string
  themeOverride?: CampaignThemeOverride
}

export function CampaignBonusEmailPreview({
  campaignId,
  themeOverride,
}: CampaignBonusEmailPreviewProps) {
  // Stable, deterministic serialization of the override → the query cache key.
  const themeKey = themeOverride ? JSON.stringify(themeOverride) : undefined
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.venture.bonusEmailPreview(campaignId, themeKey),
    queryFn: () => renderCampaignBonusEmailPreviewFn({ data: { campaignId, themeOverride } }),
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
    | {
        success: boolean
        data?: CampaignBonusEmailPreviewData
        error?: string
      }
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
  // No template selected → NO email is sent (product decision 2026-07-15) → nothing
  // to render; explain instead of showing an empty/misleading frame.
  if (data.data.kind === 'no-template') {
    return <PreviewNote text={messages.venture.noTemplateNoSend} status />
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
