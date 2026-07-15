import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, CollapsibleCard } from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { EmailTemplatePicker } from '@/features/email/components/EmailTemplatePicker'
import { TemplateVariablesFields } from '@/features/email/components/TemplateVariablesFields'
import {
  listBonusTemplatesFn,
  selectTemplateForCampaignFn,
  getCampaignEffectiveSendFn,
  getCampaignTemplateVariablesFn,
  saveCampaignTemplateVariablesFn,
} from '../admin'

// ---------------------------------------------------------------------------
// CampaignBonusTemplateCard — venture wrapper around the reusable
// EmailTemplatePicker (Phase 4, model B).
//
// This is the MUTATION surface (council 2026-07-14): selecting a template writes
// so_campaigns.email_template_id. The adjacent CampaignEffectiveSendCard stays a
// READ-ONLY mirror. On success we invalidate BOTH the effective-send query (the
// mirror) and the venture root (the campaign row) so the two never drift.
//
// editHref points at the EFFECTIVE template's type-keyed editor. It derives
// directly from the effective template's `kind === 'template'` state (only a
// resolved template has an editable target) — there is no precedence resolution
// anymore (resolveBonusTemplateByPrecedence was deleted with the tenant-default
// tier). The picker itself is presentational and venture-agnostic; all venture
// knowledge lives here.
// ---------------------------------------------------------------------------

interface CampaignBonusTemplateCardProps {
  campaignId: string
  /** The campaign's persisted email_template_id (null = no template selected → no email is sent). */
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
    // Accepts null so the "Wyczyść szablon" affordance can clear the selection
    // (email_template_id → null → no email sent). The picker itself only ever
    // passes a string; the null path is exclusive to handleClear.
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

  const options = optionsQuery.data?.success ? optionsQuery.data.data ?? [] : []

  // The template the send would ACTUALLY use — powers the "Edytuj szablon" link.
  // Only a resolved 'template' state has an editable target (no selection → no
  // send; selected-but-broken → the built-in layout has no editor).
  const effectiveTemplate =
    effectiveQuery.data?.success && effectiveQuery.data.data
      ? effectiveQuery.data.data.template
      : null
  const editHref =
    effectiveTemplate?.kind === 'template'
      ? routes.admin.emailTemplate(effectiveTemplate.type)
      : null

  function handleChange(id: string) {
    setSelected(id)
    mutation.mutate(id)
  }

  // Clear the selection → email_template_id becomes null → no bonus email is sent.
  // Shown only when a template is currently selected (see the guarded render below).
  function handleClear() {
    setSelected(null)
    mutation.mutate(null)
  }

  return (
    <CollapsibleCard title={messages.venture.bonusTemplateCardTitle} defaultOpen>
      <div className="space-y-4">
        <EmailTemplatePicker
          templates={options}
          value={selected}
          onChange={handleChange}
          editHref={editHref}
          loading={optionsQuery.isLoading}
          disabled={mutation.isPending}
          emptyHint={messages.venture.bonusTemplateEmptyHint}
        />

        {/* Clear affordance — the picker can only SELECT (onChange: string), so this
            is the sole UI path back to "no template" (null → no email sent). Only
            rendered when a template is selected. Button (not a raw element) → a
            guaranteed focus-visible ring. */}
        {selected !== null && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-muted-foreground"
            onClick={handleClear}
            disabled={mutation.isPending}
          >
            {messages.venture.clearTemplateSelection}
          </Button>
        )}

        {/* Fill the selected template's variables with literal values (Iter 3b).
            Keyed by the selected template id so switching templates fully resets
            the section's local edit state (a different template = different
            variables). When no template is selected the section renders a hint
            (no email is sent) instead of the fields — see the section body. */}
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium">{messages.email.templateVariablesTitle}</p>
          <CampaignTemplateVariablesSection
            key={selected ?? '__none__'}
            campaignId={campaignId}
            selectedTemplateId={selected}
            selectionPending={mutation.isPending}
          />
        </div>
      </div>
    </CollapsibleCard>
  )
}

interface CampaignTemplateVariablesSectionProps {
  campaignId: string
  /** The picker's current (optimistic) selection — drives the query key + remount. */
  selectedTemplateId: string | null
  /**
   * Parent's selectTemplateForCampaign mutation in-flight flag. While true the DB
   * still holds the PREVIOUS template id, so the variables read (which resolves the
   * EFFECTIVE template from the committed row) must NOT run yet — it would return
   * the old template's fields and the seededRef guard would latch to stale data.
   */
  selectionPending: boolean
}

