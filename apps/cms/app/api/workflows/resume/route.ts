import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resumeExecution } from '@/features/workflows/engine/executor'

/**
 * POST /api/workflows/resume
 *
 * Resumes a paused execution after a delay step's resume_at has been reached.
 * Accepts a single step_execution_id — intended as a low-volume manual/fallback path.
 *
 * NOTE: The primary delay processing path is POST /api/workflows/process-due-delays,
 * called by the n8n "Workflow Delay Processor" cron every 5 minutes. That endpoint
 * uses the claim_due_delay_steps() RPC for atomic batch claiming.
 * This route handles single-step resumption (e.g. manual admin trigger, testing).
 *
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), same as trigger/callback routes.
 *
 * Body: { step_execution_id: string }
 *
 * Flow:
 *   1. Validate auth + body
 *   2. Fetch step execution — must exist and be in 'waiting' status
 *   3. Idempotency: if status != 'waiting', return 200 (already processed)
 *   4. Mark step as 'completed' (delay fulfilled)
 *   5. Set execution status to 'running' (from 'paused')
 *   6. Fire-and-forget resumeExecution to continue remaining steps
 */
export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[workflow-resume] WORKFLOW_TRIGGER_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse body ---
  let body: { step_execution_id: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.step_execution_id || typeof body.step_execution_id !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: step_execution_id' },
      { status: 400 }
    )
  }

  const serviceClient = createServiceClient()

  // --- Fetch step execution ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stepExec, error: fetchError } = await (serviceClient as any)
    .from('workflow_step_executions')
    .select('id, execution_id, step_id, status')
    .eq('id', body.step_execution_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[workflow-resume] Failed to fetch step execution:', fetchError.message)
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

  // --- Idempotency: if step is no longer 'waiting', it was already processed ---
  if (stepExec.status !== 'waiting') {
    return NextResponse.json(
      { ok: true, message: `Step already processed (status: ${stepExec.status})` },
      { status: 200 }
    )
  }

  // --- Mark step as 'completed' (delay fulfilled) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: stepUpdateError } = await (serviceClient as any)
    .from('workflow_step_executions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output_payload: { delay_completed: true },
    })
    .eq('id', body.step_execution_id)

  if (stepUpdateError) {
    console.error('[workflow-resume] Failed to update step execution:', stepUpdateError.message)
    return NextResponse.json(
      { error: 'Failed to update step execution' },
      { status: 500 }
    )
  }

  // --- Set execution status to 'running' (from 'paused') ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: execUpdateError } = await (serviceClient as any)
    .from('workflow_executions')
    .update({ status: 'running' })
    .eq('id', stepExec.execution_id)
    .eq('status', 'paused')

  if (execUpdateError) {
    console.error('[workflow-resume] Failed to update execution status:', execUpdateError.message)
    // Non-fatal: resumeExecution's optimistic lock will handle concurrency
  }

  // --- Resume execution in background ---
  const executionId = stepExec.execution_id as string

  resumeExecution(executionId, body.step_execution_id, 'completed').catch(
    (err) => {
      console.error(
        `[workflow-resume] Resume failed for execution=${executionId}:`,
        err instanceof Error ? err.message : err
      )
    }
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}
