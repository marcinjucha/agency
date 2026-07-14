import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollapsibleCard } from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { EmailTemplatePicker } from '@/features/email/components/EmailTemplatePicker'
import { listBonusTemplatesFn, selectTemplateForCampaignFn, getCampaignEffectiveSendFn } from '../admin'

// ---------------------------------------------------------------------------
// CampaignBonusTemplateCard — venture wrapper around the reusable
// EmailTemplatePicker (Phase 4, model B).
//
// This is the MUTATION surface (council 2026-07-14): selecting a template writes
// so_campaigns.email_template_id. The adjacent CampaignEffectiveSendCard stays a
// READ-ONLY mirror. On success we invalidate BOTH the effective-send query (the
// mirror) and the venture root (the campaign row) so the two never drift.
//
// editHref points at the EFFECTIVE template's type-keyed editor (resolved by the
// same precedence as the send path) — the picker itself is presentational and
// venture-agnostic; all venture knowledge lives here.
// ---------------------------------------------------------------------------

interface CampaignBonusTemplateCardProps {
  campaignId: string
  /** The campaign's persisted email_template_id (null = use the tenant default). */
  currentTemplateId: string | null
}

export function CampaignBonusTemplateCard({
  campaignId,
  currentTemplateId,
}: CampaignBonusTemplateCardProps) {
  const queryClient = useQueryClient()
  // Optimistic local selection — seeded from the persisted row, updated on change.
  const [selected, setSelected] = useState<string | null>(currentTemplateId)

  const optionsQuery = useQuery({
    queryKey: queryKeys.venture.bonusTemplates,
    queryFn: () => listBonusTemplatesFn(),
  })

  const effectiveQuery = useQuery({
    queryKey: queryKeys.venture.effectiveSend(campaignId),
    queryFn: () => getCampaignEffectiveSendFn({ data: { campaignId } }),
  })

  const mutation = useMutation({
    mutationFn: (templateId: string | null) =>
      selectTemplateForCampaignFn({ data: { campaignId, templateId } }),
    onSuccess: (result) => {
      // Server rejected (e.g. forged id) → revert the optimistic selection.
      if (!result?.success) {
        setSelected(currentTemplateId)
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.effectiveSend(campaignId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })
    },
    onError: () => setSelected(currentTemplateId),
  })

  const options = optionsQuery.data?.success ? optionsQuery.data.data : []

  // The template the send would ACTUALLY use — powers the "Edytuj szablon" link.
  const resolvedType =
    effectiveQuery.data?.success && effectiveQuery.data.data
      ? effectiveQuery.data.data.resolvedTemplateType
      : null
  const editHref = resolvedType ? routes.admin.emailTemplate(resolvedType) : null

  // Guard for a stale/foreign persisted selection: a non-null id that is not in the
  // pre-filtered bonus-capable list (shouldn't happen — the list gates the options —
  // but a template could lose its marker after assignment).
  const staleSelection =
    selected !== null && options.length > 0 && !options.some((o) => o.id === selected)
  const warning = staleSelection ? messages.venture.bonusTemplatePickerWarning : null

  function handleChange(id: string | null) {
    setSelected(id)
    mutation.mutate(id)
  }

  return (
    <CollapsibleCard title={messages.venture.bonusTemplateCardTitle} defaultOpen>
      <EmailTemplatePicker
        templates={options}
        value={selected}
        onChange={handleChange}
        editHref={editHref}
        loading={optionsQuery.isLoading}
        disabled={mutation.isPending}
        warning={warning}
        emptyHint={messages.venture.bonusTemplateEmptyHint}
      />
    </CollapsibleCard>
  )
}