// Owns the fetch (which fields) + persistence (debounced autosave) for the
// per-campaign template variable values. The presentational TemplateVariablesFields
// is fed local edit state; this wrapper is the venture-specific data/save seam.
//
// SAVE UX — debounced autosave (~800ms) + a saving/saved/error status line. Chosen
// to match the card's existing low-friction interaction (template selection already
// immediate-saves) and the CMS "low-impact fields → autosave with debounce"
// convention; literal-value inputs are low-impact (no live surface breaks).
function CampaignTemplateVariablesSection({
  campaignId,
  selectedTemplateId,
  selectionPending,
}: CampaignTemplateVariablesSectionProps) {
  const queryClient = useQueryClient()

  const variablesQuery = useQuery({
    queryKey: queryKeys.venture.templateVariables(campaignId, selectedTemplateId),
    queryFn: () => getCampaignTemplateVariablesFn({ data: { campaignId } }),
    // Gate against uncommitted DB state: the handler resolves the effective
    // template from the COMMITTED so_campaigns.email_template_id, so we must not
    // read while the selection write is still in flight (race → stale fields).
    // On a template switch the section remounts (key change) with this disabled,
    // then fetches once the write settles (committed row). Also gated on a
    // non-null selection: with no template selected no email is sent, so there
    // are no variables to fetch (the fields are replaced by a hint below).
    enabled: !selectionPending && selectedTemplateId !== null,
  })

  const [values, setValues] = useState<Record<string, string>>({})
  // Seed local edit state ONCE from the first successful load (guarded so a
  // post-save refetch never clobbers in-flight typing). Resets on remount when
  // the selected template changes (parent `key`).
  const seededRef = useRef(false)
  useEffect(() => {
    const result = variablesQuery.data
    if (!seededRef.current && result?.success && result.data) {
      setValues(result.data.values)
      seededRef.current = true
    }
  }, [variablesQuery.data])

  const saveMutation = useMutation({
    mutationFn: (next: Record<string, string>) =>
      saveCampaignTemplateVariablesFn({ data: { campaignId, values: next } }),
    onSuccess: () => {
      // Invalidate the venture ROOT (not the exact key) so every nested venture
      // query refreshes consistently (agency-tanstack-query-root-key-invalidation).
      queryClient.invalidateQueries({ queryKey: queryKeys.venture.all })
    },
  })

  // Debounced autosave — one timer, cleared on each edit and flushed on unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest values with a debounced edit not yet persisted; null = nothing pending.
  const pendingValuesRef = useRef<Record<string, string> | null>(null)
  // Latest save invoker, kept in a ref so the unmount-only cleanup (empty deps)
  // never flushes through a stale mutation instance.
  const saveRef = useRef<(next: Record<string, string>) => void>(() => {})
  useEffect(() => {
    saveRef.current = (next) => saveMutation.mutate(next)
  })

  // Flush a pending debounced edit on unmount. Switching the template remounts
  // this section (parent `key`) and navigating/collapsing unmounts it, so a value
  // typed within the 800ms debounce window would otherwise be dropped (the timer
  // is cleared without ever firing the save). If a timer is still pending we fire
  // the save synchronously with the latest values. No double-save: the debounced
  // callback nulls timerRef + pendingValuesRef when it fires, so a later unmount
  // sees nothing pending. Empty deps → this runs only on unmount.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (pendingValuesRef.current !== null) {
          saveRef.current(pendingValuesRef.current)
          pendingValuesRef.current = null
        }
      }
    },
    [],
  )

  function handleValuesChange(next: Record<string, string>) {
    setValues(next)
    pendingValuesRef.current = next
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      // Debounced save fired → nothing pending (prevents a double-save if the
      // component later unmounts before another edit).
      timerRef.current = null
      pendingValuesRef.current = null
      saveMutation.mutate(next)
    }, 800)
  }

  // No template selected → no email is sent, so there are no variables to fill.
  // Render a hint instead of the fields. Placed AFTER all hooks (a disabled query
  // reports isPending, so this must precede the loading check below).
  if (selectedTemplateId === null) {
    return (
      <p className="text-sm text-muted-foreground">{messages.venture.noTemplateNoSendHint}</p>
    )
  }

  // Loading window = the selection write is in flight (query disabled) OR the query
  // has not yet produced data. In TanStack Query v5 a disabled query has
  // isLoading === false (nothing is fetching) but isPending === true (no data yet),
  // so isPending — not isLoading — is what keeps the loading line up through the
  // whole switch-then-fetch window and prevents an empty-state/stale flash. Once
  // data lands, background refetches keep status 'success' (isPending stays false),
  // so the autosave-invalidation refetch does not re-flash this.
  if (selectionPending || variablesQuery.isPending) {
    return <p className="text-xs text-muted-foreground">{messages.common.loading}</p>
  }

  if (variablesQuery.isError || variablesQuery.data?.success === false) {
    return (
      <p className="text-xs text-destructive">{messages.email.templateVariablesLoadError}</p>
    )
  }

  const fields = variablesQuery.data?.success ? variablesQuery.data.data?.fields ?? [] : []

  return (
    <div className="space-y-3">
      <TemplateVariablesFields variables={fields} values={values} onChange={handleValuesChange} />
      {fields.length > 0 && <SaveStatus mutation={saveMutation} />}
    </div>
  )
}

function SaveStatus({
  mutation,
}: {
  mutation: { isPending: boolean; isError: boolean; isSuccess: boolean }
}) {
  if (mutation.isPending) {
    return <p className="text-xs text-muted-foreground">{messages.common.saving}</p>
  }
  if (mutation.isError) {
    return <p className="text-xs text-destructive">{messages.common.saveError}</p>
  }
  if (mutation.isSuccess) {
    return <p className="text-xs text-muted-foreground">{messages.common.saved}</p>
  }
  return null
}
