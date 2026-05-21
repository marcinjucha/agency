/**
 * TRIGGER_REGISTRY — canonical source of trigger metadata.
 *
 * ZERO-DEP RULE (mirrors step-registry.ts): no Zod, no Lucide, no messages.ts,
 * no React component imports. Type-only imports from @agency/validators are
 * the ONLY allowed coupling. WHY: registry is consumed by both UI and
 * server/handler code; pulling Lucide/React into it would force server-side
 * type-checking against React, and pulling messages would create a circular
 * import (messages → workflows feature → registry).
 *
 * Adding a new trigger type:
 *   1. Add `import type { XxxPayload } from '@agency/validators'` if it has a payload.
 *   2. Define a new `defineTrigger({ id: '...' as const, ... })` constant.
 *   3. Append it to the `TRIGGER_REGISTRY` array literal.
 *   4. Add a matching Zod schema in `validation.ts` (`triggerConfigXxxSchema`)
 *      and a TriggerConfigXxx type in `types.ts`.
 *   Zero edits required elsewhere — node-registry, panels, build-initial-nodes,
 *   trigger-payload-validators, server.ts deriveTriggerTypeFromSteps all derive
 *   from this registry.
 *
 * N8N CROSS-FILE DUPLICATION (drift target — see n8n-workflows/CLAUDE.md
 * "TRIGGER_TYPES Drift" section):
 *   - n8n-workflows/workflows/Workflows/Workflow Orchestrator.json
 *     "Fetch and Initialize Execution" Code node — TRIGGER_TYPES array x2
 *   - n8n-workflows/workflows/Workflows/Workflow Process Step.json
 *     "Route by Step Type" Switch rules
 * When adding/removing a trigger type, n8n JSONs MUST be updated manually
 * (no build-time sync today; tracked as follow-up after AAA-T-285).
 */

import type { BookingCreatedPayload, SurveySubmittedPayload } from '@agency/validators'

// --- Trigger Definition Factory ---

export type TriggerDefinition<TId extends string, TPayload = Record<string, never>> = {
  id: TId
  /** Key into messages.workflows — e.g. 'triggerSurveySubmitted'. Resolved by consumer. */
  labelKey: string
  /** Lucide icon NAME (string — registry stays zero-dep). Consumer maps to component. */
  iconName: string
  /** Border color class (Tailwind). Matches step-registry pattern. */
  borderColor: string
  /**
   * Payload TYPE marker for compile-time bridge with TRIGGER_VARIABLE_SCHEMAS.
   * Phantom — never instantiated. `null as unknown as TPayload`.
   * Allows `satisfies keyof TPayload` checks in lib/trigger-schemas.ts.
   */
  payloadType: TPayload
  /**
   * Does this trigger carry surveyLinkId in payload? Used by
   * trigger-payload-validators.ts to scope defense-in-depth check.
   */
  carriesSurveyLinkId: boolean
  /**
   * Whether this trigger type has a live dispatcher today. False for
   * lead_scored (AAA-T-285 follow-up — re-emission via ai_action) and
   * scheduled (AAA-T-285 cron — not yet wired). Informational only;
   * does not gate registration or execution.
   */
  hasLiveDispatcher: boolean
}

/**
 * defineTrigger — plain object factory (NIE klasa).
 * Tree-shaking friendly, no circular dep issues. Mirrors defineStep().
 */
export function defineTrigger<TId extends string, TPayload = Record<string, never>>(
  def: TriggerDefinition<TId, TPayload>,
): TriggerDefinition<TId, TPayload> {
  return def
}

// --- Trigger Definitions ---

const SURVEY_SUBMITTED = defineTrigger({
  id: 'survey_submitted' as const,
  labelKey: 'triggerSurveySubmitted',
  iconName: 'Zap',
  borderColor: 'border-l-4 border-l-orange-500',
  payloadType: null as unknown as SurveySubmittedPayload,
  carriesSurveyLinkId: true,
  hasLiveDispatcher: true,
})

const BOOKING_CREATED = defineTrigger({
  id: 'booking_created' as const,
  labelKey: 'triggerBookingCreated',
  iconName: 'Calendar',
  borderColor: 'border-l-4 border-l-orange-500',
  payloadType: null as unknown as BookingCreatedPayload,
  carriesSurveyLinkId: true,
  hasLiveDispatcher: true,
})

const LEAD_SCORED = defineTrigger({
  id: 'lead_scored' as const,
  labelKey: 'triggerLeadScored',
  iconName: 'TrendingUp',
  borderColor: 'border-l-4 border-l-orange-500',
  payloadType: null as unknown as Record<string, unknown>,
  carriesSurveyLinkId: false,
  hasLiveDispatcher: false,
})

const MANUAL = defineTrigger({
  id: 'manual' as const,
  labelKey: 'triggerManual',
  iconName: 'Hand',
  borderColor: 'border-l-4 border-l-orange-500',
  payloadType: null as unknown as Record<string, unknown>,
  carriesSurveyLinkId: false,
  hasLiveDispatcher: true,
})

const SCHEDULED = defineTrigger({
  id: 'scheduled' as const,
  labelKey: 'triggerScheduled',
  iconName: 'Clock',
  borderColor: 'border-l-4 border-l-orange-500',
  payloadType: null as unknown as Record<string, unknown>,
  carriesSurveyLinkId: false,
  hasLiveDispatcher: false,
})

// --- Registry + Derived Exports ---

export const TRIGGER_REGISTRY = [
  SURVEY_SUBMITTED,
  BOOKING_CREATED,
  LEAD_SCORED,
  MANUAL,
  SCHEDULED,
] as const

/** Derived union — auto-updates when new trigger added. */
export type TriggerType = (typeof TRIGGER_REGISTRY)[number]['id']

/** O(1) lookup map keyed by trigger id. */
export const TRIGGER_MAP = Object.fromEntries(
  TRIGGER_REGISTRY.map((t) => [t.id, t]),
) as Record<TriggerType, (typeof TRIGGER_REGISTRY)[number]>

/** Derived list of trigger ids — replaces hardcoded Sets in 4 files. */
export const TRIGGER_TYPE_IDS = TRIGGER_REGISTRY.map((t) => t.id) as readonly TriggerType[]

/** Derived set for O(1) membership checks. */
export const TRIGGER_TYPE_SET: ReadonlySet<TriggerType> = new Set(TRIGGER_TYPE_IDS)

/** Derived label-key map — consumer resolves to Polish via messages.workflows[labelKey]. */
export const TRIGGER_TYPE_LABEL_KEYS: Record<TriggerType, string> = Object.fromEntries(
  TRIGGER_REGISTRY.map((t) => [t.id, t.labelKey]),
) as Record<TriggerType, string>

/** Derived set of trigger ids that carry surveyLinkId — replaces SURVEY_TRIGGER_TYPES Set. */
export const TRIGGER_TYPES_WITH_SURVEY_LINK: ReadonlySet<TriggerType> = new Set(
  TRIGGER_REGISTRY.filter((t) => t.carriesSurveyLinkId).map((t) => t.id),
)
