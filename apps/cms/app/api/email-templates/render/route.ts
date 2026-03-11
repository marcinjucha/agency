import { NextResponse } from 'next/server'
import { renderEmailBlocks } from '@agency/email'
import type { Block } from '@agency/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const blocks: Block[] = body.blocks

    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'blocks must be an array' }, { status: 400 })
    }

    const html = await renderEmailBlocks(blocks)
    return NextResponse.json({ html })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
