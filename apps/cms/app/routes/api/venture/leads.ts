import { createFileRoute } from '@tanstack/react-router'
import { createServiceClient } from '@/lib/supabase/service'
import { getEspProvider, isEspProviderRegistered } from '@/features/venture/esp/index.server'
import type { EspProviderId } from '@/features/venture/esp/types'
import { verifyTallySignature } from '@/features/venture/tally-signature.server'
import { mapTallyPayload } from '@/features/venture/tally'
import { ingestLead, type IngestDeps } from '@/features/venture/ingest.server'
import { sendEmailViaResend } from '@/features/venture/mail/resend.server'

// ---------------------------------------------------------------------------
// POST /api/venture/leads — Tally lead-ingest webhook (spec §7, iter 3).
//
// server.handlers.POST strips this from the client bundle and lets us return a
// direct HTTP Response. Server-to-server webhook (Tally → CMS) — NO CORS.
//
// Status contract:
//   invalid/missing signature → 401 { error: 'invalid_signature' }
//   missing TALLY_WEBHOOK_SECRET env → 500 (misconfig, console.error)
//   unparseable body / missing campaign slug or email → 400 { error: 'bad_request' }
//   otherwise → ALWAYS 200 { ok: true } — even on unknown campaign, ESP failure
//     or mail failure. Anomalies are logged; 200 stops Tally from retry-storming.
//
// No secret / provider error body ever leaks into the response.
// ---------------------------------------------------------------------------

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Wire the real ingest dependencies. Kept here (not in the orchestrator) so the
// orchestrator stays pure/testable and this is the single composition root.
function buildIngestDeps(): IngestDeps {
  return {
    supabase: createServiceClient(),
    getProvider: getEspProvider,
    isProviderRegistered: (id: string): id is EspProviderId =>
      isEspProviderRegistered(id as EspProviderId),
    sendEmail: sendEmailViaResend,
  }
}

export const Route = createFileRoute('/api/venture/leads')({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify HMAC over the RAW body BEFORE parsing (do not re-serialize).
        const rawBody = await request.text()
        const signature = request.headers.get('Tally-Signature')
        const check = verifyTallySignature(
          rawBody,
          signature,
          process.env.TALLY_WEBHOOK_SECRET,
        )
        if (!check.valid) {
          if (check.reason === 'missing_secret') {
            console.error('[venture-ingest] TALLY_WEBHOOK_SECRET is not configured')
            return json({ error: 'internal_error' }, 500)
          }
          return json({ error: 'invalid_signature' }, 401)
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(rawBody)
        } catch {
          return json({ error: 'bad_request' }, 400)
        }

        const mapped = mapTallyPayload(parsed)
        if (mapped.isErr()) {
          console.warn('[venture-ingest] unmappable Tally payload:', mapped.error)
          return json({ error: 'bad_request' }, 400)
        }

        // Post-validation: never fail the request. Ingest never throws, but guard
        // the composition root (env access) so a misconfig can't 500 a valid lead.
        try {
          const outcome = await ingestLead(mapped.value, buildIngestDeps())
          if (outcome.status !== 'ingested' && outcome.status !== 'duplicate') {
            console.warn('[venture-ingest] lead not persisted:', outcome.status)
          }
        } catch (error) {
          console.error(
            '[venture-ingest] unexpected ingest error:',
            error instanceof Error ? error.message : String(error),
          )
        }

        return json({ ok: true }, 200)
      },
    },
  },
})
