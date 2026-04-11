import { NextResponse } from 'next/server'
import { isTriggerType, type TriggerPayload } from '@/features/workflows/engine/types'
import { processWorkflowTrigger, executeWorkflow } from '@/features/workflows/engine/executor'

/**
 * POST /api/workflows/trigger
 *
 * Service-to-service endpoint for triggering workflow execution.
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), NOT user session.
 *
 * Body: {
 *   trigger_type: string,
 *   tenant_id: string,
 *   payload: Record<string, unknown>,
 *   workflow_id?: string  // optional — if provided, triggers only this workflow
 * }
 *
 * When workflow_id is provided: triggers that specific workflow (ignores trigger_type matching).
 * When workflow_id is omitted: triggers ALL active workflows matching trigger_type + tenant_id.
 *
 * Response: 202 Accepted (fire-and-forget — execution runs in background)
 */
export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[workflow-trigger] WORKFLOW_TRIGGER_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse and validate body ---
  let body: {
    trigger_type: string
    tenant_id: string
    payload: Record<string, unknown>
    workflow_id?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.trigger_type || !body.tenant_id || !body.payload) {
    return NextResponse.json(
      { error: 'Missing required fields: trigger_type, tenant_id, payload' },
      { status: 400 }
    )
  }

  if (!isTriggerType(body.trigger_type)) {
    return NextResponse.json(
      { error: `Invalid trigger_type: "${body.trigger_type}"` },
      { status: 400 }
    )
  }

  // --- Fire-and-forget: start execution without awaiting ---
  const triggerPayload = {
    trigger_type: body.trigger_type,
    ...body.payload,
  } as TriggerPayload

  // --- Feature flag: n8n Orchestrator dispatch ---
  const useN8nOrchestrator = process.env.USE_N8N_ORCHESTRATOR === 'true'
  const n8nOrchestratorUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL

  if (useN8nOrchestrator) {
    if (!n8nOrchestratorUrl) {
      console.error('[workflow-trigger] N8N_WORKFLOW_ORCHESTRATOR_URL not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    async function dispatchToOrchestrator(
      workflowId: string,
      tenantId: string,
      payload: TriggerPayload
    ) {
      const resp = await fetch(n8nOrchestratorUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, tenantId, triggerPayload: payload }),
      })
      if (!resp.ok) {
        throw new Error(`n8n Orchestrator returned ${resp.status}: ${await resp.text()}`)
      }
      return resp.json()
    }

    if (body.workflow_id) {
      // Validate workflow exists + active (same as CMS-local path)
      const { createServiceClient } = await import('@/lib/supabase/service')
      const svc = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: wf, error: wfErr } = await (svc as any)
        .from('workflows')
        .select('id, is_active')
        .eq('id', body.workflow_id)
        .maybeSingle()

      if (wfErr || !wf) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }
      if (!wf.is_active) {
        return NextResponse.json({ error: 'Workflow is inactive' }, { status: 422 })
      }

      dispatchToOrchestrator(body.workflow_id, body.tenant_id, triggerPayload).catch((err) => {
        console.error(
          `[workflow-trigger] n8n dispatch failed for workflow_id="${body.workflow_id}":`,
          err instanceof Error ? err.message : err
        )
      })
    } else {
      // Find matching workflows, dispatch each to n8n
      const { findMatchingWorkflows } = await import('@/features/workflows/engine/trigger-matcher')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const svc = createServiceClient()
      const matching = await findMatchingWorkflows(body.trigger_type, body.tenant_id, svc)

      for (const wf of matching) {
        dispatchToOrchestrator(wf.id, body.tenant_id, triggerPayload).catch((err) => {
          console.error(
            `[workflow-trigger] n8n dispatch failed for workflow ${wf.id}:`,
            err instanceof Error ? err.message : err
          )
        })
      }
    }

    return NextResponse.json({ triggered: true }, { status: 202 })
  }

  // --- Existing CMS-local execution path (USE_N8N_ORCHESTRATOR off or missing) ---

  if (body.workflow_id) {
    // Trigger specific workflow by ID — validate existence + active status before fire-and-forget
    const { createServiceClient } = await import('@/lib/supabase/service')
    const svc = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wf, error: wfErr } = await (svc as any)
      .from('workflows')
      .select('id, is_active')
      .eq('id', body.workflow_id)
      .maybeSingle()

    if (wfErr || !wf) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    if (!wf.is_active) {
      return NextResponse.json({ error: 'Workflow is inactive' }, { status: 422 })
    }

    executeWorkflow(body.workflow_id, triggerPayload).catch((err) => {
      console.error(
        `[workflow-trigger] Execution failed for workflow_id="${body.workflow_id}":`,
        err instanceof Error ? err.message : err
      )
    })
  } else {
    // Trigger all matching workflows
    processWorkflowTrigger(body.trigger_type, body.tenant_id, triggerPayload).catch(
      (err) => {
        console.error(
          `[workflow-trigger] Background execution failed for trigger_type="${body.trigger_type}", tenant="${body.tenant_id}":`,
          err instanceof Error ? err.message : err
        )
      }
    )
  }

  return NextResponse.json({ triggered: true }, { status: 202 })
}
