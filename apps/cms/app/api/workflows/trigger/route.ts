import { NextResponse } from 'next/server'
import { isTriggerType, type TriggerPayload } from '@/features/workflows/engine/types'

/**
 * POST /api/workflows/trigger
 *
 * Service-to-service endpoint for triggering workflow execution via n8n Orchestrator.
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), NOT user session.
 *
 * Body: {
 *   trigger_type: string,
 *   tenant_id: string,
 *   payload: Record<string, unknown>,
 *   workflow_id?: string  // optional -- if provided, triggers only this workflow
 * }
 *
 * Response: 202 Accepted (fire-and-forget -- execution runs in n8n)
 */
export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[workflow-trigger] WORKFLOW_TRIGGER_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
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

  // --- n8n Orchestrator dispatch (required) ---
  const n8nOrchestratorUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL

  if (!n8nOrchestratorUrl) {
    console.error('[workflow-trigger] N8N_WORKFLOW_ORCHESTRATOR_URL not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const triggerPayload = {
    trigger_type: body.trigger_type,
    ...body.payload,
  } as TriggerPayload

  const { createServiceClient } = await import('@/lib/supabase/service')
  const svc = createServiceClient()

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
    // Validate workflow exists + active
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
    // Find matching active workflows (inlined from deleted trigger-matcher.ts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: matching, error: matchErr } = await (svc as any)
      .from('workflows')
      .select('id')
      .eq('tenant_id', body.tenant_id)
      .eq('trigger_type', body.trigger_type)
      .eq('is_active', true)

    if (matchErr) {
      console.error('[workflow-trigger] Failed to query matching workflows:', matchErr.message)
      return NextResponse.json({ error: 'Failed to find matching workflows' }, { status: 500 })
    }

    for (const wf of matching || []) {
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
