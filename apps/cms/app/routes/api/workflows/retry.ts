import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuthContextFull, hasPermission } from '@/lib/server-auth'
import { dispatchToN8n } from '@/features/workflows/server'

// ---------------------------------------------------------------------------
// POST /api/workflows/retry
//
// Restarts a failed or cancelled workflow execution. Auth: user session cookie
// + workflows.execute permission. Validates tenant ownership, acquires an
// optimistic lock (PATCH WHERE status IN ('failed','cancelled')), then
// re-dispatches to n8n Orchestrator with __retry_execution_id__ in the payload.
//
// WHY explicit tenant check (defense-in-depth):
//   n8n Orchestrator validates tenant_id from the workflow row, not from the
//   caller. Rejecting cross-tenant attempts at the CMS layer is better UX
//   (immediate 404 vs waiting for n8n to error) and adds a second security
//   boundary.
//
// WHY optimistic lock (not status pre-check + separate update):
//   Two concurrent retry requests could both pass a status check and both
//   dispatch to n8n, starting duplicate executions. The single atomic
//   PATCH WHERE status IN ('failed','cancelled') is the canonical gate.
// ---------------------------------------------------------------------------

const retrySchema = z.object({
  execution_id: z.string().uuid(),
})

const forbidden = () => Response.json({ error: 'forbidden' }, { status: 403 })
const notFound = () =>
  Response.json({ error: 'execution_not_found_or_invalid_state' }, { status: 404 })
const conflict = () =>
  Response.json({ error: 'already_running_or_invalid_state' }, { status: 409 })

// ---------------------------------------------------------------------------
// Handler — exported for unit testing
// ---------------------------------------------------------------------------

export async function handleRetryPost(request: Request): Promise<Response> {
  // 1. Auth — user session cookie + workflows.execute permission
  const authResult = await requireAuthContextFull()

  if (authResult.isErr()) return forbidden()

  const auth = authResult._unsafeUnwrap()
  if (!hasPermission('workflows.execute', auth.permissions)) return forbidden()

  const { tenantId } = auth

  // 2. Parse + validate body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = retrySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_payload', details: parsed.error.issues }, { status: 400 })
  }
  const { execution_id: executionId } = parsed.data

  const supabaseService = createServiceClient()

  // 3. Load execution row — scoped to authenticated tenant.
  //    WHY .eq('tenant_id', tenantId): cross-tenant retry returns 404 (same as
  //    "not found") — never reveal existence of another tenant's execution.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: execution, error: fetchError } = await (supabaseService as any)
    .from('workflow_executions')
    .select('id, workflow_id, tenant_id, trigger_payload, status')
    .eq('id', executionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError || !execution) return notFound()

  // 4. Optimistic lock: atomically transition failed/cancelled → running.
  //    If 0 rows affected → execution is in a non-retriable state (already
  //    running, completed, or status has changed since we checked).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locked, error: lockError } = await (supabaseService as any)
    .from('workflow_executions')
    .update({ status: 'running', error_message: null, completed_at: null })
    .eq('id', executionId)
    .in('status', ['failed', 'cancelled'])
    .select('id')
    .maybeSingle()

  if (lockError || !locked) return conflict()

  // 5. Dispatch to n8n Orchestrator.
  //    Include original trigger_payload so n8n can re-execute with same context.
  //    __retry_execution_id__ signals the Orchestrator to replay this execution.
  const n8nUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL
  if (!n8nUrl) {
    // Reverse the optimistic lock — execution stays retryable.
    await reverseOptimisticLock(supabaseService, executionId, 'Orchestrator not configured')
    return Response.json({ error: 'orchestrator_not_configured' }, { status: 500 })
  }

  const retryPayload: Record<string, unknown> = {
    ...((execution.trigger_payload as Record<string, unknown>) || {}),
    __retry_execution_id__: executionId,
  }

  return dispatchToN8n(n8nUrl, execution.workflow_id, tenantId, retryPayload).match(
    ({ executionId: newExecId }) =>
      Response.json({ success: true, executionId: newExecId ?? executionId }, { status: 200 }),
    async (dispatchError) => {
      // Dispatch failed — reverse the optimistic lock so the execution is
      // still retriable by the user.
      await reverseOptimisticLock(supabaseService, executionId, `Dispatch failed: ${dispatchError}`)
      return Response.json({ success: false, error: dispatchError }, { status: 502 })
    },
  )
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function reverseOptimisticLock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseService: any,
  executionId: string,
  errorMessage: string,
): Promise<void> {
  try {
    await supabaseService
      .from('workflow_executions')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', executionId)
  } catch (e) {
    // Best-effort — if this fails, execution stays in 'running' and will need
    // manual recovery via the operational curl pattern documented in the skill.
    console.error('[retry] Failed to reverse optimistic lock:', e)
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/api/workflows/retry')({
  component: () => null,
  server: {
    handlers: {
      POST: ({ request }) => handleRetryPost(request),
    },
  },
})
