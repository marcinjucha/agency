import { NextResponse } from 'next/server'
import { ok, err, Result, ResultAsync } from 'neverthrow'
import { isTriggerType, type TriggerPayload } from '@/features/workflows/engine/types'
import { createServiceClient } from '@/lib/supabase/service'

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

type RouteError = { message: string; status: number }

type TriggerBody = {
  trigger_type: string
  tenant_id: string
  payload: Record<string, unknown>
  workflow_id?: string
}

type ValidatedBody = TriggerBody & { trigger_type: string }

type DispatchContext = {
  body: ValidatedBody
  triggerPayload: TriggerPayload
  orchestratorUrl: string
}

// --- Pipeline steps ---

function validateAuth(request: Request): Result<Request, RouteError> {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[workflow-trigger] WORKFLOW_TRIGGER_SECRET not configured')
    return err({ message: 'Server misconfigured', status: 500 })
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return err({ message: 'Unauthorized', status: 401 })
  }

  return ok(request)
}

function parseBody(request: Request): ResultAsync<TriggerBody, RouteError> {
  return ResultAsync.fromPromise(
    request.json() as Promise<TriggerBody>,
    () => ({ message: 'Invalid JSON body', status: 400 }),
  )
}

function validateBody(body: TriggerBody): Result<ValidatedBody, RouteError> {
  if (!body.trigger_type || !body.tenant_id || !body.payload) {
    return err({ message: 'Missing required fields: trigger_type, tenant_id, payload', status: 400 })
  }

  if (!isTriggerType(body.trigger_type)) {
    return err({ message: `Invalid trigger_type: "${body.trigger_type}"`, status: 400 })
  }

  return ok(body as ValidatedBody)
}

function ensureOrchestratorUrl(body: ValidatedBody): Result<DispatchContext, RouteError> {
  const orchestratorUrl = process.env.N8N_WORKFLOW_ORCHESTRATOR_URL

  if (!orchestratorUrl) {
    console.error('[workflow-trigger] N8N_WORKFLOW_ORCHESTRATOR_URL not configured')
    return err({ message: 'Server misconfigured', status: 500 })
  }

  const triggerPayload = {
    trigger_type: body.trigger_type,
    ...body.payload,
  } as TriggerPayload

  return ok({ body, triggerPayload, orchestratorUrl })
}

function resolveWorkflows(ctx: DispatchContext): ResultAsync<{ ctx: DispatchContext; workflowIds: string[] }, RouteError> {
  const svc = createServiceClient()

  type SupabaseResponse<T> = { data: T | null; error: { message: string } | null }

  if (ctx.body.workflow_id) {
    return ResultAsync.fromPromise(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (svc as any)
        .from('workflows')
        .select('id, is_active')
        .eq('id', ctx.body.workflow_id)
        .eq('tenant_id', ctx.body.tenant_id)
        .maybeSingle() as Promise<SupabaseResponse<{ id: string; is_active: boolean }>>,
      () => ({ message: 'Failed to query workflow', status: 500 } as RouteError),
    ).andThen((res) => {
      if (res.error || !res.data) {
        return err({ message: 'Workflow not found', status: 404 } as RouteError)
      }
      if (!res.data.is_active) {
        return err({ message: 'Workflow is inactive', status: 422 } as RouteError)
      }
      return ok({ ctx, workflowIds: [res.data.id] })
    })
  }

  return ResultAsync.fromPromise(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svc as any)
      .from('workflows')
      .select('id')
      .eq('tenant_id', ctx.body.tenant_id)
      .eq('trigger_type', ctx.body.trigger_type)
      .eq('is_active', true) as Promise<SupabaseResponse<{ id: string }[]>>,
    () => ({ message: 'Failed to find matching workflows', status: 500 } as RouteError),
  ).andThen((res) => {
    if (res.error) {
      console.error('[workflow-trigger] Failed to query matching workflows:', res.error.message)
      return err({ message: 'Failed to find matching workflows', status: 500 } as RouteError)
    }
    return ok({ ctx, workflowIds: (res.data || []).map((wf) => wf.id) })
  })
}

function dispatchAll({ ctx, workflowIds }: { ctx: DispatchContext; workflowIds: string[] }): Result<void, RouteError> {
  for (const workflowId of workflowIds) {
    dispatchToOrchestrator(ctx.orchestratorUrl, workflowId, ctx.body.tenant_id, ctx.triggerPayload)
      .catch((dispatchErr) => {
        console.error(
          `[workflow-trigger] n8n dispatch failed for workflow ${workflowId}:`,
          dispatchErr instanceof Error ? dispatchErr.message : dispatchErr,
        )
      })
  }

  return ok(undefined)
}

// --- Fire-and-forget dispatch helper ---

async function dispatchToOrchestrator(
  orchestratorUrl: string,
  workflowId: string,
  tenantId: string,
  triggerPayload: TriggerPayload,
): Promise<void> {
  const resp = await fetch(orchestratorUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ORCHESTRATOR_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ workflowId, tenantId, triggerPayload }),
  })

  if (!resp.ok) {
    throw new Error(`n8n Orchestrator returned ${resp.status}: ${await resp.text()}`)
  }
}

// --- Route handler ---

export async function POST(request: Request) {
  const result = await validateAuth(request)
    .asyncAndThen(parseBody)
    .andThen(validateBody)
    .andThen(ensureOrchestratorUrl)
    .andThen(resolveWorkflows)
    .andThen(dispatchAll)

  return result.match(
    () => NextResponse.json({ triggered: true }, { status: 202 }),
    ({ message, status }) => NextResponse.json({ error: message }, { status }),
  )
}
