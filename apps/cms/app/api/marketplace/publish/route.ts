import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

/**
 * POST /api/marketplace/publish
 *
 * Callback endpoint for n8n after marketplace publish/update/remove operations.
 * Auth: Bearer token (WORKFLOW_TRIGGER_SECRET), same as workflow callback routes.
 *
 * Body: {
 *   listing_id: string,
 *   action: 'publish' | 'update' | 'remove',
 *   result: 'success' | 'error',
 *   external_listing_id?: string,  // on success publish/update
 *   external_url?: string,         // on success publish/update
 *   error_message?: string         // on result: 'error'
 * }
 *
 * Always returns 200 — n8n must not retry callback failures.
 */

const bodySchema = z.object({
  listing_id: z.string().uuid(),
  action: z.enum(['publish', 'update', 'remove']),
  result: z.enum(['success', 'error']),
  external_listing_id: z.string().optional(),
  external_url: z.string().optional(),
  error_message: z.string().optional(),
})

export async function POST(request: Request) {
  // --- Auth: validate service secret ---
  const authHeader = request.headers.get('authorization')
  const secret = process.env.WORKFLOW_TRIGGER_SECRET

  if (!secret) {
    console.error('[marketplace-publish-callback] WORKFLOW_TRIGGER_SECRET not configured')
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

  // --- Build update payload based on action + result ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let update: Record<string, any>

  if (body.result === 'error') {
    update = {
      status: 'error',
      last_sync_error: body.error_message ?? 'Unknown error from n8n',
      last_sync_status: 'error',
      last_synced_at: new Date().toISOString(),
    }
  } else if (body.action === 'remove') {
    update = {
      status: 'removed',
      last_sync_status: 'ok',
      last_sync_error: null,
      last_synced_at: new Date().toISOString(),
    }
  } else {
    // publish or update — success
    update = {
      status: 'active',
      last_sync_status: 'ok',
      last_sync_error: null,
      last_synced_at: new Date().toISOString(),
    }
    // Only set external fields when provided — don't overwrite existing values on update
    if (body.external_listing_id !== undefined) {
      update.external_listing_id = body.external_listing_id
    }
    if (body.external_url !== undefined) {
      update.external_url = body.external_url
    }
    // Set published_at on first publish
    if (body.action === 'publish') {
      update.published_at = new Date().toISOString()
    }
  }

  // --- Apply update via service role (no user session in n8n callbacks) ---
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('shop_marketplace_listings')
    .update(update)
    .eq('id', body.listing_id)

  if (updateError) {
    console.error(
      `[marketplace-publish-callback] Failed to update listing ${body.listing_id}:`,
      updateError.message
    )
    // Still return 200 — n8n should not retry. CMS already logged the failure.
    return NextResponse.json(
      { ok: false, error: 'DB update failed — logged server-side' },
      { status: 200 }
    )
  }

  console.info(
    `[marketplace-publish-callback] listing=${body.listing_id} action=${body.action} result=${body.result} status=${update.status}`
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}
