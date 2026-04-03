import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * POST /api/marketplace/import
 *
 * Callback endpoint for n8n after marketplace import operations.
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), same as other callback routes.
 *
 * Body: {
 *   import_id: string,
 *   event: 'progress' | 'completed' | 'error',
 *   imported_items?: number,
 *   skipped_items?: number,
 *   error_log?: unknown
 * }
 *
 * Always returns 200 — n8n must not retry callback failures.
 */

const bodySchema = z.object({
  import_id: z.string().uuid(),
  event: z.enum(['progress', 'completed', 'error']),
  imported_items: z.number().int().nonnegative().optional(),
  skipped_items: z.number().int().nonnegative().optional(),
  error_log: z.unknown().optional(),
})

export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[marketplace-import-callback] WORKFLOW_TRIGGER_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse and validate body ---
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const body = parsed.data

  // --- Build update payload based on event ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let update: Record<string, any>

  if (body.event === 'progress') {
    update = {
      status: 'running',
      ...(body.imported_items !== undefined ? { imported_items: body.imported_items } : {}),
      ...(body.skipped_items !== undefined ? { skipped_items: body.skipped_items } : {}),
    }
  } else if (body.event === 'completed') {
    update = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...(body.imported_items !== undefined ? { imported_items: body.imported_items } : {}),
      ...(body.skipped_items !== undefined ? { skipped_items: body.skipped_items } : {}),
    }
  } else {
    // event === 'error'
    update = {
      status: 'failed',
      completed_at: new Date().toISOString(),
      ...(body.error_log !== undefined ? { error_log: body.error_log } : {}),
      ...(body.imported_items !== undefined ? { imported_items: body.imported_items } : {}),
      ...(body.skipped_items !== undefined ? { skipped_items: body.skipped_items } : {}),
    }
  }

  // --- Apply update via service role (no user session in n8n callbacks) ---
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('shop_marketplace_imports')
    .update(update)
    .eq('id', body.import_id)

  if (updateError) {
    console.error(
      `[marketplace-import-callback] Failed to update import ${body.import_id}:`,
      updateError.message
    )
    // Still return 200 — n8n should not retry. CMS already logged the failure.
    return NextResponse.json(
      { ok: false, error: 'DB update failed — logged server-side' },
      { status: 200 }
    )
  }

  console.info(
    `[marketplace-import-callback] import=${body.import_id} event=${body.event} imported=${body.imported_items ?? '-'} skipped=${body.skipped_items ?? '-'}`
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}
