import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resumeExecution } from '@/features/workflows/engine/executor'

/**
 * POST /api/workflows/process-due-delays
 *
 * Batch-processes all delay steps whose resume_at has passed.
 * Called by the n8n "Workflow Delay Processor" cron workflow every 5 minutes.
 *
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), same as trigger/callback routes.
 *
 * Body: { limit?: number } — defaults to 100
 *
 * Flow:
 *   1. Validate auth
 *   2. Atomically claim due steps via UPDATE ... RETURNING (idempotency — prevents double-processing)
 *   3. For each claimed step:
 *      a. Mark step as 'completed' (delay fulfilled)
 *      b. Set execution status to 'running' (from 'paused')
 *      c. Fire-and-forget resumeExecution
 *   4. Return { processed: N, step_ids: [...] }
 *
 * Idempotency: The claim UPDATE uses WHERE status='waiting' AND resume_at <= now().
 * Concurrent calls will each claim a disjoint set — no step is processed twice.
 */
export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[process-due-delays] WORKFLOW_TRIGGER_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse optional body ---
  let limit = 100

  try {
    const body = await request.json().catch(() => ({}))
    if (body?.limit && typeof body.limit === 'number' && body.limit > 0) {
      limit = Math.min(body.limit, 500) // cap at 500 to avoid runaway batch
    }
  } catch {
    // body is optional — ignore parse errors
  }

  const serviceClient = createServiceClient()

  // --- Atomically claim due steps via RPC ---
  // claim_due_delay_steps() runs UPDATE ... RETURNING inside a single transaction.
  // Concurrent callers claim disjoint sets — no step is processed twice.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimedSteps, error: claimError } = await (serviceClient as any)
    .rpc('claim_due_delay_steps', { p_limit: limit })

  if (claimError) {
    console.error('[process-due-delays] Failed to claim due steps:', claimError.message)
    return NextResponse.json(
      { error: 'Failed to query due steps' },
      { status: 500 }
    )
  }

  if (!claimedSteps || claimedSteps.length === 0) {
    return NextResponse.json({ processed: 0, step_ids: [] }, { status: 200 })
  }

  const processedIds: string[] = []

  for (const step of claimedSteps) {
    const stepId = step.id as string
    const executionId = step.execution_id as string

    // --- Mark step as 'completed' (delay fulfilled) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: stepUpdateError } = await (serviceClient as any)
      .from('workflow_step_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_payload: { delay_completed: true },
      })
      .eq('id', stepId)

    if (stepUpdateError) {
      console.error(
        `[process-due-delays] Failed to complete step ${stepId}:`,
        stepUpdateError.message
      )
      continue // skip resume for this step, don't block others
    }

    // --- Set execution status to 'running' (from 'paused') ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: execUpdateError } = await (serviceClient as any)
      .from('workflow_executions')
      .update({ status: 'running' })
      .eq('id', executionId)
      .eq('status', 'paused')

    if (execUpdateError) {
      console.error(
        `[process-due-delays] Failed to set execution ${executionId} to running:`,
        execUpdateError.message
      )
      // Non-fatal: resumeExecution's optimistic lock will handle concurrency
    }

    // --- Resume execution (sequential to prevent race for same execution) ---
    // Sequential await prevents concurrent resumeExecution calls from racing
    // when two delay steps of the same execution mature simultaneously.
    try {
      await resumeExecution(executionId, stepId, 'completed')
    } catch (err) {
      console.error(
        `[process-due-delays] Resume failed for execution=${executionId} step=${stepId}:`,
        err instanceof Error ? err.message : err
      )
    }

    processedIds.push(stepId)
  }

  return NextResponse.json(
    { processed: processedIds.length, step_ids: processedIds },
    { status: 200 }
  )
}
