import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resumeExecution } from '@/features/workflows/engine/executor'

/**
 * POST /api/workflows/callback
 *
 * Callback endpoint for async step completion (e.g. n8n reports back).
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), same as trigger route.
 *
 * Body: {
 *   step_execution_id: string,
 *   status: 'completed' | 'failed',
 *   output_payload?: Record<string, unknown>,
 *   error?: string
 * }
 *
 * After updating the step, resumes execution of remaining steps.
 */
export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[workflow-callback] WORKFLOW_TRIGGER_SECRET not configured')
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
    step_execution_id: string
    status: 'completed' | 'failed'
    output_payload?: Record<string, unknown>
    error?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.step_execution_id || !body.status) {
    return NextResponse.json(
      { error: 'Missing required fields: step_execution_id, status' },
      { status: 400 }
    )
  }

  if (body.status !== 'completed' && body.status !== 'failed') {
    return NextResponse.json(
      { error: 'status must be "completed" or "failed"' },
      { status: 400 }
    )
  }

  const serviceClient = createServiceClient()

  // --- Fetch the step execution to verify it exists ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stepExec, error: fetchError } = await (serviceClient as any)
    .from('workflow_step_executions')
    .select('id, execution_id, step_id, status')
    .eq('id', body.step_execution_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[workflow-callback] Failed to fetch step execution:', fetchError.message)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }

  if (!stepExec) {
    return NextResponse.json(
      { error: 'Step execution not found' },
      { status: 404 }
    )
  }

  // --- Idempotency: if step is no longer 'running', it was already processed ---
  if (stepExec.status !== 'running') {
    return NextResponse.json(
      { ok: true, message: `Step already processed (status: ${stepExec.status})` },
      { status: 200 }
    )
  }

  // --- Update the step execution record ---
  const update: Record<string, unknown> = {
    status: body.status,
    completed_at: new Date().toISOString(),
  }

  if (body.output_payload) {
    update.output_payload = body.output_payload
  }

  if (body.error) {
    update.error_message = body.error
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (serviceClient as any)
    .from('workflow_step_executions')
    .update(update)
    .eq('id', body.step_execution_id)

  if (updateError) {
    console.error('[workflow-callback] Failed to update step execution:', updateError.message)
    return NextResponse.json(
      { error: 'Failed to update step execution' },
      { status: 500 }
    )
  }

  // --- Resume execution in background ---
  const executionId = stepExec.execution_id as string

  resumeExecution(executionId, body.step_execution_id, body.status).catch(
    (err) => {
      console.error(
        `[workflow-callback] Resume failed for execution=${executionId}:`,
        err instanceof Error ? err.message : err
      )
    }
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}
