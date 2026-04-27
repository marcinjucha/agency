import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  dispatchToN8n,
  fetchWorkflowForPublicTrigger,
} from '@/features/workflows/server'
import { validateSurveyLinkIdInPayload } from '@/features/workflows/trigger-payload-validators'
import { createServiceClient } from '@/lib/supabase/service'

// ---------------------------------------------------------------------------
// POST /api/workflows/trigger
//
// Server-to-server entry point used by the website (survey submit, booking)
// to fire workflows. Authenticates with a shared Bearer secret — NOT a user
// session. Validates payload, derives tenant_id from the workflow row
// (caller-supplied tenant_id is NOT trusted), applies defense-in-depth
// surveyLinkId check, then dispatches to the n8n Orchestrator.
// ---------------------------------------------------------------------------

const triggerEndpointSchema = z.object({
  trigger_type: z.enum([
    'survey_submitted',
    'booking_created',
    'lead_scored',
    'manual',
    'scheduled',
  ]),
  // Informational only — NEVER used for authorization. Authoritative tenant
  // is derived from the workflow row via fetchWorkflowForPublicTrigger.
  tenant_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid(),
  payload: z.record(z.unknown()).default({}),
})

const unauthorized = () =>
  Response.json({ error: 'unauthorized' }, { status: 401 })

const badRequest = (error: string, details?: unknown) =>
  Response.json({ error, ...(details ? { details } : {}) }, { status: 400 })

const notFound = () =>
  Response.json({ error: 'workflow_not_found_or_invalid' }, { status: 404 })

export const Route = createFileRoute('/api/workflows/trigger')({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth — Bearer ${WORKFLOW_TRIGGER_SECRET}
        const expected = process.env.WORKFLOW_TRIGGER_SECRET
        if (!expected) {
          console.error(
            '[workflow-trigger] WORKFLOW_TRIGGER_SECRET not configured',
          )
          return unauthorized()
        }
        const authHeader = request.headers.get('authorization') ?? ''
        const presented = authHeader.replace(/^Bearer\s+/i, '')
        if (presented !== expected) return unauthorized()

        // 2. Parse + validate body
        let rawBody: unknown
        try {
          rawBody = await request.json()
        } catch {
          return badRequest('invalid_json')
        }

        const parsed = triggerEndpointSchema.safeParse(rawBody)
        if (!parsed.success) {
          return badRequest('invalid_payload', parsed.error.issues)
        }
        const { trigger_type, workflow_id, payload } = parsed.data

        const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
        if (!n8nUrl) {
          console.error(
            '[workflow-trigger] N8N_WORKFLOW_ORCHESTRATOR_URL not configured',
          )
          return Response.json(
            { error: 'orchestrator_not_configured' },
            { status: 500 },
          )
        }

        const supabase = createServiceClient()

        // 3. Derive authoritative tenant_id from workflow row.
        // Caller-supplied tenant_id is IGNORED — we look up the workflow
        // and use its tenant. Single source of truth: workflow ownership,
        // not whatever the caller claims.
        const workflowCheck = await fetchWorkflowForPublicTrigger(
          supabase,
          workflow_id,
          trigger_type,
        )
        if (workflowCheck.isErr()) {
          // Single error code for all failure modes (not_found / not_active /
          // trigger_type_mismatch) — don't leak which one to the caller.
          return notFound()
        }
        const tenantId = workflowCheck.value.tenantId

        // 4. Defense-in-depth — surveyLinkId must be an id, not a token,
        // and must belong to the authoritative tenant.
        const linkCheck = await validateSurveyLinkIdInPayload(
          supabase,
          trigger_type,
          payload,
          tenantId,
        )
        if (linkCheck.isErr()) {
          return badRequest('invalid_survey_link_id', linkCheck.error)
        }

        // 5. Dispatch to n8n Orchestrator using DERIVED tenantId
        const dispatch = await dispatchToN8n(n8nUrl, workflow_id, tenantId, {
          trigger_type,
          ...payload,
        })

        return dispatch.match(
          ({ executionId }) =>
            Response.json({ success: true, executionId }, { status: 200 }),
          (error) =>
            Response.json(
              { success: false, error },
              { status: 502 },
            ),
        )
      },
    },
  },
})
